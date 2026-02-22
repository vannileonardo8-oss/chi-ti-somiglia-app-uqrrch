
import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { authClient, setBearerToken } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallbackScreen() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Elaborazione autenticazione...");
  const router = useRouter();
  const { fetchUser } = useAuth();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("[AuthCallback] Starting authentication callback processing...");
        
        if (Platform.OS !== "web") {
          // Native flow
          console.log("[AuthCallback Native] Processing OAuth callback...");
          console.log("[AuthCallback Native] URL params:", JSON.stringify(params));
          
          // Extract token from URL parameters
          const betterAuthToken = params.better_auth_token as string;
          const cookieParam = params.cookie as string;
          const tokenParam = params.token as string;
          
          let extractedToken: string | null = null;
          
          if (betterAuthToken) {
            console.log("[AuthCallback Native] Found better_auth_token in URL");
            extractedToken = betterAuthToken;
          }
          
          if (!extractedToken && tokenParam) {
            console.log("[AuthCallback Native] Found token in URL");
            extractedToken = tokenParam;
          }
          
          if (!extractedToken && cookieParam) {
            console.log("[AuthCallback Native] Parsing cookie parameter:", cookieParam);
            const match = cookieParam.match(/better-auth\.session_token[=%]([^&;]+)/);
            if (match && match[1]) {
              extractedToken = decodeURIComponent(match[1]);
              console.log("[AuthCallback Native] Extracted token from cookie parameter");
            }
          }
          
          if (extractedToken) {
            console.log("[AuthCallback Native] Token found, storing...");
            await setBearerToken(extractedToken);
            
            // Wait a moment for the token to be stored
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Fetch user session with the new token
            console.log("[AuthCallback Native] Fetching user session...");
            await fetchUser();
            
            // Wait another moment to ensure state is updated
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setStatus("success");
            setMessage("Autenticazione riuscita!");
            
            console.log("[AuthCallback Native] Redirecting to home...");
            // Use setTimeout to ensure state updates are processed
            setTimeout(() => {
              router.replace("/(tabs)/(home)");
            }, 300);
            return;
          }
          
          // Fallback: try to fetch session from Better Auth
          console.log("[AuthCallback Native] No token in URL, trying session fetch...");
          
          // Wait for cookies to be set
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          let session = null;
          let attempts = 0;
          const maxAttempts = 5;
          
          while (!session?.data?.user && attempts < maxAttempts) {
            attempts++;
            console.log(`[AuthCallback Native] Fetching session (attempt ${attempts}/${maxAttempts})...`);
            
            try {
              session = await authClient.getSession();
              console.log(`[AuthCallback Native] Session (attempt ${attempts}):`, JSON.stringify(session));
              
              if (session?.data?.user) {
                console.log("[AuthCallback Native] User found:", session.data.user.email);
                break;
              }
            } catch (err) {
              console.error(`[AuthCallback Native] Session fetch error (attempt ${attempts}):`, err);
            }
            
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          if (session?.data?.user) {
            if (session.data.session?.token) {
              await setBearerToken(session.data.session.token);
              console.log("[AuthCallback Native] Token stored from session");
            }
            
            await fetchUser();
            
            // Wait for state to update
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setStatus("success");
            setMessage("Autenticazione riuscita!");
            
            console.log("[AuthCallback Native] Redirecting to home...");
            setTimeout(() => {
              router.replace("/(tabs)/(home)");
            }, 300);
          } else {
            console.error("[AuthCallback Native] No user in session after all attempts");
            setStatus("error");
            setMessage("Autenticazione fallita - sessione non trovata. Riprova.");
            
            setTimeout(() => {
              router.replace("/auth");
            }, 2500);
          }
          return;
        }

        // Web flow
        console.log("[AuthCallback Web] Processing OAuth callback...");
        console.log("[AuthCallback Web] Current URL:", window.location.href);

        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace("#", "?"));

        const urlToken =
          urlParams.get("token") ||
          urlParams.get("better_auth_token") ||
          hashParams.get("token") ||
          hashParams.get("better_auth_token");

        console.log("[AuthCallback Web] URL token found:", !!urlToken);

        if (urlToken) {
          console.log("[AuthCallback Web] Token found in URL, storing...");
          try {
            localStorage.setItem("chi-ti-somiglia_bearer_token", urlToken);
            console.log("[AuthCallback Web] Token stored in localStorage");
          } catch (e) {
            console.warn("[AuthCallback Web] Failed to store token:", e);
          }
          await setBearerToken(urlToken);
          
          await fetchUser();
          
          // Wait for state to update
          await new Promise(resolve => setTimeout(resolve, 500));
          
          setStatus("success");
          setMessage("Autenticazione riuscita! Reindirizzamento...");

          if (window.opener) {
            window.opener.postMessage(
              { type: "oauth-success", token: urlToken },
              window.location.origin
            );
            setTimeout(() => window.close(), 1000);
          } else {
            setTimeout(() => router.replace("/(tabs)/(home)"), 500);
          }
          return;
        }

        // No token in URL - try to get session from Better Auth
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log("[AuthCallback Web] Fetching session from Better Auth...");
        const session = await authClient.getSession();
        console.log("[AuthCallback Web] Session after OAuth:", JSON.stringify(session));

        if (session?.data?.session?.token) {
          const token = session.data.session.token;
          console.log("[AuthCallback Web] Session token found, storing...");
          await setBearerToken(token);
          
          await fetchUser();
          
          // Wait for state to update
          await new Promise(resolve => setTimeout(resolve, 500));
          
          setStatus("success");
          setMessage("Autenticazione riuscita! Reindirizzamento...");

          if (window.opener) {
            window.opener.postMessage(
              { type: "oauth-success", token },
              window.location.origin
            );
            setTimeout(() => window.close(), 1000);
          } else {
            setTimeout(() => router.replace("/(tabs)/(home)"), 500);
          }
        } else if (session?.data?.user) {
          console.log("[AuthCallback Web] User found in session (cookie-based auth)");
          
          await fetchUser();
          
          // Wait for state to update
          await new Promise(resolve => setTimeout(resolve, 500));
          
          setStatus("success");
          setMessage("Autenticazione riuscita! Reindirizzamento...");

          if (window.opener) {
            window.opener.postMessage(
              { type: "oauth-success", token: "cookie-auth", user: session.data.user },
              window.location.origin
            );
            setTimeout(() => window.close(), 1000);
          } else {
            setTimeout(() => router.replace("/(tabs)/(home)"), 500);
          }
        } else {
          console.error("[AuthCallback Web] No token or user in session");
          setStatus("error");
          setMessage("Autenticazione fallita - nessuna sessione ricevuta");

          if (window.opener) {
            window.opener.postMessage(
              { type: "oauth-error", error: "No session received" },
              window.location.origin
            );
          } else {
            setTimeout(() => router.replace("/auth"), 2000);
          }
        }
      } catch (err: any) {
        console.error("[AuthCallback] Error processing callback:", err);
        setStatus("error");
        setMessage(err?.message || "Autenticazione fallita");

        if (Platform.OS === "web" && window.opener) {
          window.opener.postMessage(
            { type: "oauth-error", error: err?.message || "Authentication failed" },
            window.location.origin
          );
        } else {
          setTimeout(() => router.replace("/auth"), 2000);
        }
      }
    };

    handleCallback();
  }, [params]);

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
