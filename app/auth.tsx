
import React, { useState } from "react";
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
import { useRouter } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { LinearGradient } from "expo-linear-gradient";
import { IconSymbol } from "@/components/IconSymbol";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });
  const router = useRouter();

  const showError = (message: string) => {
    console.log("[Auth] Showing error:", message);
    setErrorModal({ visible: true, message });
  };

  const handleEmailAuth = async () => {
    console.log(`[Auth] Starting ${mode} with email:`, email);
    
    if (!email || !password) {
      showError("Inserisci email e password.");
      return;
    }

    if (mode === "signup" && !name) {
      showError("Inserisci il tuo nome.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
        console.log("[Auth] Email auth successful, navigating to home");
        router.replace("/(tabs)/(home)");
      } else {
        await signUpWithEmail(email, password, name);
        console.log("[Auth] Email signup successful, navigating to home");
        router.replace("/(tabs)/(home)");
      }
    } catch (error: any) {
      console.error("[Auth] Email auth error:", error);
      showError(error?.message || "Si è verificato un errore. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "apple" | "github") => {
    console.log(`[Auth] Starting ${provider} auth`);
    setLoading(true);
    try {
      if (provider === "google") {
        await signInWithGoogle();
      }
      // Apple and GitHub would be similar
      console.log(`[Auth] ${provider} auth initiated`);
    } catch (error: any) {
      console.error(`[Auth] ${provider} auth error:`, error);
      showError(error?.message || `Errore durante l'accesso con ${provider}. Riprova.`);
      setLoading(false);
    }
  };

  const isSignIn = mode === "signin";
  const modeText = isSignIn ? "Accedi" : "Registrati";
  const switchText = isSignIn ? "Non hai un account?" : "Hai già un account?";
  const switchAction = isSignIn ? "Registrati" : "Accedi";

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.emojiRow}>
              <Text style={styles.emoji}>🤔</Text>
              <Text style={styles.emoji}>👥</Text>
              <Text style={styles.emoji}>✨</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Chi ti somiglia?</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isSignIn ? "Bentornato!" : "Crea il tuo account"}
            </Text>
          </View>

          <View style={styles.form}>
            {!isSignIn && (
              <View style={styles.inputContainer}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Nome"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <IconSymbol
                ios_icon_name="envelope.fill"
                android_material_icon_name="email"
                size={20}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <IconSymbol
                ios_icon_name="lock.fill"
                android_material_icon_name="lock"
                size={20}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleEmailAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.secondary, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={[styles.buttonText, { color: colors.background }]}>
                    {modeText}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.textSecondary }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>oppure</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.textSecondary }]} />
            </View>

            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: colors.card }]}
              onPress={() => handleSocialAuth("google")}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={[styles.socialButtonText, { color: colors.text }]}>
                Continua con Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setMode(isSignIn ? "signup" : "signin")}
              disabled={loading}
            >
              <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                {switchText}{" "}
                <Text style={[styles.switchAction, { color: colors.secondary }]}>
                  {switchAction}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Error Modal */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModal({ visible: false, message: "" })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={styles.modalEmoji}>⚠️</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Attenzione</Text>
            <ScrollView style={styles.modalMessageScroll}>
              <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                {errorModal.message}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.secondary }]}
              onPress={() => setErrorModal({ visible: false, message: "" })}
            >
              <Text style={[styles.modalButtonText, { color: colors.background }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  emojiRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
  },
  form: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: "bold",
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  switchButton: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  switchText: {
    fontSize: 14,
  },
  switchAction: {
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    alignItems: "center",
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  modalMessageScroll: {
    maxHeight: 300,
    width: "100%",
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 100,
    marginTop: 12,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
