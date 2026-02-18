
import { StyleSheet } from 'react-native';

export const colors = {
  // Fun blue and yellow theme for a playful comparison app
  background: '#1E3A8A', // Deep blue
  backgroundDark: '#0F172A', // Darker blue
  text: '#FCD34D', // Bright yellow
  textDark: '#FDE68A', // Light yellow
  textSecondary: '#93C5FD', // Light blue
  textSecondaryDark: '#60A5FA', // Medium blue
  primary: '#3B82F6', // Vibrant blue
  primaryDark: '#2563EB', // Darker vibrant blue
  secondary: '#FCD34D', // Yellow
  secondaryDark: '#FBBF24', // Darker yellow
  accent: '#F59E0B', // Orange-yellow
  accentDark: '#D97706', // Darker orange
  purple: '#8B5CF6', // Fun purple
  purpleDark: '#7C3AED', // Darker purple
  orange: '#FB923C', // Vibrant orange
  orangeDark: '#F97316', // Darker orange
  card: '#1E40AF', // Blue card
  cardDark: '#1E3A8A', // Darker blue card
  highlight: '#60A5FA', // Light blue highlight
  highlightDark: '#3B82F6', // Blue highlight
  border: '#3B82F6', // Blue border
  borderDark: '#2563EB', // Darker blue border
  success: '#10B981', // Green
  error: '#EF4444', // Red
  warning: '#F59E0B', // Orange
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
