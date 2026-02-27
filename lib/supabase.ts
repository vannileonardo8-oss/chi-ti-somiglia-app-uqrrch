
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://fdnurgfcocmgknbmpjtd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkbnVyZ2Zjb2NtZ2tuYm1wanRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTE5ODgsImV4cCI6MjA4NzM2Nzk4OH0.D1IbWjRau2GFOcHVBC6cJ80LxvRgct7X2r0BRA1Gr20';

// Helper to get Supabase user ID
export async function getSupabaseUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (error) {
    console.error('[Supabase] Error getting user ID:', error);
    return null;
  }
}

// Custom storage for Supabase auth tokens
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Enable for web OAuth callbacks
    flowType: 'pkce', // Use PKCE flow for better security
  },
});

// Helper to upload image to Supabase Storage
export async function uploadImageToSupabase(
  uri: string,
  userId: string,
  filename?: string
): Promise<{ url: string; path: string }> {
  try {
    console.log('[Supabase] Uploading image:', uri);
    console.log('[Supabase] User ID:', userId);

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
    const finalFilename = filename || `${timestamp}_${randomId}.${extension}`;
    const storagePath = `${userId}/${finalFilename}`;

    console.log('[Supabase] Storage path:', storagePath);

    // Fetch the image as blob
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('[Supabase] Blob size:', blob.size, 'bytes');
    console.log('[Supabase] Blob type:', blob.type);

    // Verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Non autenticato. Effettua nuovamente l\'accesso.');
    }
    console.log('[Supabase] User authenticated:', session.user.id);

    // Upload to Supabase Storage with explicit headers
    const { data, error } = await supabase.storage
      .from('comparison-images')
      .upload(storagePath, blob, {
        contentType: blob.type || 'image/jpeg',
        upsert: false,
        cacheControl: '3600',
      });

    if (error) {
      console.error('[Supabase] Upload error details:', {
        message: error.message,
        name: error.name,
        status: (error as any).status,
        statusCode: (error as any).statusCode,
      });
      
      // Provide user-friendly error messages
      if (error.message.includes('row-level security') || error.message.includes('policy')) {
        throw new Error(
          'Errore di permessi. Le policy di sicurezza del bucket non sono configurate correttamente.\n\n' +
          'Vai su Supabase Dashboard > Storage > comparison-images > Policies e aggiungi le policy per INSERT, SELECT, UPDATE, DELETE.'
        );
      }
      
      if (error.message.includes('Bucket not found')) {
        throw new Error('Il bucket "comparison-images" non esiste. Crealo nella dashboard di Supabase.');
      }
      
      throw new Error(`Errore durante il caricamento: ${error.message}`);
    }

    console.log('[Supabase] Upload successful:', data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('comparison-images')
      .getPublicUrl(storagePath);

    console.log('[Supabase] Public URL:', urlData.publicUrl);

    return {
      url: urlData.publicUrl,
      path: storagePath,
    };
  } catch (error: any) {
    console.error('[Supabase] Failed to upload image:', error);
    throw error;
  }
}

// Helper to delete image from Supabase Storage
export async function deleteImageFromSupabase(path: string): Promise<void> {
  try {
    console.log('[Supabase] Deleting image:', path);

    const { error } = await supabase.storage
      .from('comparison-images')
      .remove([path]);

    if (error) {
      console.error('[Supabase] Delete error:', error);
      throw error;
    }

    console.log('[Supabase] Image deleted successfully');
  } catch (error) {
    console.error('[Supabase] Failed to delete image:', error);
    throw error;
  }
}

// Helper to save comparison result to Supabase
export async function saveComparisonToSupabase(comparison: {
  userId: string;
  mainImageUrl: string;
  mainImageLabel: string;
  compareImage1Url: string;
  compareImage1Label: string;
  compareImage2Url: string;
  compareImage2Label: string;
  winner: 1 | 2;
  analysisResult: any;
}): Promise<string> {
  try {
    console.log('[Supabase] Saving comparison to database');

    const { data, error } = await supabase
      .from('app_comparisons')
      .insert({
        user_id: comparison.userId,
        main_image_url: comparison.mainImageUrl,
        main_image_label: comparison.mainImageLabel,
        compare_image_1_url: comparison.compareImage1Url,
        compare_image_1_label: comparison.compareImage1Label,
        compare_image_2_url: comparison.compareImage2Url,
        compare_image_2_label: comparison.compareImage2Label,
        winner_image: comparison.winner,
        analysis_result: comparison.analysisResult,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Supabase] Save comparison error:', error);
      throw new Error(`Errore durante il salvataggio: ${error.message}`);
    }

    console.log('[Supabase] Comparison saved with ID:', data.id);
    return data.id;
  } catch (error) {
    console.error('[Supabase] Failed to save comparison:', error);
    throw error;
  }
}

// Helper to fetch user's comparison history from Supabase
export async function fetchComparisonHistory(userId: string): Promise<any[]> {
  try {
    console.log('[Supabase] Fetching comparison history for user:', userId);

    const { data, error } = await supabase
      .from('app_comparisons')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Fetch history error:', error);
      throw new Error(`Errore durante il caricamento dello storico: ${error.message}`);
    }

    console.log('[Supabase] Fetched', data?.length || 0, 'comparisons');
    return data || [];
  } catch (error) {
    console.error('[Supabase] Failed to fetch history:', error);
    throw error;
  }
}

// Helper to fetch a single comparison by ID
export async function fetchComparisonById(
  comparisonId: string,
  userId: string
): Promise<any> {
  try {
    console.log('[Supabase] Fetching comparison:', comparisonId);

    const { data, error } = await supabase
      .from('app_comparisons')
      .select('*')
      .eq('id', comparisonId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[Supabase] Fetch comparison error:', error);
      throw new Error(`Errore durante il caricamento del risultato: ${error.message}`);
    }

    console.log('[Supabase] Fetched comparison');
    return data;
  } catch (error) {
    console.error('[Supabase] Failed to fetch comparison:', error);
    throw error;
  }
}

// Helper to delete comparison from Supabase
export async function deleteComparisonFromSupabase(
  comparisonId: string,
  userId: string
): Promise<void> {
  try {
    console.log('[Supabase] Deleting comparison:', comparisonId);

    // Delete from database (RLS will ensure user owns it)
    const { error } = await supabase
      .from('app_comparisons')
      .delete()
      .eq('id', comparisonId)
      .eq('user_id', userId);

    if (error) {
      console.error('[Supabase] Delete comparison error:', error);
      throw new Error(`Errore durante l'eliminazione: ${error.message}`);
    }

    console.log('[Supabase] Comparison deleted successfully');
  } catch (error) {
    console.error('[Supabase] Failed to delete comparison:', error);
    throw error;
  }
}
