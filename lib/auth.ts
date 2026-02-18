
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_URL = "https://3az2ndteth9e6e3ftqke6u4yj9646gyu.app.specular.dev";

export const BEARER_TOKEN_KEY = "chi-ti-somiglia_bearer_token";

// Platform-specific storage
const storage = Platform.OS === "web"
  ? {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      deleteItem: (key: string) => localStorage.removeItem(key),
    }
  : {
      getItem: async (key: string) => {
        try {
          return await SecureStore.getItemAsync(key);
        } catch (error) {
          console.error(`SecureStore error getting ${key}:`, error);
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          await SecureStore.setItemAsync(key, value);
        } catch (error) {
          console.error(`SecureStore error setting ${key}:`, error);
        }
      },
      deleteItem: async (key: string) => {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          console.error(`SecureStore error deleting ${key}:`, error);
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
      autoSignIn: true,
    }),
  ],
  fetchOptions: {
    credentials: Platform.OS === "web" ? "include" : "same-origin",
  },
});

export async function setBearerToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(BEARER_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
  }
}

export async function getBearerToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(BEARER_TOKEN_KEY);
  } else {
    try {
      return await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
    } catch (error) {
      console.error("Error getting bearer token:", error);
      return null;
    }
  }
}

export async function clearAuthTokens() {
  if (Platform.OS === "web") {
    localStorage.removeItem(BEARER_TOKEN_KEY);
    // Clear Better Auth storage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('chi-ti-somiglia')) {
        localStorage.removeItem(key);
      }
    });
  } else {
    try {
      await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
      // Clear Better Auth storage keys
      const betterAuthKeys = [
        'chi-ti-somiglia.session.token',
        'chi-ti-somiglia.session.expiresAt',
        'chi-ti-somiglia.session',
      ];
      for (const key of betterAuthKeys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (e) {
          // Key might not exist
        }
      }
    } catch (error) {
      console.error("Error clearing auth tokens:", error);
    }
  }
}

export { API_URL };
