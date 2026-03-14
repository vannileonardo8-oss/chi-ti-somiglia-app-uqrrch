
import React from 'react';
import { Tabs } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';

const TABS = [
  {
    name: '(home)',
    title: 'Confronta',
    label: 'Confronta',
    icon: 'compare' as const,
    ios_icon_name: 'photo.on.rectangle.angled',
    android_material_icon_name: 'compare' as const,
    route: '/(tabs)/(home)' as any,
  },
  {
    name: 'history',
    title: 'Cronologia',
    label: 'Cronologia',
    icon: 'history' as const,
    ios_icon_name: 'clock.fill',
    android_material_icon_name: 'history' as const,
    route: '/(tabs)/history' as any,
  },
  {
    name: 'profile',
    title: 'Profilo',
    label: 'Profilo',
    icon: 'person' as const,
    ios_icon_name: 'person.fill',
    android_material_icon_name: 'person' as const,
    route: '/(tabs)/profile' as any,
  },
];

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} tabs={TABS} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="(home)" options={{ headerShown: false }} />
      <Tabs.Screen name="history" options={{ headerShown: false }} />
      <Tabs.Screen name="profile" options={{ headerShown: false }} />
    </Tabs>
  );
}
