
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
    console.log("[AuthContext] Initializing...");
    
    // Initial fetch with error handling
    fetchUser().catch((error) => {
      console.error("[AuthContext] Initial fetchUser failed:", error);
      setLoading(false);
    });

    // Listen for deep links (e.g. from social auth redirects)
    const subscription = Linking.addEventListener("url", async (event) => {
      console.log("[AuthContext] 🔗 Deep link received:", event.url);
      
      // Extract token from deep link if present
      try {
        const url = new URL(event.url);
        console.log("[AuthContext] Parsed URL:", {
          href: url.href,
          pathname: url.pathname,
          search: url.search,
          searchParams: Array.from(url.searchParams.entries())
        });
        
        const token = url.searchParams.get("better_auth_token");
        
        if (token) {
          console.log("[AuthContext] ✅ Token found in deep link!");
          await setBearerToken(token);
          
          // Fetch user immediately after setting token
          console.log("[AuthContext] Fetching user after OAuth...");
          const userFetched = await fetchUser();
          
          if (userFetched) {
            console.log("[AuthContext] ✅ User fetched successfully, navigating to home...");
            router.replace("/(tabs)/(home)");
          } else {
            console.error("[AuthContext] ❌ Failed to fetch user after OAuth token received");
          }
        } else {
          console.log("[AuthContext] ⚠️ No token in deep link URL params");
          
          // Still try to fetch user in case Better Auth handled it internally
          console.log("[AuthContext] Attempting to fetch user anyway...");
          const userFetched = await fetchUser();
          
          if (userFetched) {
            console.log("[AuthContext] ✅ User session restored, navigating to home...");
            router.replace("/(tabs)/(home)");
          } else {
            console.log("[AuthContext] ℹ️ No user session found");
          }
        }
      } catch (error) {
        console.error("[AuthContext] ❌ Error parsing deep link:", error);
        if (error instanceof Error) {
          console.error("[AuthContext] Error details:", error.message);
        }
        
        // Fallback: just try to fetch user
        console.log("[AuthContext] Fallback: attempting to fetch user...");
        try {
          const userFetched = await fetchUser();
          if (userFetched) {
            console.log("[AuthContext] ✅ User fetched in fallback, navigating to home...");
            router.replace("/(tabs)/(home)");
          }
        } catch (fetchError) {
          console.error("[AuthContext] ❌ Fallback fetchUser failed:", fetchError);
        }
      }
    });

    // Check for initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("[AuthContext] 🔗 Initial URL detected:", url);
        subscription.remove(); // Remove listener temporarily
        
        // Manually trigger the handler
        const handleInitialUrl = async () => {
          try {
            const parsedUrl = new URL(url);
            console.log("[AuthContext] Initial URL parsed:", {
              href: parsedUrl.href,
              pathname: parsedUrl.pathname,
              search: parsedUrl.search,
              searchParams: Array.from(parsedUrl.searchParams.entries())
            });
            
            const token = parsedUrl.searchParams.get("better_auth_token");
            
            if (token) {
              console.log("[AuthContext] ✅ Token found in initial URL!");
              await setBearerToken(token);
              
              const userFetched = await fetchUser();
              
              if (userFetched) {
                console.log("[AuthContext] ✅ User fetched from initial URL, navigating to home...");
                router.replace("/(tabs)/(home)");
              }
            }
          } catch (error) {
            console.error("[AuthContext] ❌ Error handling initial URL:", error);
          }
        };
        
        handleInitialUrl();
      }
    });

    // POLLING: Refresh session every 5 minutes to keep SecureStore token in sync
    // This prevents 401 errors when the session token rotates
    const intervalId = setInterval(() => {
      console.log("[AuthContext] Auto-refreshing user session to sync token...");
      fetchUser().catch((error) => {
        console.error("[AuthContext] Auto-refresh fetchUser failed:", error);
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
      console.log("[AuthContext] 📡 Fetching user session...");
      
      const session = await authClient.getSession();
      console.log("[AuthContext] Session response:", session ? "received" : "null");
      
      if (session?.data?.user) {
        console.log("[AuthContext] ✅ User found in session:", session.data.user.email);
        setUser(session.data.user as User);
        
        // Sync token to SecureStore for utils/api.ts
        if (session.data.session?.token) {
          console.log("[AuthContext] 💾 Storing session token to SecureStore");
          await setBearerToken(session.data.session.token);
        }
        return true; // User successfully fetched
      } else {
        console.log("[AuthContext] ℹ️ No user in session, clearing state");
        setUser(null);
        await clearAuthTokens();
        return false; // No user found
      }
    } catch (error) {
      console.error("[AuthContext] ❌ Failed to fetch user:", error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error("[AuthContext] Error message:", error.message);
        console.error("[AuthContext] Error stack:", error.stack);
      }
      setUser(null);
      // Clear tokens on error to prevent stuck state
      try {
        await clearAuthTokens();
      } catch (clearError) {
        console.error("[AuthContext] Failed to clear auth tokens:", clearError);
      }
      return false; // Error occurred
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log("[AuthContext] 📧 Signing in with email...");
      await authClient.signIn.email({ email, password });
      await fetchUser();
    } catch (error) {
      console.error("[AuthContext] ❌ Email sign in failed:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      console.log("[AuthContext] 📧 Signing up with email...");
      await authClient.signUp.email({
        email,
        password,
        name,
      });
      await fetchUser();
    } catch (error) {
      console.error("[AuthContext] ❌ Email sign up failed:", error);
      throw error;
    }
  };

  const signInWithSocial = async (provider: "google" | "apple" | "github") => {
    try {
      console.log(`[AuthContext] 🔐 Signing in with ${provider}...`);
      
      if (Platform.OS === "web") {
        const token = await openOAuthPopup(provider);
        await setBearerToken(token);
        await fetchUser();
      } else {
        // Native: Use expo-linking to generate a proper deep link
        const callbackURL = Linking.createURL("/(tabs)/(home)");
        console.log("[AuthContext] 📱 Native OAuth callback URL:", callbackURL);
        
        await authClient.signIn.social({
          provider,
          callbackURL,
        });
        
        // On native, the OAuth flow will redirect back to the app
        // The deep link listener will trigger fetchUser
        console.log("[AuthContext] ⏳ OAuth flow initiated, waiting for redirect...");
      }
    } catch (error) {
      console.error(`[AuthContext] ❌ ${provider} sign in failed:`, error);
      if (error instanceof Error) {
        console.error("[AuthContext] Error details:", error.message);
      }
      throw error;
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");
  const signInWithApple = () => signInWithSocial("apple");
  const signInWithGitHub = () => signInWithSocial("github");

  const signOut = async () => {
    try {
      console.log("[AuthContext] 🚪 Signing out...");
      await authClient.signOut();
      console.log("[AuthContext] ✅ Sign out API call successful");
    } catch (error) {
      console.error("[AuthContext] ❌ Sign out failed (API):", error);
    } finally {
       // Always clear local state
       console.log("[AuthContext] 🧹 Clearing local auth state");
       setUser(null);
       try {
         await clearAuthTokens();
       } catch (clearError) {
         console.error("[AuthContext] Failed to clear auth tokens:", clearError);
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
