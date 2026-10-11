import React, { useEffect, Component } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/theme';
import { SettingsStore } from '../store/settingsStore';

// L1 Fix: Error Boundary catches render-time crashes and shows a recovery screen
// instead of a blank/frozen app screen with no way to recover.
interface ErrorBoundaryState {
  hasError: boolean;
  error: string;
}

class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('[BlackPath] Unhandled render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{this.state.error}</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => this.setState({ hasError: false, error: '' })}
          >
            <Text style={styles.errorButtonText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  useEffect(() => {
    // L2 Fix: Load settings once at app root level only.
    // useSettingsStore() in child screens subscribes without re-loading from DB.
    SettingsStore.loadSettings();
  }, []);

  return (
    <AppErrorBoundary>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="walk" options={{ gestureEnabled: false }} />
          <Stack.Screen name="history" />
          <Stack.Screen name="session/[id]" />
          <Stack.Screen name="statistics" />
          <Stack.Screen name="settings" />
        </Stack>
      </View>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF453A',
    marginBottom: 12,
    letterSpacing: 1,
  },
  errorMessage: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 18,
  },
  errorButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  errorButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
});
