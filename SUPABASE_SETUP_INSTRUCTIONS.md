
# 🔧 Guida Completa: Configurazione Google OAuth per "Chi ti somiglia?"

## 🚨 ERRORE 403 - SOLUZIONE COMPLETA

Se ricevi l'errore **"403. That's an error. We're sorry, but you do not have access to this page"** quando clicchi su "Continua con Google", segui TUTTI i passaggi qui sotto.

---

## 📋 CHECKLIST RAPIDA

Prima di iniziare, assicurati di avere:
- [ ] Accesso alla **Supabase Dashboard** (https://supabase.com/dashboard/project/fdnurgfcocmgknbmpjtd)
- [ ] Accesso alla **Google Cloud Console** (https://console.cloud.google.com/)
- [ ] Il progetto Google Cloud già creato

---

## 1️⃣ CONFIGURAZIONE GOOGLE CLOUD CONSOLE (OBBLIGATORIO)

### Passo 1.1: Creare/Verificare le Credenziali OAuth

1. Vai su **Google Cloud Console**: https://console.cloud.google.com/
2. Seleziona il tuo progetto (o creane uno nuovo)
3. Nel menu laterale, vai su **APIs & Services** → **Credentials**
4. Se NON hai ancora un OAuth 2.0 Client ID:
   - Clicca su **+ CREATE CREDENTIALS** → **OAuth client ID**
   - Tipo applicazione: **Web application**
   - Nome: `Chi ti somiglia - Web`
5. Se hai già un OAuth Client ID, clicca su di esso per modificarlo

### Passo 1.2: Configurare i Redirect URI (CRITICO)

Nella sezione **Authorized redirect URIs**, aggiungi ESATTAMENTE questi due URI:

```
https://fdnurgfcocmgknbmpjtd.supabase.co/auth/v1/callback
```

```
chitisomiglia://auth-callback
```

**⚠️ IMPORTANTE:**
- Copia e incolla esattamente come scritto sopra
- NON aggiungere spazi o caratteri extra
- Il primo URI è per il web
- Il secondo URI è per l'app mobile

Clicca **SAVE** per salvare le modifiche.

### Passo 1.3: Configurare OAuth Consent Screen

1. Nel menu laterale, vai su **APIs & Services** → **OAuth consent screen**
2. Verifica lo stato dell'app:

#### OPZIONE A: Pubblicare l'App (CONSIGLIATO)
- Se lo stato è **Testing**, clicca su **PUBLISH APP**
- Conferma la pubblicazione
- Questo permette a CHIUNQUE di accedere con Google

#### OPZIONE B: Aggiungere Test Users (ALTERNATIVA)
- Se vuoi mantenere l'app in modalità **Testing**:
  1. Scorri fino alla sezione **Test users**
  2. Clicca su **+ ADD USERS**
  3. Aggiungi la TUA email (quella che usi per accedere)
  4. Clicca **SAVE**
- **NOTA:** Solo gli utenti aggiunti qui potranno accedere

### Passo 1.4: Copiare Client ID e Client Secret

1. Torna su **Credentials**
2. Clicca sul tuo OAuth 2.0 Client ID
3. Copia il **Client ID** (inizia con qualcosa come `123456789-abc...apps.googleusercontent.com`)
4. Copia il **Client Secret** (una stringa alfanumerica)

**⚠️ TIENI QUESTI VALORI A PORTATA DI MANO - TI SERVIRANNO NEL PROSSIMO PASSO**

---

## 2️⃣ CONFIGURAZIONE SUPABASE DASHBOARD (OBBLIGATORIO)

### Passo 2.1: Abilitare Google Provider

1. Vai su **Supabase Dashboard**: https://supabase.com/dashboard/project/fdnurgfcocmgknbmpjtd
2. Nel menu laterale, clicca su **Authentication**
3. Clicca sulla tab **Providers**
4. Scorri fino a trovare **Google**
5. Clicca sull'interruttore per **abilitare** Google (deve diventare verde)

### Passo 2.2: Inserire Client ID e Client Secret

1. Nella sezione Google (ora espansa), vedrai due campi:
   - **Client ID (for OAuth)**
   - **Client Secret (for OAuth)**
2. Incolla il **Client ID** copiato dal Google Cloud Console
3. Incolla il **Client Secret** copiato dal Google Cloud Console
4. Clicca **SAVE** in fondo alla pagina

### Passo 2.3: Verificare il Callback URL

1. Nella stessa sezione Google, dovresti vedere un campo **Callback URL (for OAuth)**
2. Verifica che sia: `https://fdnurgfcocmgknbmpjtd.supabase.co/auth/v1/callback`
3. Questo URL DEVE corrispondere a quello che hai inserito in Google Cloud Console

---

## 3️⃣ CONFIGURAZIONE STORAGE RLS (per caricare foto)

### Passo 3.1: Creare le Policy per il Bucket

1. Nella **Supabase Dashboard**, clicca su **Storage** nel menu laterale
2. Clicca sul bucket **comparison-images**
3. Clicca sulla tab **Policies**
4. Clicca su **New Policy** per creare 4 policy:

#### Policy 1: INSERT (Upload)
- **Policy name**: `Users can upload images to their own folder`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
```sql
bucket_id = 'comparison-images' 
AND (storage.foldername(name))[1] = auth.uid()::text
```
- Clicca **Review** → **Save policy**

#### Policy 2: SELECT (View)
- **Policy name**: `Users can view their own images`
- **Allowed operation**: `SELECT`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'comparison-images' 
AND (storage.foldername(name))[1] = auth.uid()::text
```
- Clicca **Review** → **Save policy**

#### Policy 3: UPDATE (Modify)
- **Policy name**: `Users can update their own images`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'comparison-images' 
AND (storage.foldername(name))[1] = auth.uid()::text
```
- **WITH CHECK expression**:
```sql
bucket_id = 'comparison-images' 
AND (storage.foldername(name))[1] = auth.uid()::text
```
- Clicca **Review** → **Save policy**

#### Policy 4: DELETE (Remove)
- **Policy name**: `Users can delete their own images`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'comparison-images' 
AND (storage.foldername(name))[1] = auth.uid()::text
```
- Clicca **Review** → **Save policy**

---

## 4️⃣ VERIFICA FINALE

### Test 1: Accesso con Google
1. **Chiudi completamente l'app** (non solo minimizzarla)
2. **Riapri l'app**
3. Clicca su **"Continua con Google"**
4. Dovresti vedere la schermata di selezione account Google
5. Seleziona il tuo account
6. Se tutto è configurato correttamente, verrai reindirizzato all'app

### Test 2: Caricamento Foto
1. Dopo aver effettuato l'accesso, prova a caricare una foto
2. Se le policy RLS sono configurate correttamente, il caricamento dovrebbe funzionare

---

## 🐛 RISOLUZIONE PROBLEMI

### ❌ Errore: "403 - That's an error"
**Causa:** Configurazione Google OAuth incompleta

**Soluzioni:**
1. Verifica che i Redirect URI in Google Cloud Console siano ESATTAMENTE:
   - `https://fdnurgfcocmgknbmpjtd.supabase.co/auth/v1/callback`
   - `chitisomiglia://auth-callback`
2. Verifica che l'app sia pubblicata O che la tua email sia aggiunta come Test User
3. Verifica che Client ID e Client Secret siano inseriti correttamente in Supabase

### ❌ Errore: "Unsupported provider: provider is not enabled"
**Causa:** Google provider non abilitato in Supabase

**Soluzione:**
1. Vai su Supabase Dashboard → Authentication → Providers
2. Trova Google e clicca sull'interruttore per abilitarlo (deve essere verde)
3. Clicca Save

### ❌ Errore: "missing OAuth secret"
**Causa:** Client ID o Client Secret non configurati in Supabase

**Soluzione:**
1. Vai su Supabase Dashboard → Authentication → Providers → Google
2. Inserisci Client ID e Client Secret copiati da Google Cloud Console
3. Clicca Save

### ❌ Errore: "new row violates row-level security policy"
**Causa:** Policy RLS per Storage non configurate

**Soluzione:**
1. Segui il **Passo 3** sopra per creare tutte e 4 le policy
2. Assicurati che ogni policy sia salvata correttamente

### ❌ Errore: "Bucket not found"
**Causa:** Il bucket "comparison-images" non esiste

**Soluzione:**
1. Vai su Supabase Dashboard → Storage
2. Clicca su **New bucket**
3. Nome: `comparison-images`
4. Public bucket: **NO** (lascia disabilitato)
5. Clicca **Create bucket**
6. Poi segui il **Passo 3** per creare le policy

---

## ✅ CHECKLIST FINALE

Prima di testare l'app, verifica che TUTTI questi punti siano completati:

### Google Cloud Console:
- [ ] OAuth 2.0 Client ID creato
- [ ] Redirect URI `https://fdnurgfcocmgknbmpjtd.supabase.co/auth/v1/callback` aggiunto
- [ ] Redirect URI `chitisomiglia://auth-callback` aggiunto
- [ ] App pubblicata OPPURE email aggiunta come Test User
- [ ] Client ID e Client Secret copiati

### Supabase Dashboard:
- [ ] Google provider abilitato (interruttore verde)
- [ ] Client ID inserito
- [ ] Client Secret inserito
- [ ] Modifiche salvate (pulsante Save cliccato)
- [ ] Bucket "comparison-images" esiste
- [ ] Policy INSERT creata e salvata
- [ ] Policy SELECT creata e salvata
- [ ] Policy UPDATE creata e salvata
- [ ] Policy DELETE creata e salvata

### Test:
- [ ] App chiusa e riaperta
- [ ] Accesso con Google funziona (nessun errore 403)
- [ ] Caricamento foto funziona (nessun errore RLS)

---

## 📞 SUPPORTO

Se dopo aver seguito TUTTI i passaggi sopra continui ad avere problemi:

1. Verifica i log dell'app (dovrebbero mostrare messaggi di errore dettagliati)
2. Controlla che non ci siano errori di battitura nei Redirect URI
3. Assicurati di aver cliccato **SAVE** in ogni sezione modificata
4. Prova a disabilitare e riabilitare il Google provider in Supabase
5. Aspetta 1-2 minuti dopo aver salvato le modifiche (a volte ci vuole un po' per propagarsi)

---

## 🎉 CONFIGURAZIONE COMPLETATA!

Una volta completati tutti i passaggi, l'app dovrebbe funzionare perfettamente:
- ✅ Accesso con Google senza errori 403
- ✅ Caricamento foto senza errori RLS
- ✅ Salvataggio e visualizzazione confronti

Buon divertimento con "Chi ti somiglia?"! 🤔👥✨
</write file>

Ora aggiornerò i messaggi di errore nell'app per fornire indicazioni più chiare:

<write file="contexts/AuthContext.tsx">
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { authClient, setBearerToken, clearAuthTokens } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function openOAuthPopup(provider: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popupUrl = `${window.location.origin}/auth-popup?provider=${provider}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    console.log(`[OAuth] Opening popup for ${provider}:`, popupUrl);

    const popup = window.open(
      popupUrl,
      "oauth-popup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      console.error("[OAuth] Failed to open popup - popups may be blocked");
      reject(new Error("Failed to open popup. Please allow popups for this site."));
      return;
    }

    let messageReceived = false;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      
      console.log("[OAuth] Received message:", event.data);
      
      if (event.data?.type === "oauth-success") {
        messageReceived = true;
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        console.log("[OAuth] Success - token/session received");
        resolve(event.data.token || "cookie-auth");
      } else if (event.data?.type === "oauth-error") {
        messageReceived = true;
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        console.error("[OAuth] Error received:", event.data.error);
        reject(new Error(event.data.error || "OAuth failed"));
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handleMessage);
          if (!messageReceived) {
            console.warn("[OAuth] Popup closed without receiving message");
            reject(new Error("Authentication cancelled"));
          }
        }
      } catch (e) {
        // Ignore cross-origin errors
      }
    }, 500);

    setTimeout(() => {
      if (!messageReceived) {
        console.error("[OAuth] Timeout - no response after 3 minutes");
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        try { popup.close(); } catch (e) {}
        reject(new Error("Authentication timeout"));
      }
    }, 180000);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AuthContext] Initializing - fetching user");
    fetchUser();

    // Listen for deep links
    const subscription = Linking.addEventListener("url", (event) => {
      console.log("[AuthContext] Deep link received:", event.url);
      
      const url = event.url;
      if (url.includes("auth-callback")) {
        console.log("[AuthContext] Auth callback detected, will be handled by auth-callback screen");
      }
    });

    // Listen for Supabase auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthContext] Supabase auth state changed:", event);
      
      if (event === 'SIGNED_IN' && session) {
        console.log("[AuthContext] User signed in via Supabase");
        // Sync with Better Auth if needed
        await fetchUser();
      } else if (event === 'SIGNED_OUT') {
        console.log("[AuthContext] User signed out via Supabase");
        setUser(null);
      }
    });

    // Auto-refresh session every 5 minutes
    const intervalId = setInterval(() => {
      console.log("[AuthContext] Auto-refreshing user session...");
      fetchUser();
    }, 5 * 60 * 1000);

    return () => {
      subscription.remove();
      authListener.subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      console.log("[AuthContext] Fetching user session...");
      
      // Try Supabase first (primary auth for this app)
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      
      if (supabaseSession?.user) {
        console.log("[AuthContext] User found via Supabase:", supabaseSession.user.email);
        setUser({
          id: supabaseSession.user.id,
          email: supabaseSession.user.email || '',
          name: supabaseSession.user.user_metadata?.name || supabaseSession.user.user_metadata?.full_name,
          image: supabaseSession.user.user_metadata?.avatar_url,
        });
        
        // Sync Better Auth token for backend API calls
        // Use Supabase access token as bearer token for backend
        if (supabaseSession.access_token) {
          await setBearerToken(supabaseSession.access_token);
          console.log("[AuthContext] Supabase access token synced as bearer token");
        }
        
        return;
      }
      
      // Fallback to Better Auth
      const session = await authClient.getSession();
      console.log("[AuthContext] Better Auth session response:", session);
      
      if (session?.data?.user) {
        console.log("[AuthContext] User found via Better Auth:", session.data.user.email);
        setUser(session.data.user as User);
        
        // Sync token
        if (session.data.session?.token) {
          await setBearerToken(session.data.session.token);
          console.log("[AuthContext] Bearer token synced");
        }
      } else {
        console.log("[AuthContext] No user session found");
        setUser(null);
        await clearAuthTokens();
      }
    } catch (error) {
      console.error("[AuthContext] Failed to fetch user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log("[AuthContext] Signing in with email:", email);
      
      // Sign in with Supabase FIRST (for storage and database access)
      const { data: supabaseData, error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (supabaseError) {
        console.error("[AuthContext] Supabase sign in failed:", supabaseError);
        throw new Error("Credenziali non valide. Verifica email e password.");
      }
      
      console.log("[AuthContext] Supabase sign in successful");
      
      // Sync Supabase access token as bearer token for backend API
      if (supabaseData.session?.access_token) {
        await setBearerToken(supabaseData.session.access_token);
        console.log("[AuthContext] Supabase access token set as bearer token");
      }
      
      // Then sign in with Better Auth (for backend API access)
      try {
        await authClient.signIn.email({ email, password });
        console.log("[AuthContext] Better Auth sign in successful");
      } catch (betterAuthError) {
        console.warn("[AuthContext] Better Auth sign in warning:", betterAuthError);
        // Don't throw - Supabase is primary for this app
      }
      
      await fetchUser();
    } catch (error) {
      console.error("[AuthContext] Email sign in failed:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      console.log("[AuthContext] Signing up with email:", email);
      
      // Sign up with Supabase FIRST (for storage and database access)
      const { data: supabaseData, error: supabaseError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || '',
          },
        },
      });
      
      if (supabaseError) {
        console.error("[AuthContext] Supabase sign up failed:", supabaseError);
        throw new Error("Registrazione fallita. L'email potrebbe essere già in uso.");
      }
      
      console.log("[AuthContext] Supabase sign up successful");
      
      // Sync Supabase access token as bearer token for backend API
      if (supabaseData.session?.access_token) {
        await setBearerToken(supabaseData.session.access_token);
        console.log("[AuthContext] Supabase access token set as bearer token");
      }
      
      // Then sign up with Better Auth (for backend API access)
      try {
        await authClient.signUp.email({
          email,
          password,
          name,
        });
        console.log("[AuthContext] Better Auth sign up successful");
      } catch (betterAuthError) {
        console.warn("[AuthContext] Better Auth sign up warning:", betterAuthError);
        // Don't throw - Supabase is primary for this app
      }
      
      await fetchUser();
    } catch (error) {
      console.error("[AuthContext] Email sign up failed:", error);
      throw error;
      }
  };

  const signInWithSocial = async (provider: "google" | "apple" | "github") => {
    try {
      console.log(`[AuthContext] Starting ${provider} sign in (platform: ${Platform.OS})`);
      
      // Determine the correct redirect URI based on platform
      const redirectTo = Platform.OS === "web" 
        ? `${window.location.origin}/auth-callback`
        : "chitisomiglia://auth-callback";
      
      console.log(`[AuthContext] Using redirect URI: ${redirectTo}`);
      
      // Use Supabase OAuth for social sign-in (it handles storage/database access automatically)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: redirectTo,
          skipBrowserRedirect: Platform.OS !== "web",
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error(`[AuthContext] Supabase OAuth error:`, error);
        
        // Provide detailed, user-friendly error messages
        if (error.message.includes("missing OAuth secret") || error.message.includes("Client secret")) {
          const providerName = provider === "google" ? "Google" : provider === "apple" ? "Apple" : "GitHub";
          throw new Error(
            `❌ CONFIGURAZIONE INCOMPLETA\n\n` +
            `Il provider ${providerName} non è configurato correttamente.\n\n` +
            `📋 COSA FARE:\n\n` +
            `1. Apri Google Cloud Console\n` +
            `2. Copia Client ID e Client Secret\n` +
            `3. Vai su Supabase Dashboard\n` +
            `4. Authentication > Providers > ${providerName}\n` +
            `5. Incolla Client ID e Client Secret\n` +
            `6. Clicca SAVE\n\n` +
            `📖 Guida completa: Vedi SUPABASE_SETUP_INSTRUCTIONS.md`
          );
        }
        
        if (
          error.message.includes("not enabled") || 
          error.message.includes("not configured") ||
          error.message.includes("Unsupported provider") ||
          error.message.includes("provider is not enabled")
        ) {
          const providerName = provider === "google" ? "Google" : provider === "apple" ? "Apple" : "GitHub";
          throw new Error(
            `❌ PROVIDER NON ABILITATO\n\n` +
            `Il provider ${providerName} non è abilitato in Supabase.\n\n` +
            `📋 COSA FARE:\n\n` +
            `1. Vai su Supabase Dashboard\n` +
            `2. Authentication > Providers\n` +
            `3. Trova ${providerName}\n` +
            `4. Clicca sull'interruttore per abilitarlo (deve essere verde)\n` +
            `5. Inserisci Client ID e Client Secret\n` +
            `6. Clicca SAVE\n\n` +
            `📖 Guida completa: Vedi SUPABASE_SETUP_INSTRUCTIONS.md`
          );
        }
        
        if (error.message.includes("403") || error.message.includes("access denied") || error.message.toLowerCase().includes("access_denied")) {
          throw new Error(
            `❌ ERRORE 403 - ACCESSO NEGATO\n\n` +
            `Google ha rifiutato l'accesso. Questo succede quando:\n\n` +
            `1️⃣ L'app è in modalità TEST e la tua email non è autorizzata\n` +
            `2️⃣ I Redirect URI non sono configurati correttamente\n\n` +
            `📋 SOLUZIONE:\n\n` +
            `OPZIONE A - Pubblica l'app (CONSIGLIATO):\n` +
            `• Vai su Google Cloud Console\n` +
            `• OAuth consent screen\n` +
            `• Clicca PUBLISH APP\n\n` +
            `OPZIONE B - Aggiungi Test User:\n` +
            `• Vai su Google Cloud Console\n` +
            `• OAuth consent screen\n` +
            `• Test users > ADD USERS\n` +
            `• Aggiungi la tua email\n\n` +
            `VERIFICA REDIRECT URI:\n` +
            `• Google Cloud Console > Credentials\n` +
            `• OAuth 2.0 Client > Authorized redirect URIs\n` +
            `• Deve contenere:\n` +
            `  https://fdnurgfcocmgknbmpjtd.supabase.co/auth/v1/callback\n` +
            `  chitisomiglia://auth-callback\n\n` +
            `📖 Guida completa: Vedi SUPABASE_SETUP_INSTRUCTIONS.md`
          );
        }
        
        throw error;
      }

      if (Platform.OS === "web" && data?.url) {
        console.log(`[AuthContext] Redirecting to OAuth URL:`, data.url);
        window.location.href = data.url;
        return;
      }

      if (Platform.OS !== "web" && data?.url) {
        console.log(`[AuthContext] Opening OAuth URL in browser:`, data.url);
        // The URL will be opened by Supabase's auth system
        // The callback will be handled by auth-callback.tsx
      }
      
      console.log(`[AuthContext] OAuth initiated for ${provider}, waiting for callback...`);
    } catch (error: any) {
      console.error(`[AuthContext] ${provider} sign in failed:`, error);
      throw error;
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");
  const signInWithApple = () => signInWithSocial("apple");
  const signInWithGitHub = () => signInWithSocial("github");

  const signOut = async () => {
    try {
      console.log("[AuthContext] Signing out...");
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Sign out from Better Auth
      try {
        await authClient.signOut();
      } catch (error) {
        console.warn("[AuthContext] Better Auth sign out warning:", error);
      }
    } catch (error) {
      console.error("[AuthContext] Sign out failed (API):", error);
    } finally {
      console.log("[AuthContext] Clearing local auth state");
      setUser(null);
      await clearAuthTokens();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signInWithGitHub,
        signOut,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
