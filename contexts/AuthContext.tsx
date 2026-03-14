import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
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
      reject(new Error("Failed to open popup. Please allow popups for this site."));
      return;
    }

    let messageReceived = false;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "oauth-success") {
        messageReceived = true;
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        resolve(event.data.token || "cookie-auth");
      } else if (event.data?.type === "oauth-error") {
        messageReceived = true;
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
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
            reject(new Error("Authentication cancelled"));
          }
        }
      } catch (e) {
        // ignore cross-origin errors
      }
    }, 500);

    setTimeout(() => {
      if (!messageReceived) {
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
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const session = await authClient.getSession();
      if (session?.data?.user) {
        setUser(session.data.user as User);
        if (session.data.session?.token) {
          await setBearerToken(session.data.session.token);
        }
      } else {
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
    const result = await authClient.signIn.email({ email, password });
    if (result?.error) throw new Error(result.error.message || "Sign in failed");
    await fetchUser();
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const result = await authClient.signUp.email({ email, password, name: name || "" });
    if (result?.error) throw new Error(result.error.message || "Sign up failed");
    await fetchUser();
  };

  const signInWithSocial = async (provider: "google" | "apple") => {
    if (Platform.OS === "web") {
      const token = await openOAuthPopup(provider);
      if (token && token !== "cookie-auth") {
        await setBearerToken(token);
      }
      await fetchUser();
    } else {
      const callbackURL = "chitisomiglia://auth-callback";
      const result = await authClient.signIn.social({ provider, callbackURL });
      if (result?.error) throw new Error(result.error.message || `${provider} sign in failed`);
      await fetchUser();
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");
  const signInWithApple = () => signInWithSocial("apple");

  const signOut = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.warn("[AuthContext] Sign out error:", error);
    } finally {
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
