
import { StyleSheet } from 'react-native';

export const colors = {
  // Fun, vibrant color palette for a playful comparison app
  background: '#FFF5F8',
  backgroundDark: '#0F0F0F',
  text: '#1A1A1A',
  textDark: '#F5F5F5',
  textSecondary: '#666666',
  textSecondaryDark: '#A0A0A0',
  primary: '#FF6B9D', // Playful pink
  primaryDark: '#FF4081',
  secondary: '#4ECDC4', // Turquoise
  secondaryDark: '#26A69A',
  accent: '#FFD93D', // Bright yellow
  accentDark: '#FFC107',
  purple: '#9B59B6', // Fun purple
  purpleDark: '#8E44AD',
  orange: '#FF9F43', // Vibrant orange
  orangeDark: '#FF7F00',
  card: '#FFFFFF',
  cardDark: '#1E1E1E',
  highlight: '#FF8FAB',
  highlightDark: '#FF5C8D',
  border: '#FFE0E9',
  borderDark: '#333333',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});
