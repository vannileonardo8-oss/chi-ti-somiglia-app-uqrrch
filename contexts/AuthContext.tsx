
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { authClient, setBearerToken, clearAuthTokens } from "@/lib/auth";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function openOAuthPopup(provider: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popupUrl = `${window.location.origin}/auth-popup?provider=${provider}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      popupUrl,
      "oauth-popup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      reject(new Error("Failed to open popup. Please allow popups."));
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "oauth-success" && event.data?.token) {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        resolve(event.data.token);
      } else if (event.data?.type === "oauth-error") {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        reject(new Error(event.data.error || "OAuth failed"));
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        reject(new Error("Authentication cancelled"));
      }
    }, 500);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const oauthInProgressRef = useRef<string | null>(null);

  useEffect(() => {
    console.log(`🔐 [AuthContext] Initializing on ${Platform.OS}...`);
    fetchUser();

    // Listen for deep links (e.g. from social auth redirects)
    const subscription = Linking.addEventListener("url", async (event) => {
      console.log("🔗 [AuthContext] Deep link received:", event.url);
      
      // Check if the URL contains a token parameter (from OAuth callback)
      try {
        const url = new URL(event.url);
        const token = url.searchParams.get('token');
        
        if (token) {
          console.log("🔑 [AuthContext] Token found in deep link, storing...");
          console.log("🔑 [AuthContext] Token value:", token.substring(0, 20) + '...');
          await setBearerToken(token);
          
          // Fetch user immediately after storing token
          console.log("🔄 [AuthContext] Fetching user session with new token...");
          await fetchUser();
          
          // Clear the OAuth in progress flag
          oauthInProgressRef.current = null;
          console.log("✅ [AuthContext] OAuth flow completed successfully");
          return;
        } else {
          console.log("⚠️ [AuthContext] No token found in deep link URL");
          console.log("🔍 [AuthContext] URL search params:", url.search);
        }
      } catch (error) {
        console.error("❌ [AuthContext] Error parsing deep link URL:", error);
      }
      
      // Fallback: Allow time for the client to process the token if needed
      setTimeout(() => {
        console.log("🔄 [AuthContext] Refreshing user session after deep link (fallback)...");
        fetchUser();
      }, 1500);
    });

    // POLLING: Refresh session every 5 minutes to keep SecureStore token in sync
    // This prevents 401 errors when the session token rotates
    const intervalId = setInterval(() => {
      console.log("⏰ [AuthContext] Auto-refreshing user session to sync token...");
      fetchUser();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  const fetchUser = async () => {
    try {
      console.log("👤 [AuthContext] Fetching user session...");
      setLoading(true);
      const session = await authClient.getSession();
      
      console.log("🔍 [AuthContext] Session response:", {
        hasUser: !!session?.data?.user,
        hasSession: !!session?.data?.session,
        hasToken: !!session?.data?.session?.token,
      });
      
      if (session?.data?.user) {
        console.log("✅ [AuthContext] User session found:", session.data.user.email);
        const userData = session.data.user as User;
        setUser(userData);
        userRef.current = userData;
        // Sync token to SecureStore for utils/api.ts
        if (session.data.session?.token) {
          await setBearerToken(session.data.session.token);
          console.log("🔑 [AuthContext] Bearer token synced to SecureStore");
        } else {
          console.warn("⚠️ [AuthContext] Session found but no token available");
        }
      } else {
        console.log("❌ [AuthContext] No user session found");
        setUser(null);
        userRef.current = null;
        // Only clear tokens if we're not in the middle of OAuth
        if (!oauthInProgressRef.current) {
          await clearAuthTokens();
        } else {
          console.log("⏳ [AuthContext] OAuth in progress, not clearing tokens yet");
        }
      }
    } catch (error) {
      console.error("❌ [AuthContext] Failed to fetch user:", error);
      setUser(null);
      userRef.current = null;
    } finally {
      setLoading(false);
      console.log("✅ [AuthContext] Loading complete");
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log("📧 [AuthContext] Signing in with email:", email);
      await authClient.signIn.email({ email, password });
      await fetchUser();
    } catch (error) {
      console.error("❌ [AuthContext] Email sign in failed:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      console.log("📝 [AuthContext] Signing up with email:", email);
      await authClient.signUp.email({
        email,
        password,
        name,
      });
      await fetchUser();
    } catch (error) {
      console.error("❌ [AuthContext] Email sign up failed:", error);
      throw error;
    }
  };

  const signInWithSocial = async (provider: "google" | "apple" | "github") => {
    try {
      console.log(`🔐 [AuthContext] Starting ${provider} sign in on ${Platform.OS}...`);
      
      // Mark OAuth as in progress
      oauthInProgressRef.current = provider;
      
      if (Platform.OS === "web") {
        console.log(`🌐 [AuthContext] Opening ${provider} OAuth popup...`);
        const token = await openOAuthPopup(provider);
        await setBearerToken(token);
        await fetchUser();
        oauthInProgressRef.current = null;
      } else {
        // Native: Use expo-linking to generate a proper deep link
        // The callback URL should point to the home screen after successful auth
        const callbackURL = Linking.createURL("/(tabs)/(home)");
        console.log(`📱 [AuthContext] Native OAuth callback URL:`, callbackURL);
        console.log(`📱 [AuthContext] This URL will receive the token as a query parameter`);
        
        try {
          await authClient.signIn.social({
            provider,
            callbackURL,
          });
        } catch (oauthError: any) {
          console.error(`❌ [AuthContext] OAuth initiation error:`, oauthError);
          oauthInProgressRef.current = null;
          // If the OAuth initiation itself fails, throw immediately
          throw new Error(`Impossibile avviare l'autenticazione con ${provider}. Riprova.`);
        }
        
        console.log(`✅ [AuthContext] ${provider} OAuth initiated, waiting for callback...`);
        console.log(`⏳ [AuthContext] The backend will redirect to: ${callbackURL}?token=SESSION_TOKEN`);
        
        // Wait for the deep link to be processed
        // The deep link listener will handle the token and call fetchUser
        const maxWaitTime = 30000; // 30 seconds max wait
        const checkInterval = 500; // Check every 500ms
        const maxChecks = maxWaitTime / checkInterval;
        
        for (let i = 0; i < maxChecks; i++) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          
          // Check if user was successfully fetched
          if (userRef.current) {
            console.log(`✅ [AuthContext] ${provider} OAuth successful! User logged in:`, userRef.current.email);
            oauthInProgressRef.current = null;
            return;
          }
        }
        
        // If we get here, timeout occurred
        console.error(`❌ [AuthContext] ${provider} OAuth timed out after ${maxWaitTime}ms`);
        oauthInProgressRef.current = null;
        throw new Error(`Timeout durante l'autenticazione con ${provider}. Riprova.`);
      }
    } catch (error: any) {
      console.error(`❌ [AuthContext] ${provider} sign in failed:`, error);
      oauthInProgressRef.current = null;
      
      // Better error logging
      if (error) {
        console.error(`❌ [AuthContext] Error type:`, typeof error);
        console.error(`❌ [AuthContext] Error message:`, error.message);
        console.error(`❌ [AuthContext] Error stack:`, error.stack);
        console.error(`❌ [AuthContext] Full error object:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));
      }
      
      // Provide a user-friendly error message
      let errorMessage = `Impossibile completare l'accesso con ${provider}. Riprova.`;
      
      if (error?.message && error.message !== "{}") {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");
  const signInWithApple = () => signInWithSocial("apple");
  const signInWithGitHub = () => signInWithSocial("github");

  const signOut = async () => {
    try {
      console.log("🚪 [AuthContext] Signing out...");
      await authClient.signOut();
      console.log("✅ [AuthContext] Sign out API call successful");
    } catch (error) {
      console.error("⚠️ [AuthContext] Sign out API failed (clearing local state anyway):", error);
    } finally {
      // Always clear local state
      setUser(null);
      userRef.current = null;
      oauthInProgressRef.current = null;
      await clearAuthTokens();
      console.log("✅ [AuthContext] Local auth state cleared");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signInWithGitHub,
        signOut,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
