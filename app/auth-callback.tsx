
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
        if (Platform.OS !== "web") {
          // On native, this screen is reached via deep link after OAuth
          console.log("[AuthCallback Native] Processing OAuth callback...");
          console.log("[AuthCallback Native] URL params:", JSON.stringify(params));
          
          // Extract token from URL parameters
          // The backend sends: ?cookie=better-auth.session_token%3D<token>&better_auth_token=<token>
          const betterAuthToken = params.better_auth_token as string;
          const cookieParam = params.cookie as string;
          const tokenParam = params.token as string;
          
          let extractedToken: string | null = null;
          
          // Try to extract token from better_auth_token parameter
          if (betterAuthToken) {
            console.log("[AuthCallback Native] Found better_auth_token in URL");
            extractedToken = betterAuthToken;
          }
          
          // Try token parameter
          if (!extractedToken && tokenParam) {
            console.log("[AuthCallback Native] Found token in URL");
            extractedToken = tokenParam;
          }
          
          // Try to extract token from cookie parameter
          if (!extractedToken && cookieParam) {
            console.log("[AuthCallback Native] Parsing cookie parameter:", cookieParam);
            // cookie format: "better-auth.session_token=<token>"
            const match = cookieParam.match(/better-auth\.session_token[=%]([^&;]+)/);
            if (match && match[1]) {
              extractedToken = decodeURIComponent(match[1]);
              console.log("[AuthCallback Native] Extracted token from cookie parameter");
            }
          }
          
          if (extractedToken) {
            console.log("[AuthCallback Native] Token found, storing and fetching user...");
            await setBearerToken(extractedToken);
            
            // Fetch user session immediately with the new token
            console.log("[AuthCallback Native] Fetching user session with token...");
            await fetchUser();
            
            setStatus("success");
            setMessage("Autenticazione riuscita!");
            
            // Redirect to home immediately
            console.log("[AuthCallback Native] Redirecting to home...");
            router.replace("/(tabs)/(home)");
            return;
          }
          
          // Fallback: try to fetch session from Better Auth (cookie-based)
          console.log("[AuthCallback Native] No token in URL, trying session fetch...");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          let session = null;
          let attempts = 0;
          const maxAttempts = 3;
          
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
            
            // Wait before retrying
            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
          
          if (session?.data?.user) {
            // Store token if available
            if (session.data.session?.token) {
              await setBearerToken(session.data.session.token);
              console.log("[AuthCallback Native] Token stored from session");
            }
            
            // Trigger a user fetch in AuthContext to update global state
            await fetchUser();
            
            setStatus("success");
            setMessage("Autenticazione riuscita!");
            
            // Redirect to home
            console.log("[AuthCallback Native] Redirecting to home...");
            router.replace("/(tabs)/(home)");
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
        console.log("[AuthCallback] Processing OAuth callback...");
        console.log("[AuthCallback] Current URL:", window.location.href);

        // Check URL params for token (Better Auth may pass it in query string)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace("#", "?"));

        const urlToken =
          urlParams.get("token") ||
          urlParams.get("better_auth_token") ||
          hashParams.get("token") ||
          hashParams.get("better_auth_token");

        console.log("[AuthCallback] URL token found:", !!urlToken);
        console.log("[AuthCallback] URL params:", window.location.search);

        if (urlToken) {
          // Token was passed directly in the URL
          console.log("[AuthCallback] Token found in URL, storing immediately...");
          try {
            localStorage.setItem("chi-ti-somiglia_bearer_token", urlToken);
            console.log("[AuthCallback] Token stored in localStorage synchronously");
          } catch (e) {
            console.warn("[AuthCallback] Failed to store token synchronously:", e);
          }
          await setBearerToken(urlToken);
          
          // Fetch user to update AuthContext
          await fetchUser();
          
          setStatus("success");
          setMessage("Autenticazione riuscita! Reindirizzamento...");

          // Handle both popup and full-page redirect flows
          if (window.opener) {
            // Popup flow: send token to parent and close
            window.opener.postMessage(
              { type: "oauth-success", token: urlToken },
              window.location.origin
            );
            setTimeout(() => window.close(), 1000);
          } else {
            // Full-page redirect flow: navigate to home
            setTimeout(() => router.replace("/(tabs)/(home)"), 500);
          }
          return;
        }

        // No token in URL - try to get session from Better Auth (cookie-based)
        // Wait a moment for cookies to be set after the OAuth redirect
        await new Promise((resolve) => setTimeout(resolve, 800));

        console.log("[AuthCallback] Fetching session from Better Auth...");
        const session = await authClient.getSession();
        console.log("[AuthCallback] Session after OAuth:", JSON.stringify(session));

        if (session?.data?.session?.token) {
          const token = session.data.session.token;
          console.log("[AuthCallback] Session token found, storing...");
          await setBearerToken(token);
          
          // Fetch user to update AuthContext
          await fetchUser();
          
          setStatus("success");
          setMessage("Autenticazione riuscita! Reindirizzamento...");

          if (window.opener) {
            // Popup flow
            window.opener.postMessage(
              { type: "oauth-success", token },
              window.location.origin
            );
            setTimeout(() => window.close(), 1000);
          } else {
            // Full-page redirect flow
            setTimeout(() => router.replace("/(tabs)/(home)"), 500);
          }
        } else if (session?.data?.user) {
          // Cookie-based auth - user is authenticated but no explicit token
          console.log("[AuthCallback] User found in session (cookie-based auth)");
          
          // Fetch user to update AuthContext
          await fetchUser();
          
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
          console.error("[AuthCallback] No token or user in session");
          setStatus("error");
          setMessage("Autenticazione fallita - nessuna sessione ricevuta");

          if (window.opener) {
            window.opener.postMessage(
              { type: "oauth-error", error: "No session received" },
              window.location.origin
            );
          } else {
            // Go back to auth screen after a delay
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
