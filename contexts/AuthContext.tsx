import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

// Warm up the browser on Android for faster OAuth
if (Platform.OS !== "web") {
  WebBrowser.warmUpAsync();
}

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUser(supabaseUser: SupabaseUser): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    name:
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      supabaseUser.email?.split("@")[0] ||
      undefined,
    image:
      supabaseUser.user_metadata?.avatar_url ||
      supabaseUser.user_metadata?.picture ||
      undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const handleInvalidRefreshToken = async () => {
    console.log("[AuthContext] Invalid refresh token detected — signing out");
    try {
      await supabase.auth.signOut();
    } catch (_) {
      // ignore errors during forced sign out
    }
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  useEffect(() => {
    // Load existing session on mount
    supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      if (error) {
        const msg = error.message ?? "";
        if (
          msg.includes("Refresh Token Not Found") ||
          (error as any).code === "invalid_refresh_token"
        ) {
          handleInvalidRefreshToken();
          return;
        }
        console.error("[AuthContext] getSession error:", error);
      }
      console.log("[AuthContext] Initial session:", s ? "found" : "none");
      setSession(s);
      setUser(s?.user ? mapSupabaseUser(s.user) : null);
      setLoading(false);
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        console.log("[AuthContext] Auth state change:", event);

        // TOKEN_REFRESH_FAILED means the refresh token is invalid/expired
        if (event === "TOKEN_REFRESH_FAILED") {
          console.log("[AuthContext] TOKEN_REFRESH_FAILED — forcing sign out");
          handleInvalidRefreshToken();
          return;
        }

        // If token refresh returned no session, the refresh token is invalid
        if (event === "TOKEN_REFRESHED" && !s) {
          console.log("[AuthContext] TOKEN_REFRESHED with null session — forcing sign out");
          handleInvalidRefreshToken();
          return;
        }

        setSession(s);
        setUser(s?.user ? mapSupabaseUser(s.user) : null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUser = async () => {
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      setUser(s?.user ? mapSupabaseUser(s.user) : null);
    } catch (error) {
      console.error("[AuthContext] Failed to fetch user:", error);
      setUser(null);
      setSession(null);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    console.log("[AuthContext] signInWithEmail:", email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    console.log("[AuthContext] signUpWithEmail:", email);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name || "" } },
    });
    if (error) throw new Error(error.message);
  };

  const signInWithOAuth = async (provider: "google" | "apple") => {
    console.log("[AuthContext] signInWithOAuth:", provider);

    if (Platform.OS === "web") {
      // Web: let Supabase handle the redirect directly
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth-callback`,
        },
      });
      if (error) throw new Error(error.message);
      return;
    }

    // Native: use WebBrowser + PKCE code exchange
    const redirectUrl = Linking.createURL("auth-callback");
    console.log("[AuthContext] OAuth redirect URL:", redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw new Error(error.message);
    if (!data?.url) throw new Error("No OAuth URL returned");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    console.log("[AuthContext] WebBrowser result type:", result.type);

    if (result.type === "success") {
      const url = new URL(result.url);
      // PKCE flow: exchange code for session
      const code = url.searchParams.get("code");
      if (code) {
        console.log("[AuthContext] Exchanging PKCE code for session");
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw new Error(exchangeError.message);
      } else {
        // Implicit flow fallback: parse tokens from fragment
        const fragment = url.hash.substring(1);
        const params = new URLSearchParams(fragment);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken) {
          console.log("[AuthContext] Setting session from fragment tokens");
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken ?? "",
          });
        }
      }
    } else if (result.type === "cancel" || result.type === "dismiss") {
      throw new Error("Accesso annullato");
    }
  };

  const signInWithGoogle = () => signInWithOAuth("google");
  const signInWithApple = () => signInWithOAuth("apple");

  const signOut = async () => {
    console.log("[AuthContext] signOut");
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("[AuthContext] Sign out error:", error);
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
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
