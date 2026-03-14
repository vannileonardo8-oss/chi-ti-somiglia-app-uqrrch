// Auth helpers — Supabase Auth (replaces Better Auth)
// This file is kept for backward-compat imports from utils/api.ts and other files.

export { supabase } from "@/lib/supabase";

// No-op token helpers — Supabase manages its own session storage internally.
export async function setBearerToken(_token: string): Promise<void> {}
export async function clearAuthTokens(): Promise<void> {}

// Kept so any stale import of BEARER_TOKEN_KEY doesn't break compilation.
export const BEARER_TOKEN_KEY = "supabase_session";
