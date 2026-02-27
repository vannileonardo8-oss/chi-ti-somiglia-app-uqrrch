
# 🔧 Istruzioni per Configurare Supabase

## ⚠️ IMPORTANTE: Devi completare questi passaggi nella Dashboard di Supabase

### 1️⃣ Configurare le Policy RLS per Storage (OBBLIGATORIO)

Il caricamento delle immagini fallisce perché mancano le policy di sicurezza. Segui questi passaggi:

1. Vai su **Supabase Dashboard** → https://supabase.com/dashboard/project/fdnurgfcocmgknbmpjtd
2. Clicca su **Storage** nel menu laterale
3. Clicca sul bucket **comparison-images**
4. Clicca sulla tab **Policies**
5. Clicca su **New Policy**

#### Policy 1: Permettere Upload (INSERT)
- **Policy name**: `Users can upload images to their own folder`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
```sql
bucket_id = 'comparison-images' 
AND (storage.foldername(name))[1] = auth.uid()::text
```

#### Policy 2: Permettere Visualizzazione (SELECT)
- **Policy name**: `Users can view their own images`
- **Allowed operation**: `SELECT`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'comparison-images' 
AND (storage.foldername(name))[1] = auth.uid()::text
```

#### Policy 3: Permettere Aggiornamento (UPDATE)
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

#### Policy 4: Permettere Eliminazione (DELETE)
- **Policy name**: `Users can delete their own images`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'comparison-images' 
AND (storage.foldername(name))[1] = auth.uid()::text
```

---

### 2️⃣ Configurare Google OAuth (per risolvere errore 403)

#### A. Nella Dashboard di Supabase:

1. Vai su **Authentication** → **Providers**
2. Trova **Google** e clicca su **Enable**
3. Inserisci:
   - **Client ID**: (dal Google Cloud Console)
   - **Client Secret**: (dal Google Cloud Console)
4. Copia il **Redirect URL** mostrato (sarà simile a `https://fdnurgfcocmgknbmpjtd.supabase.co/auth/v1/callback`)
5. Clicca **Save**

#### B. Nel Google Cloud Console:

1. Vai su https://console.cloud.google.com/
2. Seleziona il tuo progetto
3. Vai su **APIs & Services** → **Credentials**
4. Trova il tuo **OAuth 2.0 Client ID** (tipo Web application)
5. Clicca per modificarlo
6. In **Authorized redirect URIs**, aggiungi:
   - `https://fdnurgfcocmgknbmpjtd.supabase.co/auth/v1/callback`
   - `chitisomiglia://auth-callback` (per mobile)
7. Clicca **Save**

#### C. Rimuovere la Modalità Test (se applicabile):

1. Nel Google Cloud Console, vai su **OAuth consent screen**
2. Se lo stato è **Testing**, clicca su **PUBLISH APP**
3. Oppure, se vuoi mantenerlo in Testing, aggiungi la tua email come **Test user**

---

### 3️⃣ Verificare la Configurazione

Dopo aver completato i passaggi sopra:

1. **Riavvia l'app** (chiudi e riapri)
2. Prova ad accedere con Google → dovrebbe funzionare senza errore 403
3. Prova a caricare una foto → dovrebbe funzionare senza errore RLS

---

## 🐛 Risoluzione Problemi

### Errore: "new row violates row-level security policy"
→ Le policy RLS non sono configurate. Segui il **Passo 1** sopra.

### Errore: "403 - That's an error. We're sorry, but you do not have access to this page"
→ Google OAuth non è configurato correttamente. Segui il **Passo 2** sopra.

### Errore: "Unsupported provider: provider is not enabled"
→ Il provider Google non è abilitato in Supabase. Vai su Authentication → Providers → Google → Enable.

### Errore: "Unsupported provider: missing OAuth secret"
→ Client ID o Client Secret non sono configurati in Supabase. Segui il **Passo 2A** sopra.

---

## ✅ Checklist Finale

- [ ] Policy RLS per INSERT create
- [ ] Policy RLS per SELECT create
- [ ] Policy RLS per UPDATE create
- [ ] Policy RLS per DELETE create
- [ ] Google Provider abilitato in Supabase
- [ ] Client ID e Client Secret configurati in Supabase
- [ ] Redirect URI aggiunto in Google Cloud Console
- [ ] App pubblicata o email aggiunta come Test User in Google Cloud Console

Una volta completati tutti questi passaggi, l'app dovrebbe funzionare correttamente! 🎉
