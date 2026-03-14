import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { BEARER_TOKEN_KEY } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const BACKEND_URL =
  Constants.expoConfig?.extra?.backendUrl ||
  "https://3az2ndteth9e6e3ftqke6u4yj9646gyu.app.specular.dev";

// Supabase Edge Functions base URL
const SUPABASE_URL = "https://fdnurgfcocmgknbmpjtd.supabase.co";
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

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

/** Get the current Supabase session access token for edge function auth */
export const getSupabaseAccessToken = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch (error) {
    console.error("[API] Error retrieving Supabase access token:", error);
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

// ---------------------------------------------------------------------------
// Supabase Edge Function helpers
// These use the Supabase session JWT (not the Specular bearer token)
// ---------------------------------------------------------------------------

const edgeFunctionCall = async <T = any>(
  fnName: string,
  options?: RequestInit
): Promise<T> => {
  const url = `${SUPABASE_FUNCTIONS_URL}/${fnName}`;
  console.log("[Edge] Calling:", url, options?.method || "GET");

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Edge] Error response:", response.status, text);
    throw new Error(`Edge function error: ${response.status} - ${text}`);
  }

  return response.json();
};

const authenticatedEdgeCall = async <T = any>(
  fnName: string,
  options?: RequestInit
): Promise<T> => {
  const token = await getSupabaseAccessToken();
  if (!token) {
    throw new Error("Not authenticated. Please sign in.");
  }
  return edgeFunctionCall<T>(fnName, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * POST /functions/v1/compare
 * Analyze a face image with Gemini and return celebrity lookalikes.
 */
export const compareface = (image_base64: string) =>
  edgeFunctionCall<{ matches: { name: string; similarity: number; description: string }[] }>(
    "compare",
    { method: "POST", body: JSON.stringify({ image_base64 }) }
  );

/**
 * GET /functions/v1/comparisons
 * Fetch the authenticated user's comparison history.
 */
export const getComparisons = () =>
  authenticatedEdgeCall<{ comparisons: any[] }>("comparisons", { method: "GET" });

/**
 * POST /functions/v1/comparisons
 * Save a comparison result for the authenticated user.
 */
export const saveComparison = (data: { image_url?: string; result?: any }) =>
  authenticatedEdgeCall<{ comparison: any }>("comparisons", {
    method: "POST",
    body: JSON.stringify(data),
  });

/**
 * DELETE /functions/v1/comparisons/:id
 * Delete a comparison (ownership enforced server-side).
 */
export const deleteComparison = (id: string) =>
  authenticatedEdgeCall<{ success: boolean }>(`comparisons/${id}`, {
    method: "DELETE",
  });
