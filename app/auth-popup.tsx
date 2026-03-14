import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { authClient } from "@/lib/auth";

export default function AuthPopupScreen() {
  const { provider } = useLocalSearchParams<{ provider: string }>();
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("Reindirizzamento all'accesso...");

  useEffect(() => {
    if (Platform.OS !== "web") {
      setError("This screen is only for web OAuth");
      return;
    }

    if (!provider || !["google", "apple"].includes(provider)) {
      const errorMsg = "Provider non valido: " + provider;
      setError(errorMsg);
      if (window.opener) {
        window.opener.postMessage({ type: "oauth-error", error: errorMsg }, window.location.origin);
      }
      return;
    }

    const startOAuth = async () => {
      try {
        setStatusMsg(`Connessione a ${provider}...`);
        const callbackURL = `${window.location.origin}/auth-callback`;

        const result = await authClient.signIn.social({
          provider: provider as "google" | "apple",
          callbackURL,
        });

        if (result?.error) {
          throw new Error(result.error.message || "OAuth sign-in failed");
        }

        if (result?.data?.url) {
          window.location.href = result.data.url;
        }
      } catch (err: any) {
        const errorMsg = err?.message || "OAuth initialization failed";
        setError(errorMsg);
        if (window.opener) {
          window.opener.postMessage(
            { type: "oauth-error", error: errorMsg },
            window.location.origin
          );
        }
      }
    };

    startOAuth();
  }, [provider]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Errore: {error}</Text>
        <Text style={styles.subText}>Puoi chiudere questa finestra e riprovare.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF6B9D" />
      <Text style={styles.text}>{statusMsg}</Text>
      <Text style={styles.subText}>Attendere prego...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    padding: 20,
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },
  subText: {
    marginTop: 10,
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#ff3b30",
    textAlign: "center",
    marginBottom: 10,
  },
});
