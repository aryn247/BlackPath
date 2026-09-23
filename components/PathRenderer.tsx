import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { GPSPoint } from '../types';
import { Colors } from '../constants/theme';
import { downsamplePath, pointsToBezierPath } from '../geo/smoothing';

interface PathRendererProps {
  userPoints: GPSPoint[];
  peerPoints?: GPSPoint[];
  width?: number;
  height?: number;
  showGlow?: boolean;
  showEndpoint?: boolean;
  padding?: number;
}

export const PathRenderer: React.FC<PathRendererProps> = ({
  userPoints = [],
  peerPoints = [],
  width: customWidth,
  height: customHeight,
  showGlow = true,
  showEndpoint = true,
  padding = 40,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const width = customWidth || windowWidth;
  const height = customHeight || windowHeight * 0.55;

  // Normalize GPS coordinates to Canvas pixel coordinates (x, y)
  const { userPathData, userEndpoint, peerPathData, peerEndpoint } = useMemo(() => {
    if (!userPoints || userPoints.length === 0) {
      return { userPathData: '', userEndpoint: null, peerPathData: '', peerEndpoint: null };
    }

    // Downsample points to max 250 for 60FPS fluid rendering
    const sampledUser = downsamplePath(userPoints, 250);
    const sampledPeer = downsamplePath(peerPoints || [], 150);
    const allPoints = [...sampledUser, ...sampledPeer];

    if (allPoints.length === 1) {
      const cx = width / 2;
      const cy = height / 2;
      return {
        userPathData: `M ${cx} ${cy} L ${cx} ${cy}`,
        userEndpoint: { x: cx, y: cy },
        peerPathData: '',
        peerEndpoint: null,
      };
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;

    for (const pt of allPoints) {
      if (pt.latitude < minLat) minLat = pt.latitude;
      if (pt.latitude > maxLat) maxLat = pt.latitude;
      if (pt.longitude < minLon) minLon = pt.longitude;
      if (pt.longitude > maxLon) maxLon = pt.longitude;
    }

    // Handle single point span / zero bounding box
    const latSpan = maxLat - minLat || 0.0001;
    const lonSpan = maxLon - minLon || 0.0001;

    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;

    const scaleX = availableWidth / lonSpan;
    const scaleY = availableHeight / latSpan;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = padding + (availableWidth - lonSpan * scale) / 2;
    const offsetY = padding + (availableHeight - latSpan * scale) / 2;

    // Helper to map lat/lon -> Canvas (x, y)
    const mapPoint = (pt: GPSPoint) => {
      const x = offsetX + (pt.longitude - minLon) * scale;
      // Invert Y axis because GPS latitude increases upward, but screen Y increases downward
      const y = height - (offsetY + (pt.latitude - minLat) * scale);
      return { x, y };
    };

    // Build User SVG Smooth Bezier Path
    const userMapped = sampledUser.map(mapPoint);
    const uPath = pointsToBezierPath(userMapped);
    const uEnd = userMapped[userMapped.length - 1];

    // Build Peer SVG Path if available
    let pPath = '';
    let pEnd = null;
    if (sampledPeer && sampledPeer.length > 0) {
      const peerMapped = sampledPeer.map(mapPoint);
      pPath = pointsToBezierPath(peerMapped);
      pEnd = peerMapped[peerMapped.length - 1];
    }

    return {
      userPathData: uPath,
      userEndpoint: uEnd,
      peerPathData: pPath,
      peerEndpoint: pEnd,
    };
  }, [userPoints, peerPoints, width, height, padding]);

  if (!userPathData) {
    return (
      <View style={[styles.placeholder, { width, height }]}>
        <View style={styles.centerDot} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <G>
          {/* Peer Glowing Violet Path (if walking together) */}
          {peerPathData !== '' && (
            <>
              {/* Layer 1: Wide Outer Glow */}
              {showGlow && (
                <Path
                  d={peerPathData}
                  stroke={Colors.peerPathGlow}
                  strokeWidth={12}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={0.4}
                />
              )}
              {/* Layer 2: Mid Glow */}
              {showGlow && (
                <Path
                  d={peerPathData}
                  stroke={Colors.peerPathGlow}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={0.8}
                />
              )}
              {/* Layer 3: Bright Core Line */}
              <Path
                d={peerPathData}
                stroke={Colors.peerPath}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              {showEndpoint && peerEndpoint && (
                <G>
                  <Circle
                    cx={peerEndpoint.x}
                    cy={peerEndpoint.y}
                    r={8}
                    fill={Colors.peerEndpointGlow}
                  />
                  <Circle
                    cx={peerEndpoint.x}
                    cy={peerEndpoint.y}
                    r={4}
                    fill={Colors.peerEndpoint}
                  />
                </G>
              )}
            </>
          )}

          {/* User Glowing Cyan/White Path */}
          {/* Layer 1: Wide Outer Glow */}
          {showGlow && (
            <Path
              d={userPathData}
              stroke={Colors.userPathGlow}
              strokeWidth={14}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.4}
            />
          )}
          {/* Layer 2: Mid Glow */}
          {showGlow && (
            <Path
              d={userPathData}
              stroke={Colors.userPathGlow}
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.8}
            />
          )}
          {/* Layer 3: Core Neon Line */}
          <Path
            d={userPathData}
            stroke={Colors.userPath}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Glowing Animated Endpoint Circle */}
          {showEndpoint && userEndpoint && (
            <G>
              <Circle
                cx={userEndpoint.x}
                cy={userEndpoint.y}
                r={10}
                fill={Colors.userEndpointGlow}
              />
              <Circle
                cx={userEndpoint.x}
                cy={userEndpoint.y}
                r={4}
                fill={Colors.userEndpoint}
              />
            </G>
          )}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
});
