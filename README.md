# Chi ti somiglia?

This app was built using [Natively.dev](https://natively.dev) - a platform for creating mobile apps.

Made with 💙 for creativity.

## 🔐 Authentication Setup

This app uses **Better Auth** with support for:
- ✉️ Email/Password authentication
- 🔵 Google OAuth
- 🍎 Apple OAuth (iOS only)

### OAuth Flow for Native Apps

The OAuth flow for native Expo apps has been configured to work as follows:

1. **User initiates OAuth**: User taps "Continua con Google" (or Apple)
2. **OAuth popup opens**: The app opens the OAuth provider's authentication page
3. **User authenticates**: User logs in with their Google/Apple account
4. **Backend callback**: OAuth provider redirects to `/api/auth/oauth-callback/google?code=...&expo_client=true`
5. **Token in redirect**: Backend includes the session token in the redirect URL: `chi-ti-somiglia:///(tabs)/(home)?token=SESSION_TOKEN`
6. **Deep link handling**: The app receives the deep link and extracts the token
7. **Token storage**: Token is stored in SecureStore (native) or localStorage (web)
8. **Session fetch**: App fetches the user session using the stored token
9. **Navigation**: User is redirected to the home screen

### Key Configuration

- **App Scheme**: `chi-ti-somiglia` (configured in `app.json`)
- **Backend URL**: `https://3az2ndteth9e6e3ftqke6u4yj9646gyu.app.specular.dev`
- **Storage**: SecureStore for native, localStorage for web
- **Token Key**: `chi-ti-somiglia_bearer_token`

### Testing OAuth Flow

#### On iOS/Android Simulator:

1. Start the app: `npx expo start`
2. Open in iOS Simulator or Android Emulator
3. Tap "Continua con Google" on the auth screen
4. Complete the OAuth flow in the browser
5. Check the console logs for:
   - `🔗 [AuthContext] Deep link received: chi-ti-somiglia://...?token=...`
   - `🔑 [AuthContext] Token found in deep link, storing...`
   - `✅ [AuthContext] User session found: user@example.com`

#### On Web:

1. Start the app: `npx expo start --web`
2. Click "Continua con Google"
3. A popup window will open for OAuth
4. Complete authentication
5. Popup will close and you'll be logged in

### Troubleshooting

If OAuth is not working:

1. **Check deep link scheme**: Ensure `app.json` has `"scheme": "chi-ti-somiglia"`
2. **Check backend logs**: Look for OAuth callback requests
3. **Check token in URL**: The redirect URL should contain `?token=...`
4. **Check console logs**: Look for `[AuthContext]` logs showing the OAuth flow
5. **Clear storage**: Try clearing SecureStore/localStorage and retry

### Backend Changes

The backend has been modified to:
- Detect when `expo_client=true` is present in the OAuth callback
- Include the session token in the redirect URL for native apps
- Redirect to: `{callbackURL}?token={sessionToken}` instead of just `{callbackURL}`

This ensures that native Expo apps can properly receive and store the session token after OAuth authentication.

## 📱 API Integration

All API calls use the centralized `utils/api.ts` wrapper:

```typescript
import { apiGet, apiPost, authenticatedGet, authenticatedPost } from '@/utils/api';

// Public endpoints
const data = await apiGet('/api/endpoint');
await apiPost('/api/endpoint', { data });

// Authenticated endpoints (requires login)
const userData = await authenticatedGet('/api/user');
await authenticatedPost('/api/endpoint', { data });
```

### Available Endpoints

- `POST /api/auth/sign-in/email` - Email/password sign in
- `POST /api/auth/sign-up/email` - Email/password sign up
- `GET /api/auth/oauth-callback/google` - Google OAuth callback
- `GET /api/auth/oauth-callback/apple` - Apple OAuth callback
- `POST /api/upload/image` - Upload image (authenticated)
- `POST /api/compare` - Compare images (authenticated)
- `GET /api/comparisons` - Get comparison history (authenticated)
- `GET /api/comparisons/:id` - Get comparison result (authenticated)

## 🧪 Testing

### Test User Credentials

For testing email/password authentication:

```
Email: test@example.com
Password: TestPassword123!
```

Or create a new account using the "Registrati" button.

### Testing the Full Flow

1. **Sign Up/Sign In**:
   - Use email/password or OAuth
   - Verify you're redirected to the home screen
   - Check that your profile shows your email

2. **Upload Images**:
   - Tap the main image placeholder
   - Select a photo from your gallery
   - Add a label (e.g., "Me")
   - Repeat for the two comparison images

3. **Analyze**:
   - Tap "Analizza Ora"
   - Wait for the analysis to complete
   - Tap "Vedi Risultati"

4. **View Results**:
   - See the winner announcement
   - Read the detailed analysis
   - Share the results
   - Start a new comparison

5. **History**:
   - Navigate to the History tab
   - See all your past comparisons
   - Tap any item to view its results

6. **Profile**:
   - Navigate to the Profile tab
   - See your user information
   - Sign out

## 🔧 Development

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android

# Run on Web
npx expo start --web
```

## 📝 Notes

- The app uses **Better Auth** for authentication
- All authenticated API calls automatically include the Bearer token
- Session tokens are stored securely using SecureStore (native) or localStorage (web)
- OAuth flows are handled differently for web (popup) vs native (deep linking)
- The app automatically refreshes the session every 5 minutes to keep tokens in sync
