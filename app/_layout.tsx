import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { SettingsStore } from '../store/settingsStore';

export default function RootLayout() {
  useEffect(() => {
    SettingsStore.loadSettings();
  }, []);

  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
