
# 🔧 Guida Completa: Configurazione "Chi ti somiglia?"

## 📋 PANORAMICA

Questa guida ti aiuterà a configurare:
1. **Google OAuth** - Per l'accesso con Google
2. **Supabase Storage RLS** - Per caricare e gestire le foto

---

## ⚠️ PROBLEMI COMUNI E SOLUZIONI

### 🚫 Errore 403 con Google OAuth
**Sintomo:** Quando clicchi "Continua con Google", vedi "403. That's an error. We're sorry, but you do not have access to this page."

**Causa:** Configurazione Google OAuth incompleta.

**Soluzione:** Segui la **Sezione 1** qui sotto.

---

### 🚫 Errore nel Rilevamento Volti
**Sintomo:** Dopo aver caricato una foto, vedi "Errore durante il rilevamento dei volti" o l'app si blocca durante il rilevamento.

**Causa:** Problema di connessione con il backend AI o immagine troppo grande.

**Soluzione:** 
1. **Verifica la connessione internet** - Il rilevamento volti richiede una connessione stabile
2. **Prova con una foto più piccola** - Foto molto grandi (>5MB) possono causare problemi
3. **Riprova dopo qualche secondo** - A volte il backend AI impiega un po' a rispondere
4. **Controlla i log dell'app** - Dovrebbero mostrare l'errore specifico
5. **Se il problema persiste**, l'app è stata aggiornata per gestire meglio gli errori di rete

---

### 🚫 Errore "new row violates row-level security policy"
**Sintomo:** Quando carichi una foto, vedi "Errore di permessi. Le policy di sicurezza del bucket non sono configurate correttamente."

**Causa:** Le policy RLS per Supabase Storage non sono configurate.

**Soluzione:** Segui la **Sezione 2** qui sotto.

---

### ℹ️ Nota sul Percorso OAuth Consent

**Domanda:** Supabase mostra "URL di autorizzazione dell'anteprima: http://localhost:3000/oauth/consent" - devo implementare questa schermata?

**Risposta:** **NO, non è necessario.** Questa app utilizza il flusso OAuth automatico di Supabase, che gestisce il consenso OAuth internamente. Il percorso `/oauth/consent` è stato creato come placeholder per evitare errori 404, ma **non viene mai utilizzato** durante il normale flusso di autenticazione.

**Come funziona l'OAuth in questa app:**
1. L'utente clicca "Continua con Google"
2. Supabase reindirizza automaticamente a Google per l'autenticazione
3. Google gestisce il consenso OAuth (schermata "Consenti accesso")
4. Google reindirizza a `/auth-callback` (NON a `/oauth/consent`)
5. L'app completa l'autenticazione

**Il percorso corretto per i redirect OAuth è:**
- **Web:** `https://fdnurgfcocmgknbmpjtd.supabase.co/auth/v1/callback`
- **Mobile:** `chitisomiglia://auth-callback`

---

## 1️⃣ CONFIGURAZIONE GOOGLE OAUTH

### Passo 1.1: Google Cloud Console - Creare Credenziali OAuth

1. Vai su **Google Cloud Console**: https://console.cloud.google.com/
2. Seleziona il tuo progetto (o creane uno nuovo se necessario)
3. Nel menu laterale sinistro, clicca su **APIs & Services** → **Credentials**
4. Se NON hai ancora un OAuth 2.0 Client ID:
   - Clicca sul pulsante **+ CREATE CREDENTIALS** in alto
   - Seleziona **OAuth client ID**
   - Tipo applicazione: **Web application**
   - Nome: `Chi ti somiglia - Web` (o un nome a tua scelta)
   - Clicca **CREATE**
5. Se hai già un OAuth Client ID, clicca sul nome per modificarlo

### Passo 1.2: Google Cloud Console - Configurare Redirect URI (CRITICO)

1. Nella pagina del tuo OAuth 2.0 Client ID, scorri fino a **Authorized redirect URIs**
2. Clicca su **+ ADD URI** e aggiungi ESATTAMENTE questi due URI (uno alla volta):

```
https://fdnurgfcocmgknbmpjtd.supabase.co/auth/v1/callback
```

```
chitisomiglia://auth-callback
```

**⚠️ IMPORTANTE:**
- Copia e incolla esattamente come scritto sopra (senza spazi o caratteri extra)
- Il primo URI è per il web (Supabase gestisce il redirect automaticamente)
- Il secondo URI è per l'app mobile (iOS/Android)
- **NON aggiungere** `/oauth/consent` - non è necessario per questa app
- Clicca **SAVE** dopo aver aggiunto entrambi

### Passo 1.3: Google Cloud Console - OAuth Consent Screen

1. Nel menu laterale, vai su **APIs & Services** → **OAuth consent screen**
2. Verifica lo stato dell'app (in alto):

#### OPZIONE A: Pubblicare l'App (CONSIGLIATO)
- Se lo stato è **Testing** o **In production**, e vuoi che CHIUNQUE possa accedere:
  1. Clicca sul pulsante **PUBLISH APP** (se disponibile)
  2. Conferma la pubblicazione
  3. Ora chiunque può accedere con Google

#### OPZIONE B: Aggiungere Test Users (ALTERNATIVA)
- Se vuoi mantenere l'app in modalità **Testing** (solo utenti specifici):
  1. Scorri fino alla sezione **Test users**
  2. Clicca su **+ ADD USERS**
  3. Inserisci la TUA email (quella che usi per accedere all'app)
  4. Clicca **SAVE**
  5. **NOTA:** Solo gli utenti aggiunti qui potranno accedere

### Passo 1.4: Google Cloud Console - Copiare Client ID e Client Secret

1. Torna su **APIs & Services** → **Credentials**
2. Clicca sul nome del tuo OAuth 2.0 Client ID
3. Vedrai due valori importanti:
   - **Client ID** (inizia con qualcosa come `123456789-abc...apps.googleusercontent.com`)
   - **Client secret** (una stringa alfanumerica)
4. Clicca sull'icona **copia** accanto a ciascuno per copiarli

**⚠️ TIENI QUESTI VALORI A PORTATA DI MANO - TI SERVIRANNO NEL PROSSIMO PASSO**

---

### Passo 1.5: Supabase Dashboard - Abilitare Google Provider

1. Vai su **Supabase Dashboard**: https://supabase.com/dashboard/project/fdnurgfcocmgknbmpjtd
2. Nel menu laterale sinistro, clicca su **Authentication** (icona con lucchetto)
3. Clicca sulla tab **Providers** in alto
4. Scorri l'elenco fino a trovare **Google**
5. Clicca sull'interruttore a destra per **abilitare** Google (deve diventare verde/blu)

### Passo 1.6: Supabase Dashboard - Inserire Client ID e Client Secret

1. Dopo aver abilitato Google, la sezione si espanderà mostrando dei campi
2. Vedrai due campi di testo:
   - **Client ID (for OAuth)**
   - **Client Secret (for OAuth)**
3. Incolla il **Client ID** copiato dal Google Cloud Console nel primo campo
4. Incolla il **Client Secret** copiato dal Google Cloud Console nel secondo campo
5. **IMPORTANTE:** Scorri in fondo alla pagina e clicca il pulsante **SAVE** (verde)

### Passo 1.7: Supabase Dashboard - Verificare Callback URL

1. Nella stessa sezione Google, dovresti vedere un campo **Callback URL (for OAuth)** (in sola lettura)
2. Verifica che sia: `https://fdnurgfcocmgknbmpjtd.supabase.co/auth/v1/callback`
3. Questo URL DEVE corrispondere esattamente a quello che hai inserito in Google Cloud Console al Passo 1.2

**ℹ️ Nota:** Potresti vedere anche un campo "Authorization URL" che mostra `/oauth/consent`. Questo è un placeholder e non viene utilizzato da questa app. L'autenticazione OAuth funziona correttamente tramite il Callback URL sopra.

---

## 2️⃣ CONFIGURAZIONE SUPABASE STORAGE RLS

### Passo 2.1: Verificare che il Bucket Esista

1. Nella **Supabase Dashboard**, clicca su **Storage** nel menu laterale sinistro (icona con cartella)
2. Dovresti vedere un bucket chiamato **comparison-images**
3. Se NON esiste:
   - Clicca su **New bucket** in alto a destra
   - Nome: `comparison-images`
   - **Public bucket:** Lascia **DISABILITATO** (deve essere privato)
   - Clicca **Create bucket**

### Passo 2.2: Creare le Policy RLS (4 Policy Necessarie)

1. Clicca sul bucket **comparison-images** per aprirlo
2. Clicca sulla tab **Policies** in alto (accanto a "Files")
3. Vedrai un messaggio "No policies yet" o un elenco di policy esistenti
4. Clicca sul pulsante **New Policy** in alto a destra

Ora creerai **4 policy** (una per INSERT, SELECT, UPDATE, DELETE). Segui questi passaggi per ciascuna:

---

#### Policy 1: INSERT (Permette agli utenti di caricare foto)

1. Clicca **New Policy**
2. Scegli **For full customization** (o "Create a policy from scratch")
3. Compila i campi come segue:

**Policy name:**
```
Users can upload images to their own folder
```

**Allowed operation:**
- Seleziona **INSERT** (spunta solo questa casella)

**Target roles:**
- Seleziona **authenticated** (spunta solo questa casella)

**WITH CHECK expression:**
```sql
bucket_id = 'comparison-images' 
AND (storage.foldername(name))[1] = auth.uid()::text
```

4. Clicca **Review** in basso a destra
5. Verifica che tutto sia corretto
6. Clicca **Save policy**

---

#### Policy 2: SELECT (Permette agli utenti di visualizzare le proprie foto)

1. Clicca **New Policy** di nuovo
2. Scegli **For full customization**
3. Compila i campi:

**Policy name:**
```
Users can view their own images
```

**Allowed operation:**
- Seleziona **SELECT** (spunta solo questa casella)

**Target roles:**
- Seleziona **authenticated**

**USING expression:**
```sql
bucket_id = 'comparison-images' 
AND (storage.foldername(name))[1] = auth.uid()::text
```

4. Clicca **Review** → **Save policy**

---

#### Policy 3: UPDATE (Permette agli utenti di modificare le proprie foto)

1. Clicca **New Policy** di nuovo
2. Scegli **For full customization**
3. Compila i campi:

**Policy name:**
```
Users can update their own images
```

**Allowed operation:**
- Seleziona **UPDATE** (spunta solo questa casella)

**Target roles:**
- Seleziona **authenticated**

**USING expression:**
```sql
bucket_id = 'comparison-images' 
AND (storage.foldername(name))[1] = auth.uid()::text
```

**WITH CHECK expression:**
```sql
bucket_id = 'comparison-images' 
AND (storage.foldername(name))[1] = auth.uid()::text
```

4. Clicca **Review** → **Save policy**

---

#### Policy 4: DELETE (Permette agli utenti di eliminare le proprie foto)

1. Clicca **New Policy** di nuovo
2. Scegli **For full customization**
3. Compila i campi:

**Policy name:**
```
Users can delete their own images
```

**Allowed operation:**
- Seleziona **DELETE** (spunta solo questa casella)

**Target roles:**
- Seleziona **authenticated**

**USING expression:**
```sql
bucket_id = 'comparison-images' 
AND (storage.foldername(name))[1] = auth.uid()::text
```

4. Clicca **Review** → **Save policy**

---

### Passo 2.3: Verificare le Policy

1. Dopo aver creato tutte e 4 le policy, dovresti vederle elencate nella tab **Policies**
2. Verifica che ci siano esattamente 4 policy:
   - ✅ Users can upload images to their own folder (INSERT)
   - ✅ Users can view their own images (SELECT)
   - ✅ Users can update their own images (UPDATE)
   - ✅ Users can delete their own images (DELETE)

---

## 3️⃣ TEST FINALE

### Test 1: Accesso con Google

1. **Chiudi completamente l'app** (non solo minimizzarla - fai swipe up e chiudila)
2. **Riapri l'app**
3. Clicca su **"Continua con Google"**
4. Dovresti vedere la schermata di selezione account Google (non l'errore 403)
5. Seleziona il tuo account
6. Se tutto è configurato correttamente, verrai reindirizzato all'app e sarai loggato

**Se vedi ancora l'errore 403:**
- Verifica di aver seguito TUTTI i passaggi della Sezione 1
- Controlla che i Redirect URI in Google Cloud Console siano esattamente come indicato
- Verifica che l'app sia pubblicata O che la tua email sia aggiunta come Test User
- Aspetta 1-2 minuti (a volte le modifiche impiegano un po' a propagarsi)

---

### Test 2: Caricamento Foto

1. Dopo aver effettuato l'accesso, prova a caricare una foto (clicca su uno dei tre riquadri)
2. Seleziona una foto dalla galleria
3. Se le policy RLS sono configurate correttamente, il caricamento dovrebbe funzionare senza errori
4. Dovresti vedere la foto caricata nel riquadro

**Se vedi l'errore "new row violates row-level security policy":**
- Verifica di aver creato TUTTE e 4 le policy nella Sezione 2
- Controlla che le espressioni SQL siano copiate esattamente come indicato
- Verifica che ogni policy sia salvata correttamente (pulsante "Save policy")

---

## ✅ CHECKLIST FINALE

Prima di testare l'app, verifica che TUTTI questi punti siano completati:

### Google Cloud Console:
- [ ] OAuth 2.0 Client ID creato
- [ ] Redirect URI `https://fdnurgfcocmgknbmpjtd.supabase.co/auth/v1/callback` aggiunto
- [ ] Redirect URI `chitisomiglia://auth-callback` aggiunto
- [ ] Pulsante **SAVE** cliccato dopo aver aggiunto i Redirect URI
- [ ] App pubblicata OPPURE email aggiunta come Test User
- [ ] Client ID copiato
- [ ] Client Secret copiato

### Supabase Dashboard - Authentication:
- [ ] Google provider abilitato (interruttore verde/blu)
- [ ] Client ID incollato nel campo corretto
- [ ] Client Secret incollato nel campo corretto
- [ ] Pulsante **SAVE** cliccato in fondo alla pagina

### Supabase Dashboard - Storage:
- [ ] Bucket "comparison-images" esiste
- [ ] Policy INSERT creata e salvata
- [ ] Policy SELECT creata e salvata
- [ ] Policy UPDATE creata e salvata
- [ ] Policy DELETE creata e salvata
- [ ] Tutte e 4 le policy visibili nella tab "Policies"

### Test:
- [ ] App chiusa completamente e riaperta
- [ ] Accesso con Google funziona (nessun errore 403)
- [ ] Caricamento foto funziona (nessun errore RLS)

---

## 🐛 RISOLUZIONE PROBLEMI AVANZATA

### Problema: "Popup blocked" su Web
**Soluzione:** Consenti i popup per questo sito nelle impostazioni del browser.

---

### Problema: "Authentication timeout"
**Soluzione:** 
- Verifica la connessione internet
- Riprova dopo qualche minuto
- Controlla che i Redirect URI siano corretti

---

### Problema: "Bucket not found"
**Soluzione:**
1. Vai su Supabase Dashboard → Storage
2. Clicca **New bucket**
3. Nome: `comparison-images`
4. Public bucket: **NO** (lascia disabilitato)
5. Clicca **Create bucket**
6. Poi segui la Sezione 2 per creare le policy

---

### Problema: Le policy RLS non funzionano
**Soluzione:**
1. Verifica che le espressioni SQL siano copiate ESATTAMENTE come indicato (senza spazi extra)
2. Verifica che il bucket si chiami esattamente `comparison-images` (con il trattino)
3. Prova a eliminare e ricreare le policy
4. Aspetta 1-2 minuti dopo aver salvato le policy

---

### Problema: Vedo "/oauth/consent" in Supabase
**Soluzione:**
- Questo è normale e non causa problemi
- Il percorso `/oauth/consent` esiste nell'app come placeholder
- L'autenticazione OAuth funziona correttamente tramite `/auth-callback`
- Non è necessario configurare nulla per questo percorso

---

## 📞 SUPPORTO

Se dopo aver seguito TUTTI i passaggi sopra continui ad avere problemi:

1. **Controlla i log dell'app** - Dovrebbero mostrare messaggi di errore dettagliati
2. **Verifica gli errori di battitura** - Controlla che non ci siano spazi o caratteri extra nei Redirect URI o nelle espressioni SQL
3. **Assicurati di aver cliccato SAVE** - In ogni sezione modificata (Google Cloud Console e Supabase Dashboard)
4. **Aspetta 1-2 minuti** - A volte le modifiche impiegano un po' a propagarsi
5. **Prova a disabilitare e riabilitare** - Il Google provider in Supabase (interruttore off → on → SAVE)

---

## 🎉 CONFIGURAZIONE COMPLETATA!

Una volta completati tutti i passaggi, l'app dovrebbe funzionare perfettamente:
- ✅ Accesso con Google senza errori 403
- ✅ Accesso con Email/Password
- ✅ Caricamento foto senza errori RLS
- ✅ Salvataggio e visualizzazione confronti
- ✅ Storico confronti

Buon divertimento con "Chi ti somiglia?"! 🤔👥✨

---

## 📚 RISORSE AGGIUNTIVE

- **Supabase Storage Documentation:** https://supabase.com/docs/guides/storage
- **Supabase RLS Documentation:** https://supabase.com/docs/guides/auth/row-level-security
- **Google OAuth Documentation:** https://developers.google.com/identity/protocols/oauth2
- **Supabase OAuth Documentation:** https://supabase.com/docs/guides/auth/social-login
