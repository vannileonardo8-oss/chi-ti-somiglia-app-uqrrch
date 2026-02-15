
import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import React from 'react';
import { colors } from '@/styles/commonStyles';

export default function NotFoundScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const linkColor = isDark ? colors.primaryDark : colors.primary;

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <Text style={[styles.title, { color: textColor }]}>Questa pagina non esiste.</Text>
        <Link href="/(tabs)/(home)" style={styles.link}>
          <Text style={[styles.linkText, { color: linkColor }]}>Torna alla home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
