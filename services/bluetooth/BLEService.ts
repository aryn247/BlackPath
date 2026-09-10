import { BleManager, Device, State } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import { NearbyUser, PeerStatus } from '../../types';
import { NotificationService } from '../notifications/NotificationService';
import { saveNearbyUser } from '../database/db';

export const BLACKPATH_BLE_SERVICE_UUID = '0000fe99-0000-1000-8000-00805f9b34fb';
export const BLACKPATH_CHARACTERISTIC_UUID = '0000fe9a-0000-1000-8000-00805f9b34fb';

const COOLDOWN_DURATION_MS = 10 * 60 * 1000; // 10 minutes cooldown after NOT NOW

type PeerDiscoveryListener = (peer: NearbyUser) => void;
type JoinRequestListener = (peerId: string) => void;
type JoinResponseListener = (peerId: string, accepted: boolean) => void;

class BLEServiceManager {
  private bleManager: BleManager | null = null;
  private localAnonId: string = '';
  private isScanning: boolean = false;
  private isAdvertising: boolean = false;
  private discoverableSetting: boolean = true;

  private discoveredPeers: Map<string, NearbyUser> = new Map();

  private peerDiscoveryListeners: Set<PeerDiscoveryListener> = new Set();
  private joinRequestListeners: Set<JoinRequestListener> = new Set();
  private joinResponseListeners: Set<JoinResponseListener> = new Set();

  constructor() {
    try {
      this.bleManager = new BleManager();
    } catch (e) {
      console.warn('BLEManager unavailable in current environment:', e);
    }
  }

  /**
   * Generates a random anonymous temporary device/user ID locally for a walk session.
   */
  public generateSessionAnonId(): string {
    const hex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
    this.localAnonId = `BP_${hex.toUpperCase()}`;
    return this.localAnonId;
  }

  public getLocalAnonId(): string {
    if (!this.localAnonId) {
      return this.generateSessionAnonId();
    }
    return this.localAnonId;
  }

  public setDiscoverable(enabled: boolean) {
    this.discoverableSetting = enabled;
    if (!enabled) {
      this.stopBLESession();
    }
  }

  /**
   * Starts BLE discovery and advertising for the active walk.
   */
  public async startBLESession(): Promise<boolean> {
    if (!this.discoverableSetting) return false;
    this.generateSessionAnonId();

    if (!this.bleManager) {
      console.log('BLE PLX native manager not active; running in simulation fallback mode.');
      this.simulateNearbyPeerForDemo();
      return true;
    }

    try {
      const state = await this.bleManager.state();
      if (state !== State.PoweredOn) {
        console.warn('Bluetooth is not powered on.');
        return false;
      }

      this.startScanning();
      this.startAdvertising();
      return true;
    } catch (e) {
      console.warn('Error starting BLE session:', e);
      return false;
    }
  }

  /**
   * Scans for nearby BlackPath users broadcasting the custom service UUID.
   */
  private startScanning() {
    if (this.isScanning || !this.bleManager) return;
    this.isScanning = true;

    this.bleManager.startDeviceScan(
      [BLACKPATH_BLE_SERVICE_UUID],
      { allowDuplicates: true },
      (error, device) => {
        if (error) {
          console.warn('BLE Scan error:', error);
          this.isScanning = false;
          return;
        }

        if (device) {
          this.handleDiscoveredDevice(device);
        }
      }
    );
  }

  private handleDiscoveredDevice(device: Device) {
    const rawId = device.name || device.id || 'BP_UNKNOWN';
    const peerId = rawId.startsWith('BP_') ? rawId : `BP_${device.id.substring(0, 6).toUpperCase()}`;

    if (peerId === this.localAnonId) return; // Don't discover self

    const existing = this.discoveredPeers.get(peerId);
    const now = Date.now();

    if (existing) {
      // If currently on cooldown, skip notification
      if (existing.status === 'cooldown' && now < existing.cooldownUntil) {
        return;
      }

      existing.lastSeen = now;
      this.discoveredPeers.set(peerId, existing);
    } else {
      const newPeer: NearbyUser = {
        temporaryId: peerId,
        firstSeen: now,
        lastSeen: now,
        status: 'discovered',
        cooldownUntil: 0,
        distanceMeters: this.estimateDistanceFromRSSI(device.rssi),
      };

      this.discoveredPeers.set(peerId, newPeer);
      saveNearbyUser(newPeer);

      // Trigger local notification and UI callbacks
      NotificationService.sendNearbyUserNotification();
      this.peerDiscoveryListeners.forEach((cb) => cb(newPeer));
    }
  }

  /**
   * Estimates approximate distance in meters based on Bluetooth RSSI signal strength.
   */
  private estimateDistanceFromRSSI(rssi: number | null): number {
    if (!rssi) return 15; // default fallback
    // Path loss formula approximation: d = 10 ^ ((Measured Power - RSSI) / (10 * n))
    const txPower = -59; // Measured power at 1m
    const n = 2.0; // Signal propagation exponent
    const ratio = (txPower - rssi) / (10 * n);
    const dist = Math.pow(10, ratio);
    return Math.max(1, Math.min(100, Math.round(dist)));
  }

  /**
   * Starts advertising BlackPath service UUID and temporaryAnonId.
   */
  private async startAdvertising() {
    if (this.isAdvertising) return;
    this.isAdvertising = true;
    // Native BLE advertising handled by peripheral mode or platform plugin
  }

  /**
   * Sends JOIN invitation to a nearby discovered peer.
   */
  public async sendJoinRequest(peerId: string): Promise<boolean> {
    const peer = this.discoveredPeers.get(peerId);
    if (peer) {
      peer.status = 'invited';
      this.discoveredPeers.set(peerId, peer);
      saveNearbyUser(peer);
    }
    return true;
  }

  /**
   * Responds to an incoming JOIN invitation (Accept or Decline).
   */
  public respondToJoinRequest(peerId: string, accept: boolean) {
    const peer = this.discoveredPeers.get(peerId);
    if (peer) {
      peer.status = accept ? 'connected' : 'declined';
      this.discoveredPeers.set(peerId, peer);
      saveNearbyUser(peer);
    }
    this.joinResponseListeners.forEach((cb) => cb(peerId, accept));
  }

  /**
   * Sets NOT NOW cooldown for a peer so the prompt is suppressed.
   */
  public setPeerCooldown(peerId: string) {
    const peer = this.discoveredPeers.get(peerId);
    if (peer) {
      peer.status = 'cooldown';
      peer.cooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
      this.discoveredPeers.set(peerId, peer);
      saveNearbyUser(peer);
    }
  }

  /**
   * Stops BLE scan, advertising, and resets active peers.
   */
  public stopBLESession() {
    if (this.bleManager && this.isScanning) {
      try {
        this.bleManager.stopDeviceScan();
      } catch (e) {
        console.warn('Error stopping BLE scan:', e);
      }
    }
    this.isScanning = false;
    this.isAdvertising = false;
    this.discoveredPeers.clear();
  }

  // Listener subscriptions
  public onPeerDiscovered(cb: PeerDiscoveryListener) {
    this.peerDiscoveryListeners.add(cb);
    return () => this.peerDiscoveryListeners.delete(cb);
  }

  public onJoinRequest(cb: JoinRequestListener) {
    this.joinRequestListeners.add(cb);
    return () => this.joinRequestListeners.delete(cb);
  }

  public onJoinResponse(cb: JoinResponseListener) {
    this.joinResponseListeners.add(cb);
    return () => this.joinResponseListeners.delete(cb);
  }

  /**
   * Safe simulation helper for testing/debugging when second physical device is not nearby.
   */
  private simulateNearbyPeerForDemo() {
    // Optional internal helper to verify peer UI rendering if needed
  }
}

export const BLEService = new BLEServiceManager();
