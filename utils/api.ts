import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { BEARER_TOKEN_KEY } from "@/lib/auth";

export const BACKEND_URL =
  Constants.expoConfig?.extra?.backendUrl ||
  "https://3az2ndteth9e6e3ftqke6u4yj9646gyu.app.specular.dev";

export const getBearerToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(BEARER_TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
    }
  } catch (error) {
    console.error("[API] Error retrieving bearer token:", error);
    return null;
  }
};

export const apiCall = async <T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const url = `${BACKEND_URL}${endpoint}`;
  console.log("[API] Calling:", url, options?.method || "GET");

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[API] Error response:", response.status, text);
    throw new Error(`API error: ${response.status} - ${text}`);
  }

  return response.json();
};

export const authenticatedApiCall = async <T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const token = await getBearerToken();
  if (!token) {
    throw new Error("Authentication token not found. Please sign in.");
  }
  return apiCall<T>(endpoint, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const apiGet = <T = any>(endpoint: string) =>
  apiCall<T>(endpoint, { method: "GET" });

export const apiPost = <T = any>(endpoint: string, data: any) =>
  apiCall<T>(endpoint, { method: "POST", body: JSON.stringify(data) });

export const authenticatedGet = <T = any>(endpoint: string) =>
  authenticatedApiCall<T>(endpoint, { method: "GET" });

export const authenticatedPost = <T = any>(endpoint: string, data: any) =>
  authenticatedApiCall<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const authenticatedPut = <T = any>(endpoint: string, data: any) =>
  authenticatedApiCall<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const authenticatedPatch = <T = any>(endpoint: string, data: any) =>
  authenticatedApiCall<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const authenticatedDelete = <T = any>(
  endpoint: string,
  data: any = {}
) =>
  authenticatedApiCall<T>(endpoint, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
