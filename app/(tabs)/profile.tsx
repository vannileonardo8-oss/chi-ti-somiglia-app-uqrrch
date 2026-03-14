
import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { useTheme } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    console.log('[Profile] User tapped sign out');
    setIsSigningOut(true);
    try {
      await signOut();
      console.log('[Profile] Sign out successful');
    } catch (error) {
      console.error('[Profile] Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || '?';
  const userName = user?.name || 'Utente';
  const userEmail = user?.email || '';
  const userId = user?.id ? user.id.substring(0, 8) : 'N/A';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={[styles.screenTitle, { color: theme.colors.text }]}>Profilo</Text>

        <View style={[styles.profileHeader, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>{userInitial}</Text>
          </View>
          <Text style={[styles.name, { color: theme.colors.text }]}>{userName}</Text>
          <Text style={[styles.email, { color: theme.dark ? '#98989D' : '#666' }]}>{userEmail}</Text>
        </View>

        <View style={[styles.section, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={20} color={theme.dark ? '#98989D' : '#666'} />
            <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>ID</Text>
            <Text style={[styles.infoText, { color: theme.colors.text }]}>{userId}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: '#FF3B30' }]}
          onPress={handleSignOut}
          disabled={isSigningOut}
          activeOpacity={0.8}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <IconSymbol ios_icon_name="arrow.right.square" android_material_icon_name="logout" size={20} color="#FFFFFF" />
              <Text style={styles.signOutText}>Esci</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 120 },
  screenTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 24 },
  profileHeader: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 32,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  name: { fontSize: 22, fontWeight: 'bold' },
  email: { fontSize: 15 },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontSize: 14, fontWeight: '500', width: 30 },
  infoText: { fontSize: 15, flex: 1 },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
    gap: 8,
  },
  signOutText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
