import { supabase } from "@/lib/supabase";

// Supabase Edge Functions base URL
const SUPABASE_URL = "https://fdnurgfcocmgknbmpjtd.supabase.co";
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// Supabase anon key — fallback when no user session is present
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkbnVyZ2Zjb2NtZ2tuYm1wanRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTE5ODgsImV4cCI6MjA4NzM2Nzk4OH0.D1IbWjRau2GFOcHVBC6cJ80LxvRgct7X2r0BRA1Gr20";

/**
 * Returns the current Supabase session access token, or falls back to the
 * anon key so unauthenticated edge-function calls still work.
 */
async function getAuthToken(): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }
  } catch (err) {
    console.warn("[API] Could not retrieve session token:", err);
  }
  return SUPABASE_ANON_KEY;
}

// ---------------------------------------------------------------------------
// Generic edge-function caller
// ---------------------------------------------------------------------------

const edgeFunctionCall = async <T = unknown>(
  fnName: string,
  options?: RequestInit
): Promise<T> => {
  const token = await getAuthToken();
  const url = `${SUPABASE_FUNCTIONS_URL}/${fnName}`;
  console.log("[Edge] Calling:", url, options?.method ?? "GET");

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Edge] Error response:", response.status, text);
    throw new Error(`Edge function error: ${response.status} - ${text}`);
  }

  return response.json() as Promise<T>;
};

// ---------------------------------------------------------------------------
// App-specific edge-function wrappers
// ---------------------------------------------------------------------------

/**
 * POST /functions/v1/compare
 * Compare a main photo against two comparison photos.
 * Returns which comparison photo looks more like the main photo.
 */
export const comparePhotos = (
  main_image: string,
  comparison_image_1: string,
  comparison_image_2: string
) => {
  console.log("[Edge] Calling compare edge function with 3 images");
  return edgeFunctionCall<{
    winner: number;
    similarity_1: number;
    similarity_2: number;
    explanation: string;
  }>("compare", {
    method: "POST",
    body: JSON.stringify({ main_image, comparison_image_1, comparison_image_2 }),
  });
};

/**
 * POST /functions/v1/comparisons
 * Save a comparison result to history.
 */
export const saveComparison = (data: {
  winner: number;
  similarity_1: number;
  similarity_2: number;
  explanation: string;
}) => {
  console.log("[Edge] Saving comparison result to history");
  return edgeFunctionCall<{ id: string }>("comparisons", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * @deprecated Use comparePhotos instead.
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
 * Fetch the authenticated user's comparison history.
 */
export const getComparisons = () => {
  console.log("[Edge] Fetching comparison history");
  return edgeFunctionCall<{ comparisons: unknown[] }>("comparisons", {
    method: "GET",
  });
};

/**
 * DELETE /functions/v1/comparisons/:id
 * Delete a comparison by ID.
 */
export const deleteComparison = (id: string) => {
  console.log("[Edge] Deleting comparison:", id);
  return edgeFunctionCall<{ success: boolean }>(`comparisons/${id}`, {
    method: "DELETE",
  });
};

// ---------------------------------------------------------------------------
// Generic REST helpers (kept for any screens that import them)
// ---------------------------------------------------------------------------

export const apiGet = <T = unknown>(url: string): Promise<T> =>
  edgeFunctionCall<T>(url, { method: "GET" });

export const apiPost = <T = unknown>(url: string, data: unknown): Promise<T> =>
  edgeFunctionCall<T>(url, { method: "POST", body: JSON.stringify(data) });

export const authenticatedGet = apiGet;
export const authenticatedPost = apiPost;

export const authenticatedPut = <T = unknown>(url: string, data: unknown): Promise<T> =>
  edgeFunctionCall<T>(url, { method: "PUT", body: JSON.stringify(data) });

export const authenticatedPatch = <T = unknown>(url: string, data: unknown): Promise<T> =>
  edgeFunctionCall<T>(url, { method: "PATCH", body: JSON.stringify(data) });

export const authenticatedDelete = <T = unknown>(url: string, data: unknown = {}): Promise<T> =>
  edgeFunctionCall<T>(url, { method: "DELETE", body: JSON.stringify(data) });
