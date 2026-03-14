
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { BEARER_TOKEN_KEY } from "@/lib/auth";

export const BACKEND_URL =
  Constants.expoConfig?.extra?.backendUrl ||
  "https://3az2ndteth9e6e3ftqke6u4yj9646gyu.app.specular.dev";

// Supabase Edge Functions base URL
const SUPABASE_URL = "https://fdnurgfcocmgknbmpjtd.supabase.co";
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// Supabase anon key — used as Bearer token for edge function calls
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkbnVyZ2Zjb2NtZ2tuYm1wanRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTE5ODgsImV4cCI6MjA4NzM2Nzk4OH0.D1IbWjRau2GFOcHVBC6cJ80LxvRgct7X2r0BRA1Gr20";

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

// ---------------------------------------------------------------------------
// Supabase Edge Function helpers
// Uses the Supabase anon key as Bearer token — works without Supabase auth.
// The edge functions identify the user via the Better Auth session cookie/header
// passed separately, or operate in anonymous mode.
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
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
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

/**
 * POST /functions/v1/compare
 * Analyze a face image and return celebrity lookalikes.
 * Sends { image_base64: string } with the Supabase anon key.
 */
export const compareFace = (image_base64: string) => {
  console.log("[Edge] Calling compare edge function with base64 image");
  return edgeFunctionCall<{
    matches?: { name: string; similarity: number; description: string }[];
    winner?: number;
    winnerSimilarity?: number;
    loserSimilarity?: number;
    reasons?: { feature: string; description: string; similarity?: number }[];
    summary?: string;
  }>("compare", { method: "POST", body: JSON.stringify({ image_base64 }) });
};

/**
 * GET /functions/v1/comparisons
 * Fetch the user's comparison history.
 */
export const getComparisons = () => {
  console.log("[Edge] Fetching comparison history");
  return edgeFunctionCall<{ comparisons: any[] }>("comparisons", {
    method: "GET",
  });
};

/**
 * DELETE /functions/v1/comparisons/:id
 * Delete a comparison.
 */
export const deleteComparison = (id: string) => {
  console.log("[Edge] Deleting comparison:", id);
  return edgeFunctionCall<{ success: boolean }>(`comparisons/${id}`, {
    method: "DELETE",
  });
};
