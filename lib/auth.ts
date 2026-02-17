
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_URL = "https://3az2ndteth9e6e3ftqke6u4yj9646gyu.app.specular.dev";

export const BEARER_TOKEN_KEY = "chi-ti-somiglia_bearer_token";

// Platform-specific storage: localStorage for web, SecureStore for native
const storage = Platform.OS === "web"
  ? {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.error(`[localStorage] Error getting ${key}:`, error);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.error(`[localStorage] Error setting ${key}:`, error);
        }
      },
      deleteItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error(`[localStorage] Error deleting ${key}:`, error);
        }
      },
    }
  : {
      getItem: async (key: string) => {
        try {
          const value = await SecureStore.getItemAsync(key);
          console.log(`[SecureStore] Got ${key}:`, value ? 'exists' : 'null');
          return value;
        } catch (error) {
          console.error(`[SecureStore] Error getting ${key}:`, error);
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          await SecureStore.setItemAsync(key, value);
          console.log(`[SecureStore] Set ${key} successfully`);
        } catch (error) {
          console.error(`[SecureStore] Error setting ${key}:`, error);
        }
      },
      deleteItem: async (key: string) => {
        try {
          await SecureStore.deleteItemAsync(key);
          console.log(`[SecureStore] Deleted ${key} successfully`);
        } catch (error) {
          console.error(`[SecureStore] Error deleting ${key}:`, error);
        }
      },
    };

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: "chi-ti-somiglia",
      storagePrefix: "chi-ti-somiglia",
      storage,
      // Enable automatic token extraction from redirect URLs
      // This tells Better Auth to look for the token in the URL query parameters
      autoSignIn: true,
    }),
  ],
  fetchOptions: {
    credentials: Platform.OS === "web" ? "include" : "same-origin",
  },
});

export async function setBearerToken(token: string) {
  console.log("[setBearerToken] Setting bearer token...");
  if (Platform.OS === "web") {
    localStorage.setItem(BEARER_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
  }
  console.log("[setBearerToken] Bearer token set successfully");
}

export async function getBearerToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(BEARER_TOKEN_KEY);
  } else {
    try {
      const token = await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
      console.log("[getBearerToken] Token retrieved:", token ? 'exists' : 'null');
      return token;
    } catch (error) {
      console.error("[getBearerToken] Error:", error);
      return null;
    }
  }
}

export async function clearAuthTokens() {
  console.log("[clearAuthTokens] Clearing auth tokens...");
  if (Platform.OS === "web") {
    localStorage.removeItem(BEARER_TOKEN_KEY);
    // Also clear Better Auth storage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('chi-ti-somiglia')) {
        localStorage.removeItem(key);
      }
    });
  } else {
    try {
      await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
      // Also try to clear Better Auth storage keys
      const betterAuthKeys = [
        'chi-ti-somiglia.session.token',
        'chi-ti-somiglia.session.expiresAt',
        'chi-ti-somiglia.session',
      ];
      for (const key of betterAuthKeys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (e) {
          // Key might not exist, ignore
        }
      }
    } catch (error) {
      console.error("[clearAuthTokens] Error:", error);
    }
  }
  console.log("[clearAuthTokens] Auth tokens cleared");
}

export { API_URL };
