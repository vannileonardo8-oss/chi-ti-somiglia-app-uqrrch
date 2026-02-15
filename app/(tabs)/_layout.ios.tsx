
import React from 'react';
import { Tabs } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { useColorScheme } from 'react-native';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const tabs = [
    {
      name: '(home)',
      title: 'Confronta',
      ios_icon_name: 'photo.on.rectangle.angled',
      android_material_icon_name: 'compare' as const,
      route: '/(tabs)/(home)' as any,
    },
    {
      name: 'history',
      title: 'Cronologia',
      ios_icon_name: 'clock.fill',
      android_material_icon_name: 'history' as const,
      route: '/(tabs)/history' as any,
    },
  ];

  return (
    <>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} tabs={tabs} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="(home)" options={{ headerShown: false }} />
        <Tabs.Screen name="history" options={{ headerShown: false }} />
      </Tabs>
    </>
  );
}
