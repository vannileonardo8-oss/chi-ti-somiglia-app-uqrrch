
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
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

  useEffect(() => {
    console.log(`🔐 [AuthContext] Initializing on ${Platform.OS}...`);
    fetchUser();

    // Listen for deep links (e.g. from social auth redirects)
    const subscription = Linking.addEventListener("url", (event) => {
      console.log("🔗 [AuthContext] Deep link received:", event.url);
      // Allow time for the client to process the token if needed
      setTimeout(() => {
        console.log("🔄 [AuthContext] Refreshing user session after deep link...");
        fetchUser();
      }, 500);
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
      
      if (session?.data?.user) {
        console.log("✅ [AuthContext] User session found:", session.data.user.email);
        setUser(session.data.user as User);
        // Sync token to SecureStore for utils/api.ts
        if (session.data.session?.token) {
          await setBearerToken(session.data.session.token);
          console.log("🔑 [AuthContext] Bearer token synced to SecureStore");
        }
      } else {
        console.log("❌ [AuthContext] No user session found");
        setUser(null);
        await clearAuthTokens();
      }
    } catch (error) {
      console.error("❌ [AuthContext] Failed to fetch user:", error);
      setUser(null);
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
      
      if (Platform.OS === "web") {
        console.log(`🌐 [AuthContext] Opening ${provider} OAuth popup...`);
        const token = await openOAuthPopup(provider);
        await setBearerToken(token);
        await fetchUser();
      } else {
        // Native: Use expo-linking to generate a proper deep link
        const callbackURL = Linking.createURL("/(tabs)/(home)");
        console.log(`📱 [AuthContext] Native OAuth callback URL:`, callbackURL);
        
        await authClient.signIn.social({
          provider,
          callbackURL,
        });
        
        console.log(`✅ [AuthContext] ${provider} OAuth initiated, waiting for callback...`);
        // The redirect will be handled by the deep link listener
        await fetchUser();
      }
    } catch (error) {
      console.error(`❌ [AuthContext] ${provider} sign in failed:`, error);
      throw error;
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
