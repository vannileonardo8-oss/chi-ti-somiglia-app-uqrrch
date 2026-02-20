
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
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
import React, { useState } from "react";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });

  const showError = (message: string) => {
    console.log("[Auth] Showing error:", message);
    setErrorModal({ visible: true, message });
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      showError("Inserisci email e password");
      return;
    }

    if (mode === "signup" && !name) {
      showError("Inserisci il tuo nome");
      return;
    }

    setLoading(true);
    console.log(`[Auth] Starting ${mode} with email:`, email);

    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
      console.log("[Auth] Email auth successful, navigating to home");
      router.replace("/(tabs)/(home)");
    } catch (error: any) {
      console.error("[Auth] Email auth error:", error);
      showError(
        error?.message ||
          (mode === "signin"
            ? "Accesso fallito. Verifica le credenziali."
            : "Registrazione fallita. Riprova.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "apple" | "github") => {
    setLoading(true);
    console.log(`[Auth] Starting ${provider} OAuth`);

    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else if (provider === "apple") {
        await signInWithApple();
      }
      
      console.log(`[Auth] ${provider} OAuth initiated`);
      
      // On web: full-page redirect happens inside signInWithGoogle/Apple
      // The page will navigate away, so we don't need to do anything here.
      // On native: the deep link will trigger navigation via the URL event listener.
      if (Platform.OS !== "web") {
        router.replace("/(tabs)/(home)");
      }
      // On web, keep loading=true since the page is about to redirect
      // (if redirect fails, the error will be caught below)
    } catch (error: any) {
      console.error(`[Auth] ${provider} OAuth error:`, error);
      
      const providerName = provider === "google" ? "Google" : provider === "apple" ? "Apple" : provider;
      let errorMessage = `Accesso con ${providerName} fallito.`;
      
      if (error?.message) {
        if (error.message.includes("popup")) {
          errorMessage = "Abilita i popup nel browser e riprova.";
        } else if (error.message.includes("cancelled") || error.message.includes("annullato")) {
          errorMessage = "Accesso annullato.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Timeout. Riprova.";
        } else if (error.message.includes("403") || error.message.includes("Forbidden")) {
          errorMessage = `${providerName} OAuth non è configurato sul server. Usa email e password per accedere.`;
        } else if (error.message.includes("non è configurato")) {
          errorMessage = error.message;
        } else {
          errorMessage += ` ${error.message}`;
        }
      }
      
      showError(errorMessage);
      setLoading(false);
    }
    // Note: on web success, don't call setLoading(false) - page is redirecting
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Chi ti somiglia?</Text>
          <Text style={styles.subtitle}>
            {mode === "signin" ? "Accedi al tuo account" : "Crea un nuovo account"}
          </Text>

          {mode === "signup" && (
            <TextInput
              style={styles.input}
              placeholder="Nome"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {mode === "signin" ? "Accedi" : "Registrati"}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>oppure</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.socialButton, styles.googleButton, loading && styles.buttonDisabled]}
            onPress={() => handleSocialAuth("google")}
            disabled={loading}
          >
            <Text style={styles.socialButtonText}>Continua con Google</Text>
          </TouchableOpacity>

          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={[styles.socialButton, styles.appleButton, loading && styles.buttonDisabled]}
              onPress={() => handleSocialAuth("apple")}
              disabled={loading}
            >
              <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                Continua con Apple
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
            disabled={loading}
          >
            <Text style={styles.switchButtonText}>
              {mode === "signin"
                ? "Non hai un account? Registrati"
                : "Hai già un account? Accedi"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Error Modal */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModal({ visible: false, message: "" })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Errore</Text>
            <Text style={styles.modalMessage}>{errorModal.message}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setErrorModal({ visible: false, message: "" })}
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
    backgroundColor: "#000",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    marginBottom: 32,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#2c2c2e",
  },
  dividerText: {
    color: "#999",
    paddingHorizontal: 16,
    fontSize: 14,
  },
  socialButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
  },
  appleButton: {
    backgroundColor: "#000",
    borderColor: "#fff",
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  appleButtonText: {
    color: "#fff",
  },
  switchButton: {
    marginTop: 24,
    alignItems: "center",
  },
  switchButtonText: {
    color: "#007AFF",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
