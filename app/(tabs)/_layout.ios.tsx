
import React from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { IconSymbol } from '@/components/IconSymbol';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Screen
        name="(home)"
        options={{
          title: 'Confronta',
          tabBarIcon: ({ color }) => (
            <IconSymbol ios_icon_name="photo.on.rectangle.angled" android_material_icon_name="compare" size={24} color={color} />
          ),
        }}
      />
      <NativeTabs.Screen
        name="history"
        options={{
          title: 'Cronologia',
          tabBarIcon: ({ color }) => (
            <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="history" size={24} color={color} />
          ),
        }}
      />
      <NativeTabs.Screen
        name="profile"
        options={{
          title: 'Profilo',
          tabBarIcon: ({ color }) => (
            <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color={color} />
          ),
        }}
      />
    </NativeTabs>
  );
}
