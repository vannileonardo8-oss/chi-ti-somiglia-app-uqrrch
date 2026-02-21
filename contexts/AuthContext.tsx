
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
      // Accept messages from same origin only
      if (event.origin !== window.location.origin) {
        return;
      }
      
      console.log("[OAuth] Received message:", event.data);
      
      if (event.data?.type === "oauth-success") {
        messageReceived = true;
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        console.log("[OAuth] Success - token/session received");
        // Resolve with token (may be "cookie-auth" for cookie-based sessions)
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
        // Ignore cross-origin errors when checking popup.closed
      }
    }, 500);

    // Timeout after 3 minutes
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

    // Listen for deep links (e.g. from social auth redirects)
    const subscription = Linking.addEventListener("url", (event) => {
      console.log("[AuthContext] Deep link received:", event.url);
      
      // Parse the URL to check if it's an auth callback
      const url = event.url;
      if (url.includes("auth-callback")) {
        console.log("[AuthContext] Auth callback detected, refreshing user session...");
        // Give the auth client time to process the callback
        setTimeout(() => {
          fetchUser();
        }, 1000);
      }
    });

    // POLLING: Refresh session every 5 minutes to keep SecureStore token in sync
    // This prevents 401 errors when the session token rotates
    const intervalId = setInterval(() => {
      console.log("[AuthContext] Auto-refreshing user session to sync token...");
      fetchUser();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      console.log("[AuthContext] Fetching user session...");
      const session = await authClient.getSession();
      console.log("[AuthContext] Session response:", session);
      
      if (session?.data?.user) {
        console.log("[AuthContext] User found:", session.data.user.email);
        setUser(session.data.user as User);
        // Sync token to SecureStore for utils/api.ts
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
      await authClient.signIn.email({ email, password });
      await fetchUser();
    } catch (error) {
      console.error("[AuthContext] Email sign in failed:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      console.log("[AuthContext] Signing up with email:", email);
      await authClient.signUp.email({
        email,
        password,
        name,
      });
      await fetchUser();
    } catch (error) {
      console.error("[AuthContext] Email sign up failed:", error);
      throw error;
    }
  };

  const signInWithSocial = async (provider: "google" | "apple" | "github") => {
    try {
      console.log(`[AuthContext] Starting ${provider} sign in (platform: ${Platform.OS})`);
      
      if (Platform.OS === "web") {
        // On web: use full-page redirect OAuth flow via authClient.
        // The authClient makes a POST to the backend, gets a redirect URL,
        // and navigates the page to the OAuth provider.
        const callbackURL = `${window.location.origin}/auth-callback`;

        console.log(`[AuthContext] Using full-page redirect OAuth for ${provider}`);
        console.log(`[AuthContext] Callback URL:`, callbackURL);

        // authClient.signIn.social on web will:
        // 1. POST to /api/auth/sign-in/social
        // 2. Get back a redirect URL to the OAuth provider
        // 3. Navigate the current page to that URL
        const result = await authClient.signIn.social({
          provider,
          callbackURL,
        });

        console.log(`[AuthContext] signIn.social result:`, JSON.stringify(result));

        // Check for errors
        if (result?.error) {
          const statusCode = result.error.status;
          const errMsg = result.error.message || result.error.statusText || `${provider} sign-in failed`;
          console.error(`[AuthContext] signIn.social error (${statusCode}):`, result.error);

          if (statusCode === 403) {
            throw new Error(
              `Accesso con ${provider} non disponibile. Il provider OAuth non è configurato sul server. ` +
              `Usa email e password per accedere.`
            );
          }
          throw new Error(errMsg);
        }

        // If we get a URL back, navigate to it
        if (result?.data?.url) {
          console.log(`[AuthContext] Navigating to OAuth URL:`, result.data.url);
          window.location.href = result.data.url;
          return;
        }

        // If no URL and no error, authClient may have already redirected
        console.log(`[AuthContext] signIn.social completed (redirect may have happened)`);
      } else {
        console.log(`[AuthContext] Using native OAuth flow for ${provider}`);
        // Native: Use the expoClient plugin which handles OAuth via expo-web-browser
        // The callbackURL uses the app scheme for deep linking back to the app
        const callbackURL = Linking.createURL("auth-callback");
        console.log(`[AuthContext] Callback URL:`, callbackURL);
        
        const result = await authClient.signIn.social({
          provider,
          callbackURL,
        });

        console.log(`[AuthContext] Native signIn.social result:`, JSON.stringify(result));

        if (result?.error) {
          const statusCode = result.error.status;
          const errMsg = result.error.message || result.error.statusText || `${provider} sign-in failed`;
          console.error(`[AuthContext] Native signIn.social error (${statusCode}):`, result.error);

          if (statusCode === 403) {
            throw new Error(
              `Accesso con ${provider} non disponibile. Il provider OAuth non è configurato sul server. ` +
              `Usa email e password per accedere.`
            );
          }
          throw new Error(errMsg);
        }
        
        // The OAuth flow will return via deep link
        // The URL event listener above will trigger fetchUser()
        console.log(`[AuthContext] OAuth redirect initiated for ${provider}, waiting for callback...`);
        
        // Wait a bit for the callback to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch user to check if auth succeeded
        await fetchUser();
      }
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
      await authClient.signOut();
    } catch (error) {
      console.error("[AuthContext] Sign out failed (API):", error);
    } finally {
       // Always clear local state
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
