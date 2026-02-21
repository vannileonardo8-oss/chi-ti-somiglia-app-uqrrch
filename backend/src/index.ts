import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerComparisonsRoutes } from './routes/comparisons.js';

const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication with OAuth providers and native app scheme support
app.withAuth({
  // Trust the chi-ti-somiglia native app scheme and Expo deep links
  trustedOrigins: [
    'chi-ti-somiglia://',
    'chi-ti-somiglia://**',
    'exp://',
    'exp://**',
    'exp://10.0.0.*:*/**',
    'http://localhost:*',
  ],
  // Configure OAuth providers with environment variables
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    },
  },
});

// Enable storage
app.withStorage();

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerComparisonsRoutes(app);

// Custom handler for OAuth redirects
// 1. Forces Google account selection screen
// 2. Handles native app redirects with token in query parameters
app.fastify.addHook('onSend', async (request, reply, payload) => {
  try {
    // Check if this is a redirect response from Better Auth's OAuth flow
    if ((reply.statusCode === 302 || reply.statusCode === 303) && request.url.includes('/api/auth/')) {
      const location = reply.getHeader('location');

      if (location && typeof location === 'string') {
        // Handle Google OAuth: force account selection screen
        if (location.includes('accounts.google.com')) {
          app.logger.info(
            { originalUrl: location },
            'Intercepting Google OAuth redirect to add account selection'
          );

          try {
            const googleAuthUrl = new URL(location);

            // Add prompt=select_account to force the account selection screen
            googleAuthUrl.searchParams.set('prompt', 'select_account');

            // Add access_type=offline to get refresh token
            googleAuthUrl.searchParams.set('access_type', 'offline');

            const newLocation = googleAuthUrl.toString();

            reply.header('location', newLocation);

            app.logger.info(
              { modifiedUrl: newLocation },
              'Google OAuth redirect modified to force account selection'
            );
          } catch (error) {
            app.logger.warn(
              { err: error, originalUrl: location },
              'Error modifying Google OAuth URL, sending original'
            );
          }
        }

        // Handle native app redirects (exp:// and chi-ti-somiglia://)
        const isNativeAppRedirect =
          location.includes('chi-ti-somiglia://') ||
          location.includes('exp://');

        if (isNativeAppRedirect) {
          const scheme = location.includes('chi-ti-somiglia://')
            ? 'chi-ti-somiglia'
            : 'exp';

          app.logger.info(
            { originalUrl: location, scheme },
            `Detected ${scheme} native app OAuth redirect`
          );

          try {
            const nativeAppUrl = new URL(location);

            // Try to extract the Better Auth token from any cookies or session info
            // The token should be available in the response headers as a Set-Cookie
            const setCookieHeader = reply.getHeader('set-cookie');
            let betterAuthToken: string | undefined;

            if (Array.isArray(setCookieHeader)) {
              // Parse the Better Auth session cookie
              const sessionCookie = setCookieHeader.find((cookie) =>
                cookie.includes('better_auth_session') ||
                cookie.includes('sessionToken') ||
                cookie.includes('auth_token')
              );

              if (sessionCookie) {
                const tokenMatch = sessionCookie.match(/=([^;]+)/);
                betterAuthToken = tokenMatch ? tokenMatch[1] : undefined;
              }
            } else if (typeof setCookieHeader === 'string') {
              const tokenMatch = setCookieHeader.match(/=([^;]+)/);
              betterAuthToken = tokenMatch ? tokenMatch[1] : undefined;
            }

            // Append the token to the redirect URL if available
            if (betterAuthToken) {
              nativeAppUrl.searchParams.set('better_auth_token', betterAuthToken);
              app.logger.info(
                {
                  redirect_url: nativeAppUrl.toString(),
                  hasToken: true,
                  scheme,
                },
                'Native app redirect prepared with token'
              );
            } else {
              app.logger.warn(
                { redirect_url: location, scheme },
                'Native app redirect prepared without token (token not yet available)'
              );
            }

            reply.header('location', nativeAppUrl.toString());
          } catch (error) {
            app.logger.warn(
              { err: error, originalUrl: location },
              'Error handling native app redirect, sending original'
            );
          }
        }
      }
    }
  } catch (error) {
    app.logger.error({ err: error }, 'Error in OAuth interception hook');
  }

  return payload;
});

await app.run();
app.logger.info('Application running');
