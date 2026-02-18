
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

const API_URL = "https://3az2ndteth9e6e3ftqke6u4yj9646gyu.app.specular.dev";

export const BEARER_TOKEN_KEY = "chi-ti-somiglia_bearer_token";

// Platform-specific storage: localStorage for web, SecureStore for native
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
          console.error(`SecureStore getItem error for key ${key}:`, error);
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          await SecureStore.setItemAsync(key, value);
        } catch (error) {
          console.error(`SecureStore setItem error for key ${key}:`, error);
        }
      },
      deleteItem: async (key: string) => {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          // Ignore error if key doesn't exist
          console.log(`SecureStore deleteItem (safe to ignore if key doesn't exist):`, error);
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
    }),
  ],
  // On web, use cookies (credentials: include) and fallback to bearer token
  ...(Platform.OS === "web" && {
    fetchOptions: {
      credentials: "include",
      auth: {
        type: "Bearer" as const,
        token: () => localStorage.getItem(BEARER_TOKEN_KEY) || "",
      },
    },
  }),
});

export async function setBearerToken(token: string) {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(BEARER_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
    }
  } catch (error) {
    console.error("Failed to set bearer token:", error);
  }
}

export async function clearAuthTokens() {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(BEARER_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
    }
  } catch (error) {
    // Safe to ignore - key might not exist
    console.log("Clear auth tokens (safe to ignore if key doesn't exist):", error);
  }
}

export { API_URL };
