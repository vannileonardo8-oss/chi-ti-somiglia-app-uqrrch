import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// The app scheme MUST be a valid URL scheme (no spaces, no special chars).
// app.json has scheme: "Chi ti somiglia?" which is invalid for deep links.
// We use a sanitized version: "chi-ti-somiglia" for native deep links.
// The expoClient plugin will use this scheme for OAuth callbacks on native.
const APP_SCHEME = "chi-ti-somiglia";

console.log("[Auth] Using APP_SCHEME:", APP_SCHEME);

const API_URL = "https://3az2ndteth9e6e3ftqke6u4yj9646gyu.app.specular.dev";

export const BEARER_TOKEN_KEY = "chi-ti-somiglia_bearer_token";

// Platform-specific storage: localStorage for web, SecureStore for native
const storage = Platform.OS === "web"
  ? {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      deleteItem: (key: string) => localStorage.removeItem(key),
    }
  : SecureStore;

// Create auth client with expoClient plugin for native deep link support
// On web, the expoClient plugin is included but the OAuth flow uses full-page redirect
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: APP_SCHEME,
      storagePrefix: "chi-ti-somiglia",
      storage,
    }),
  ],
  // Include credentials for cookie-based session management
  // On web, also send the bearer token in the Authorization header
  // This ensures getSession() works even when cookies are blocked (cross-origin)
  fetchOptions: {
    credentials: "include" as RequestCredentials,
    ...(Platform.OS === "web" && {
      auth: {
        type: "Bearer" as const,
        token: () => {
          try {
            return localStorage.getItem(BEARER_TOKEN_KEY) || "";
          } catch {
            return "";
          }
        },
      },
    }),
  },
});

export async function setBearerToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(BEARER_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
  }
}

export async function clearAuthTokens() {
  if (Platform.OS === "web") {
    localStorage.removeItem(BEARER_TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
  }
}

export { API_URL };
