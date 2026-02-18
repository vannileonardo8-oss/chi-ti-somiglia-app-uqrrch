
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
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
  fetchUser: () => Promise<boolean>;
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
  const router = useRouter();

  useEffect(() => {
    // Initial fetch with error handling
    fetchUser().catch((error) => {
      console.error("Initial fetchUser failed:", error);
      setLoading(false);
    });

    // Listen for deep links (e.g. from social auth redirects)
    const subscription = Linking.addEventListener("url", async (event) => {
      console.log("Deep link received:", event.url);
      
      // Extract token from deep link if present
      try {
        const url = new URL(event.url);
        const token = url.searchParams.get("better_auth_token");
        
        if (token) {
          console.log("Token found in deep link, storing and fetching user...");
          await setBearerToken(token);
          // Give Better Auth client time to process the token, then fetch user and navigate
          setTimeout(async () => {
            try {
              const userFetched = await fetchUser();
              if (userFetched) {
                console.log("User fetched after OAuth, navigating to home...");
                router.replace("/(tabs)/(home)");
              } else {
                console.error("Failed to fetch user after OAuth token received");
              }
            } catch (error) {
              console.error("Deep link fetchUser failed:", error);
            }
          }, 1000);
        } else {
          console.log("No token in deep link, refreshing session anyway");
          // Still try to fetch user in case Better Auth handled it internally
          setTimeout(async () => {
            try {
              const userFetched = await fetchUser();
              if (userFetched) {
                console.log("User session restored, navigating to home...");
                router.replace("/(tabs)/(home)");
              }
            } catch (error) {
              console.error("Deep link fetchUser failed:", error);
            }
          }, 1000);
        }
      } catch (error) {
        console.error("Error parsing deep link:", error);
        // Fallback: just try to fetch user
        setTimeout(() => {
          fetchUser().catch((error) => {
            console.error("Deep link fetchUser failed:", error);
          });
        }, 1000);
      }
    });

    // POLLING: Refresh session every 5 minutes to keep SecureStore token in sync
    // This prevents 401 errors when the session token rotates
    const intervalId = setInterval(() => {
      console.log("Auto-refreshing user session to sync token...");
      fetchUser().catch((error) => {
        console.error("Auto-refresh fetchUser failed:", error);
      });
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  const fetchUser = async (): Promise<boolean> => {
    try {
      setLoading(true);
      console.log("Fetching user session...");
      
      const session = await authClient.getSession();
      console.log("Session fetched:", session ? "success" : "no session");
      
      if (session?.data?.user) {
        console.log("User found in session:", session.data.user.email);
        setUser(session.data.user as User);
        // Sync token to SecureStore for utils/api.ts
        if (session.data.session?.token) {
          console.log("Storing session token to SecureStore");
          await setBearerToken(session.data.session.token);
        }
        return true; // User successfully fetched
      } else {
        console.log("No user in session, clearing state");
        setUser(null);
        await clearAuthTokens();
        return false; // No user found
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      setUser(null);
      // Clear tokens on error to prevent stuck state
      try {
        await clearAuthTokens();
      } catch (clearError) {
        console.error("Failed to clear auth tokens:", clearError);
      }
      return false; // Error occurred
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log("Signing in with email...");
      await authClient.signIn.email({ email, password });
      await fetchUser();
    } catch (error) {
      console.error("Email sign in failed:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      console.log("Signing up with email...");
      await authClient.signUp.email({
        email,
        password,
        name,
      });
      await fetchUser();
    } catch (error) {
      console.error("Email sign up failed:", error);
      throw error;
    }
  };

  const signInWithSocial = async (provider: "google" | "apple" | "github") => {
    try {
      console.log(`Signing in with ${provider}...`);
      
      if (Platform.OS === "web") {
        const token = await openOAuthPopup(provider);
        await setBearerToken(token);
        await fetchUser();
      } else {
        // Native: Use expo-linking to generate a proper deep link
        const callbackURL = Linking.createURL("/(tabs)/(home)");
        console.log("Native OAuth callback URL:", callbackURL);
        
        await authClient.signIn.social({
          provider,
          callbackURL,
        });
        
        // On native, the OAuth flow will redirect back to the app
        // The deep link listener will trigger fetchUser
        console.log("OAuth flow initiated, waiting for redirect...");
      }
    } catch (error) {
      console.error(`${provider} sign in failed:`, error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
      throw error;
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");
  const signInWithApple = () => signInWithSocial("apple");
  const signInWithGitHub = () => signInWithSocial("github");

  const signOut = async () => {
    try {
      console.log("Signing out...");
      await authClient.signOut();
      console.log("Sign out API call successful");
    } catch (error) {
      console.error("Sign out failed (API):", error);
    } finally {
       // Always clear local state
       console.log("Clearing local auth state");
       setUser(null);
       try {
         await clearAuthTokens();
       } catch (clearError) {
         console.error("Failed to clear auth tokens:", clearError);
       }
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
