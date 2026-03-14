import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackScreen() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Elaborazione autenticazione...");
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      try {
        console.log("[AuthCallback] Processing OAuth callback");

        if (typeof window !== "undefined") {
          // Web: Supabase detectSessionInUrl handles this automatically.
          // Just wait for the session to be set, then redirect.
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) throw error;

          if (session) {
            console.log("[AuthCallback] Web session established for:", session.user.email);
            if (isMounted) {
              setStatus("success");
              setMessage("Autenticazione riuscita!");
              setTimeout(() => router.replace("/(tabs)/(home)"), 500);
            }
            return;
          }

          // Try to exchange code from URL (PKCE flow on web)
          const url = new URL(window.location.href);
          const code = url.searchParams.get("code");
          if (code) {
            console.log("[AuthCallback] Exchanging PKCE code on web");
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
          }
        }

        // Native: session is already set by AuthContext's WebBrowser flow.
        // This screen is only reached on web or as a deep-link fallback.
        const { data: { session } } = await supabase.auth.getSession();
        console.log("[AuthCallback] Final session check:", session ? "found" : "none");

        if (isMounted) {
          if (session) {
            setStatus("success");
            setMessage("Autenticazione riuscita!");
            setTimeout(() => router.replace("/(tabs)/(home)"), 500);
          } else {
            throw new Error("Nessuna sessione trovata dopo il callback");
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
  }, [router]);

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
