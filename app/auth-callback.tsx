
import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { authClient, setBearerToken } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

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
        console.log("[AuthCallback] Processing OAuth callback...");
        console.log("[AuthCallback] Platform:", Platform.OS);
        console.log("[AuthCallback] URL params:", JSON.stringify(params));

        if (Platform.OS === "web") {
          // Web OAuth callback - Supabase handles this automatically
          console.log("[AuthCallback Web] Checking for Supabase session...");
          
          // Wait for Supabase to process the OAuth callback
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("[AuthCallback Web] Session error:", error);
            throw new Error("Impossibile recuperare la sessione. Riprova.");
          }
          
          if (session) {
            console.log("[AuthCallback Web] Supabase session found:", session.user.email);
            
            // Update auth context
            await fetchUser();
            
            setStatus("success");
            setMessage("Autenticazione riuscita!");
            
            // Redirect to home
            setTimeout(() => {
              router.replace("/(tabs)/(home)");
            }, 500);
          } else {
            console.error("[AuthCallback Web] No session found");
            setStatus("error");
            setMessage("Autenticazione fallita - sessione non trovata. Riprova.");
            
            setTimeout(() => {
              router.replace("/auth");
            }, 2500);
          }
        } else {
          // Native OAuth callback - Supabase handles this via deep link
          console.log("[AuthCallback Native] Processing deep link callback...");
          
          // Wait for Supabase to process the deep link
          await new Promise((resolve) => setTimeout(resolve, 1500));
          
          let session = null;
          let attempts = 0;
          const maxAttempts = 5;
          
          while (!session && attempts < maxAttempts) {
            attempts++;
            console.log(`[AuthCallback Native] Checking session (attempt ${attempts}/${maxAttempts})...`);
            
            const { data: { session: currentSession }, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error(`[AuthCallback Native] Session error (attempt ${attempts}):`, error);
            }
            
            if (currentSession) {
              session = currentSession;
              console.log("[AuthCallback Native] Session found:", session.user.email);
              break;
            }
            
            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
          
          if (session) {
            console.log("[AuthCallback Native] Authentication successful");
            
            // Update auth context
            await fetchUser();
            
            setStatus("success");
            setMessage("Autenticazione riuscita!");
            
            // Redirect to home
            setTimeout(() => {
              router.replace("/(tabs)/(home)");
            }, 500);
          } else {
            console.error("[AuthCallback Native] No session found after all attempts");
            setStatus("error");
            setMessage("Autenticazione fallita - sessione non trovata. Riprova.");
            
            setTimeout(() => {
              router.replace("/auth");
            }, 2500);
          }
        }
      } catch (err: any) {
        console.error("[AuthCallback] Error processing callback:", err);
        setStatus("error");
        setMessage(err?.message || "Autenticazione fallita");

        setTimeout(() => {
          router.replace("/auth");
        }, 2500);
      }
    };

    handleCallback();
    
    return () => {
      isMounted = false;
    };
  }, [params, fetchUser, router]);

  return (
    <View style={styles.container}>
      {status === "loading" && (
        <>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.text}>{message}</Text>
        </>
      )}
      {status === "success" && (
        <>
          <Text style={styles.successText}>✅ {message}</Text>
        </>
      )}
      {status === "error" && (
        <>
          <Text style={styles.errorText}>❌ {message}</Text>
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
    backgroundColor: "#fff",
    padding: 20,
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: "#333",
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
    color: "#666",
    textAlign: "center",
  },
});
