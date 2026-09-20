import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export const BottomNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const bottomPadding = Math.max(insets.bottom, 12);

  const tabs = [
    { key: 'walk', label: 'Walk', route: '/', icon: 'pulse-outline', activeIcon: 'pulse' },
    { key: 'history', label: 'History', route: '/history', icon: 'time-outline', activeIcon: 'time' },
    { key: 'stats', label: 'Stats', route: '/statistics', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
    { key: 'settings', label: 'Settings', route: '/settings', icon: 'settings-outline', activeIcon: 'settings' },
  ];

  const isActive = (tabRoute: string) => {
    if (tabRoute === '/') {
      return pathname === '/' || pathname === '/walk';
    }
    return pathname.startsWith(tabRoute);
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {tabs.map((tab) => {
        const active = isActive(tab.route);
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabButton}
            activeOpacity={0.7}
            onPress={() => {
              if (!active) {
                if (tab.route === '/') {
                  router.replace('/');
                } else {
                  router.push(tab.route as any);
                }
              }
            }}
          >
            <Ionicons
              name={(active ? tab.activeIcon : tab.icon) as any}
              size={22}
              color={active ? '#FFFFFF' : '#8E8E93'}
            />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#121214',
    paddingTop: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
