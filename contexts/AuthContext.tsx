
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { authClient, setBearerToken, clearAuthTokens } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

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

    console.log(`[OAuth] Opening popup for ${provider}:`, popupUrl);

    const popup = window.open(
      popupUrl,
      "oauth-popup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      console.error("[OAuth] Failed to open popup - popups may be blocked");
      reject(new Error("Failed to open popup. Please allow popups for this site."));
      return;
    }

    let messageReceived = false;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      
      console.log("[OAuth] Received message:", event.data);
      
      if (event.data?.type === "oauth-success") {
        messageReceived = true;
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        console.log("[OAuth] Success - token/session received");
        resolve(event.data.token || "cookie-auth");
      } else if (event.data?.type === "oauth-error") {
        messageReceived = true;
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        console.error("[OAuth] Error received:", event.data.error);
        reject(new Error(event.data.error || "OAuth failed"));
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handleMessage);
          if (!messageReceived) {
            console.warn("[OAuth] Popup closed without receiving message");
            reject(new Error("Authentication cancelled"));
          }
        }
      } catch (e) {
        // Ignore cross-origin errors
      }
    }, 500);

    setTimeout(() => {
      if (!messageReceived) {
        console.error("[OAuth] Timeout - no response after 3 minutes");
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        try { popup.close(); } catch (e) {}
        reject(new Error("Authentication timeout"));
      }
    }, 180000);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AuthContext] Initializing - fetching user");
    fetchUser();

    // Listen for deep links
    const subscription = Linking.addEventListener("url", (event) => {
      console.log("[AuthContext] Deep link received:", event.url);
      
      const url = event.url;
      if (url.includes("auth-callback")) {
        console.log("[AuthContext] Auth callback detected, will be handled by auth-callback screen");
      }
    });

    // Listen for Supabase auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthContext] Supabase auth state changed:", event);
      
      if (event === 'SIGNED_IN' && session) {
        console.log("[AuthContext] User signed in via Supabase");
        // Sync with Better Auth if needed
        await fetchUser();
      } else if (event === 'SIGNED_OUT') {
        console.log("[AuthContext] User signed out via Supabase");
        setUser(null);
      }
    });

    // Auto-refresh session every 5 minutes
    const intervalId = setInterval(() => {
      console.log("[AuthContext] Auto-refreshing user session...");
      fetchUser();
    }, 5 * 60 * 1000);

    return () => {
      subscription.remove();
      authListener.subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      console.log("[AuthContext] Fetching user session...");
      
      // Try Supabase first (primary auth for this app)
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      
      if (supabaseSession?.user) {
        console.log("[AuthContext] User found via Supabase:", supabaseSession.user.email);
        setUser({
          id: supabaseSession.user.id,
          email: supabaseSession.user.email || '',
          name: supabaseSession.user.user_metadata?.name || supabaseSession.user.user_metadata?.full_name,
          image: supabaseSession.user.user_metadata?.avatar_url,
        });
        return;
      }
      
      // Fallback to Better Auth
      const session = await authClient.getSession();
      console.log("[AuthContext] Better Auth session response:", session);
      
      if (session?.data?.user) {
        console.log("[AuthContext] User found via Better Auth:", session.data.user.email);
        setUser(session.data.user as User);
        
        // Sync token
        if (session.data.session?.token) {
          await setBearerToken(session.data.session.token);
          console.log("[AuthContext] Bearer token synced");
        }
      } else {
        console.log("[AuthContext] No user session found");
        setUser(null);
        await clearAuthTokens();
      }
    } catch (error) {
      console.error("[AuthContext] Failed to fetch user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log("[AuthContext] Signing in with email:", email);
      
      // Sign in with Supabase FIRST (for storage and database access)
      const { data: supabaseData, error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (supabaseError) {
        console.error("[AuthContext] Supabase sign in failed:", supabaseError);
        throw new Error("Credenziali non valide. Verifica email e password.");
      }
      
      console.log("[AuthContext] Supabase sign in successful");
      
      // Then sign in with Better Auth (for backend API access)
      try {
        await authClient.signIn.email({ email, password });
        console.log("[AuthContext] Better Auth sign in successful");
      } catch (betterAuthError) {
        console.warn("[AuthContext] Better Auth sign in warning:", betterAuthError);
        // Don't throw - Supabase is primary for this app
      }
      
      await fetchUser();
    } catch (error) {
      console.error("[AuthContext] Email sign in failed:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      console.log("[AuthContext] Signing up with email:", email);
      
      // Sign up with Supabase FIRST (for storage and database access)
      const { data: supabaseData, error: supabaseError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || '',
          },
        },
      });
      
      if (supabaseError) {
        console.error("[AuthContext] Supabase sign up failed:", supabaseError);
        throw new Error("Registrazione fallita. L'email potrebbe essere già in uso.");
      }
      
      console.log("[AuthContext] Supabase sign up successful");
      
      // Then sign up with Better Auth (for backend API access)
      try {
        await authClient.signUp.email({
          email,
          password,
          name,
        });
        console.log("[AuthContext] Better Auth sign up successful");
      } catch (betterAuthError) {
        console.warn("[AuthContext] Better Auth sign up warning:", betterAuthError);
        // Don't throw - Supabase is primary for this app
      }
      
      await fetchUser();
    } catch (error) {
      console.error("[AuthContext] Email sign up failed:", error);
      throw error;
      }
  };

  const signInWithSocial = async (provider: "google" | "apple" | "github") => {
    try {
      console.log(`[AuthContext] Starting ${provider} sign in (platform: ${Platform.OS})`);
      
      // Use Supabase OAuth for social sign-in (it handles storage/database access automatically)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: Platform.OS === "web" 
            ? `${window.location.origin}/auth-callback`
            : "chi-ti-somiglia://auth-callback",
          skipBrowserRedirect: Platform.OS !== "web",
        },
      });

      if (error) {
        console.error(`[AuthContext] Supabase OAuth error:`, error);
        
        // Provide detailed error messages based on error type
        if (error.message.includes("missing OAuth secret")) {
          const providerName = provider === "google" ? "Google" : provider === "apple" ? "Apple" : "GitHub";
          throw new Error(
            `Configurazione OAuth ${providerName} incompleta.\n\n` +
            `Verifica che nel pannello Supabase (Authentication > Providers > ${providerName}) siano configurati:\n` +
            `• Client ID\n` +
            `• Client Secret\n` +
            `• Redirect URL: ${Platform.OS === "web" ? window.location.origin : "chi-ti-somiglia://"}auth-callback\n\n` +
            `Dopo aver configurato, riprova l'accesso.`
          );
        }
        
        if (
          error.message.includes("not enabled") || 
          error.message.includes("not configured") ||
          error.message.includes("Unsupported provider") ||
          error.message.includes("provider is not enabled")
        ) {
          const providerName = provider === "google" ? "Google" : provider === "apple" ? "Apple" : "GitHub";
          throw new Error(
            `Provider ${providerName} non abilitato.\n\n` +
            `Abilita il provider nel pannello Supabase:\n` +
            `Authentication > Providers > ${providerName} > Enable\n\n` +
            `Poi configura Client ID e Client Secret.`
          );
        }
        
        throw error;
      }

      if (Platform.OS === "web" && data?.url) {
        console.log(`[AuthContext] Redirecting to OAuth URL:`, data.url);
        window.location.href = data.url;
        return;
      }

      if (Platform.OS !== "web" && data?.url) {
        console.log(`[AuthContext] Opening OAuth URL in browser:`, data.url);
        // The URL will be opened by Supabase's auth system
        // The callback will be handled by auth-callback.tsx
      }
      
      console.log(`[AuthContext] OAuth initiated for ${provider}, waiting for callback...`);
    } catch (error) {
      console.error(`[AuthContext] ${provider} sign in failed:`, error);
      throw error;
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");
  const signInWithApple = () => signInWithSocial("apple");
  const signInWithGitHub = () => signInWithSocial("github");

  const signOut = async () => {
    try {
      console.log("[AuthContext] Signing out...");
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Sign out from Better Auth
      try {
        await authClient.signOut();
      } catch (error) {
        console.warn("[AuthContext] Better Auth sign out warning:", error);
      }
    } catch (error) {
      console.error("[AuthContext] Sign out failed (API):", error);
    } finally {
      console.log("[AuthContext] Clearing local auth state");
      setUser(null);
      await clearAuthTokens();
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
