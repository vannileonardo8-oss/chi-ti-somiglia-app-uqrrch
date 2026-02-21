
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

    console.log("[AuthPopup] Starting OAuth flow for provider:", provider);

    if (!provider || !["google", "github", "apple"].includes(provider)) {
      const errorMsg = "Provider non valido: " + provider;
      console.error("[AuthPopup]", errorMsg);
      setError(errorMsg);
      if (window.opener) {
        window.opener.postMessage({ type: "oauth-error", error: errorMsg }, window.location.origin);
      }
      return;
    }

    const startOAuth = async () => {
      try {
        console.log("[AuthPopup] Calling authClient.signIn.social for:", provider);
        setStatusMsg(`Connessione a ${provider}...`);

        // The callbackURL is where the OAuth provider redirects after auth
        // If this is a popup, use the auth-callback page
        // If this is a full-page redirect, use the same
        const callbackURL = `${window.location.origin}/auth-callback`;
        console.log("[AuthPopup] Callback URL:", callbackURL);

        const result = await authClient.signIn.social({
          provider: provider as "google" | "apple" | "github",
          callbackURL,
        });

        console.log("[AuthPopup] signIn.social result:", JSON.stringify(result));

        if (result?.error) {
          const statusCode = result.error.status;
          const errMsg = result.error.message || result.error.statusText || "OAuth sign-in failed";
          console.error(`[AuthPopup] signIn.social error (${statusCode}):`, result.error);

          if (statusCode === 403) {
            throw new Error(
              `${provider} OAuth non è configurato sul server. Usa email e password.`
            );
          }
          throw new Error(errMsg);
        }

        // If we get a URL back, navigate to it
        if (result?.data?.url) {
          console.log("[AuthPopup] Redirecting to OAuth provider:", result.data.url);
          window.location.href = result.data.url;
        }
        // Otherwise authClient already redirected the page
      } catch (err: any) {
        const errorMsg = err?.message || "OAuth initialization failed";
        console.error("[AuthPopup] OAuth error:", err);
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
        <Text style={styles.errorText}>❌ {error}</Text>
        <Text style={styles.subText}>Puoi chiudere questa finestra e riprovare.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
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
    backgroundColor: "#fff",
    padding: 20,
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  subText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#ff3b30",
    textAlign: "center",
    marginBottom: 10,
  },
});
