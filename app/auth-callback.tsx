import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { setBearerToken } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallbackScreen() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Elaborazione autenticazione...");
  const router = useRouter();
  const { fetchUser } = useAuth();
  const params = useLocalSearchParams();

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      if (!isMounted) return;
      try {
        if (Platform.OS === "web") {
          // Web: Better Auth sends token as query param better_auth_token
          const urlParams = new URLSearchParams(window.location.search);
          const token = urlParams.get("better_auth_token");

          if (token) {
            await setBearerToken(token);
            // If this is a popup, post message to parent
            if (window.opener) {
              window.opener.postMessage(
                { type: "oauth-success", token },
                window.location.origin
              );
              window.close();
              return;
            }
          }

          await fetchUser();

          if (isMounted) {
            setStatus("success");
            setMessage("Autenticazione riuscita!");
            setTimeout(() => router.replace("/(tabs)/(home)"), 500);
          }
        } else {
          // Native: deep link callback — session is already set by Better Auth expoClient
          await new Promise((resolve) => setTimeout(resolve, 800));
          await fetchUser();

          if (isMounted) {
            setStatus("success");
            setMessage("Autenticazione riuscita!");
            setTimeout(() => router.replace("/(tabs)/(home)"), 500);
          }
        }
      } catch (err: any) {
        console.error("[AuthCallback] Error:", err);
        if (isMounted) {
          setStatus("error");
          setMessage(err?.message || "Autenticazione fallita");
          setTimeout(() => router.replace("/auth"), 2500);
        }
      }
    };

    handleCallback();
    return () => { isMounted = false; };
  }, []);

  return (
    <View style={styles.container}>
      {status === "loading" && (
        <>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.text}>{message}</Text>
        </>
      )}
      {status === "success" && (
        <Text style={styles.successText}>{message}</Text>
      )}
      {status === "error" && (
        <>
          <Text style={styles.errorText}>{message}</Text>
          <Text style={styles.subText}>Reindirizzamento alla pagina di accesso...</Text>
        </>
      )}
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
  successText: {
    fontSize: 18,
    color: "#34c759",
    textAlign: "center",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: "#ff3b30",
    textAlign: "center",
    marginBottom: 10,
  },
  subText: {
    marginTop: 10,
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
});
