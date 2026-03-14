import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

const API_URL =
  Constants.expoConfig?.extra?.backendUrl ||
  "https://3az2ndteth9e6e3ftqke6u4yj9646gyu.app.specular.dev";

// App scheme from app.json expo.scheme
const APP_SCHEME = "chitisomiglia";

export const BEARER_TOKEN_KEY = "chitisomiglia_bearer_token";

// Platform-specific storage: localStorage for web, SecureStore for native
const storage =
  Platform.OS === "web"
    ? {
        getItem: (key: string) => localStorage.getItem(key),
        setItem: (key: string, value: string) =>
          localStorage.setItem(key, value),
        deleteItem: (key: string) => localStorage.removeItem(key),
      }
    : SecureStore;

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: APP_SCHEME,
      storagePrefix: "chitisomiglia",
      storage,
    }),
  ],
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
