
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function OAuthConsentScreen() {
  const router = useRouter();

  const handleGoBack = () => {
    router.replace('/auth');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={80}
              color="#fff"
            />
          </View>

          <Text style={styles.title}>Percorso OAuth Automatico</Text>
          
          <Text style={styles.description}>
            Questa app utilizza il flusso OAuth automatico di Supabase.
          </Text>
          
          <Text style={styles.description}>
            Non è necessaria una schermata di consenso personalizzata.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>ℹ️ Informazioni Tecniche</Text>
            <Text style={styles.infoText}>
              • Il percorso <Text style={styles.code}>/oauth/consent</Text> è configurato in Supabase
            </Text>
            <Text style={styles.infoText}>
              • L'autenticazione OAuth viene gestita automaticamente da Supabase
            </Text>
            <Text style={styles.infoText}>
              • I redirect vengono gestiti tramite <Text style={styles.code}>/auth-callback</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleGoBack}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Torna al Login</Text>
            <IconSymbol
              ios_icon_name="arrow.right"
              android_material_icon_name="arrow-forward"
              size={20}
              color="#fff"
            />
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Se stai configurando l'OAuth in Supabase, questa schermata conferma che il percorso esiste.
          </Text>
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.9,
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    marginBottom: 32,
    width: '100%',
    maxWidth: 400,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
    opacity: 0.9,
  },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.7,
    maxWidth: 350,
  },
});
