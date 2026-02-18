
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Caricamento...</Text>
      </View>
    );
  }

  const showModal = (title: string, message: string) => {
    setModal({ visible: true, title, message });
  };

  const handleSkip = () => {
    console.log("⏭️ User skipped authentication");
    router.replace("/(tabs)/(home)");
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      showModal("Errore", "Inserisci email e password");
      return;
    }

    setLoading(true);
    try {
      console.log(`📧 Attempting ${mode} with email:`, email);
      if (mode === "signin") {
        await signInWithEmail(email, password);
        console.log("✅ Email sign in successful");
        router.replace("/(tabs)/(home)");
      } else {
        await signUpWithEmail(email, password, name);
        console.log("✅ Email sign up successful");
        showModal("Successo", "Account creato! Controlla la tua email per verificare l'account.");
        router.replace("/(tabs)/(home)");
      }
    } catch (error: any) {
      console.error(`❌ Email ${mode} failed:`, error);
      showModal("Errore", error.message || "Autenticazione fallita");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "apple") => {
    setLoading(true);
    try {
      console.log(`🔐 Attempting ${provider} authentication...`);
      if (provider === "google") {
        await signInWithGoogle();
      } else if (provider === "apple") {
        await signInWithApple();
      }
      
      console.log(`✅ ${provider} authentication initiated`);
      
      // On web, navigation happens after popup closes
      // On native, navigation happens after deep link callback
      if (Platform.OS === "web") {
        router.replace("/(tabs)/(home)");
      }
    } catch (error: any) {
      console.error(`❌ ${provider} authentication failed:`, error);
      showModal("Errore", error?.message || "Autenticazione fallita. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {mode === "signin" ? "Accedi" : "Registrati"}
          </Text>
          <Text style={styles.subtitle}>Chi ti somiglia?</Text>

          {mode === "signup" && (
            <TextInput
              style={styles.input}
              placeholder="Nome (opzionale)"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === "signin" ? "Accedi" : "Registrati"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            <Text style={styles.switchModeText}>
              {mode === "signin"
                ? "Non hai un account? Registrati"
                : "Hai già un account? Accedi"}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>oppure continua con</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialAuth("google")}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.socialButtonText}>Continua con Google</Text>
            )}
          </TouchableOpacity>

          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={[styles.socialButton, styles.appleButton]}
              onPress={() => handleSocialAuth("apple")}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                  Continua con Apple
                </Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>Salta per ora</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={modal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setModal({ visible: false, title: '', message: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modal.title}</Text>
            <Text style={styles.modalMessage}>{modal.message}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModal({ visible: false, title: '', message: '' })}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    color: "#000",
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 32,
    textAlign: "center",
    color: "#FF6B9D",
    fontWeight: "600",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  primaryButton: {
    height: 50,
    backgroundColor: "#FF6B9D",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: "center",
  },
  switchModeText: {
    color: "#FF6B9D",
    fontSize: 14,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#666",
    fontSize: 14,
  },
  socialButton: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  socialButtonText: {
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  appleButton: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  appleButtonText: {
    color: "#fff",
  },
  skipButton: {
    marginTop: 24,
    alignItems: "center",
    paddingVertical: 12,
  },
  skipButtonText: {
    color: "#999",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    color: '#666',
  },
  modalButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 100,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
