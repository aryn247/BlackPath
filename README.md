# BLACKPATH — Serverless Walking/Running App

[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-black.svg)](https://expo.dev)
[![Expo](https://img.shields.io/badge/Expo-SDK%2057-000000.svg)](https://docs.expo.dev)
[![License](https://img.shields.io/badge/License-MIT-white.svg)](LICENSE)
[![Download APK](https://img.shields.io/badge/Download-Android%20APK-brightgreen.svg)](https://aryn247.github.io/Self-Portfolio/BlackPath.apk)

**BlackPath** is a privacy-first, serverless walking/running application for Android and iOS built with Expo, React Native, TypeScript, SQLite, and Bluetooth Low Energy (BLE).

The entire UI is pure black (`#000000`) with abstract glowing path rendering, real-time closed-loop detection, Shoelace enclosed area calculation ($m^2$), local SQLite persistence, and offline peer-to-peer walk sharing.

---

## 📱 Direct Download

📥 **[Download BlackPath Android APK (Direct Download)](https://aryn247.github.io/Self-Portfolio/BlackPath.apk)**

---

## 🖤 Core Idea & UX Identity

- **Pure Black Interface**: `#000000` background everywhere. No maps, streets, buildings, coordinates, location names, or map tiles are ever displayed.
- **Abstract Glowing Path**: Converts real GPS coordinates into a smooth glowing line with rounded caps and a pulsing glowing endpoint marker.
- **Dual Glowing Paths**: Displays a bright white path (`#FFFFFF`) for your walk, and a subtle glowing violet path (`#A855F7`) for nearby peers when walking together.
- **100% Serverless & Local-First**: Operates completely offline with Wi-Fi and mobile data turned off. Uses local SQLite for all session history, statistics, and settings. No accounts or cloud servers required.

---

## ⚙️ Tech Stack

- **Framework**: Expo (SDK 57) + React Native + TypeScript
- **Navigation**: Expo Router (File-based navigation)
- **Location Tracking**: `expo-location` + `expo-task-manager` (High-accuracy foreground & background tracking)
- **Path Renderer**: Dynamic abstract SVG glowing path vector engine
- **Local Storage**: SQLite (`expo-sqlite`)
- **Peer Discovery**: Serverless Bluetooth Low Energy (`react-native-ble-plx`)
- **Local Notifications**: `expo-notifications`
- **Build Configuration**: EAS Build preview profile (`com.blackpath.app`)

---

## 🚀 Key Features

1. **Real GPS Tracking & Smoothing**: Filters GPS noise, teleportation spikes, and stationary jitter using moving average smoothing and Ramer-Douglas-Peucker simplification algorithms.
2. **Loop Detection & Enclosed Area Claiming**: Automatically detects closed loops when returning within ~25 meters of your starting position and calculates enclosed area in square meters ($m^2$) using Equirectangular metric projection and Gauss's Shoelace formula.
3. **BLE Nearby System (No Cloud)**:
   - Broadcasts temporary anonymous 8-character hex IDs (`BP_XXXXXXXX`).
   - Discovers nearby BlackPath walkers offline via BLE custom Service UUID (`0000FE99-0000-1000-8000-00805F9B34FB`).
   - Peer invitation handshake (`JOIN` prompt, `ACCEPT`/`DECLINE` modal, `LEAVE WALK` state machine).
   - Cooldown timer manager for `NOT NOW` responses.
4. **History & Statistics**: Detailed session history with miniature abstract path previews, date, distance, duration, average pace, and claimed area, alongside aggregated statistics filtered by Today, Week, Month, and All Time.
5. **Privacy Controls**: Discoverability toggles, notification preferences, unit selection (`km`/`mi`), permission status monitors, and local data reset actions.

---

## 🛠️ Local Development & Setup

### Prerequisites
- Node.js (>= 18.x)
- npm or yarn
- Expo Go app on physical phone (or Android Studio Emulator / iOS Simulator)

### Installation
```bash
# Clone repository
git clone https://github.com/aryn247/Walk.git
cd Walk

# Install dependencies
npm install

# Start Expo Metro Bundler
npx expo start
```

### Running on Android / iOS
```bash
# Android (Emulator or physical device)
npm run android

# iOS Simulator (macOS required)
npm run ios
```

---

## 📄 License

MIT License — free for educational and non-commercial use.
