import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerComparisonsRoutes } from './routes/comparisons.js';

const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Build OAuth provider configuration from environment variables
const socialProviders: any = {};

// Only add Google provider if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
  app.logger.info('Google OAuth provider configured');
} else {
  app.logger.warn('Google OAuth credentials not found - Google sign-in will be disabled');
}

// Only add Apple provider if credentials are provided
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  socialProviders.apple = {
    clientId: process.env.APPLE_CLIENT_ID,
    clientSecret: process.env.APPLE_CLIENT_SECRET,
  };
  app.logger.info('Apple OAuth provider configured');
} else {
  app.logger.warn('Apple OAuth credentials not found - Apple sign-in will be disabled');
}

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
    'https://**',
  ],
  // Configure OAuth providers only if credentials are available
  ...(Object.keys(socialProviders).length > 0 && {
    socialProviders,
  }),
});

// Enable storage
app.withStorage();

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerComparisonsRoutes(app);

// Add logging for OAuth flow debugging
app.fastify.addHook('preHandler', async (request, reply) => {
  // Log OAuth-related requests
  if (request.url.includes('/api/auth/')) {
    const body = request.body as any;
    const query = request.query as any;

    app.logger.info(
      {
        path: request.url,
        method: request.method,
        provider: body?.provider || query?.provider,
        redirectUri: body?.redirectUri || query?.redirectUri || body?.redirect_uri,
        origin: request.headers.origin,
      },
      'OAuth request received'
    );

    // Log social sign-in requests specifically
    if (request.url.includes('/sign-in/social')) {
      app.logger.info(
        {
          provider: body?.provider,
          redirectUri: body?.redirectUri || body?.redirect_uri,
          hasCallbackUrl: !!body?.callbackURL,
        },
        'Social sign-in request'
      );
    }
  }
});

// Custom handler for OAuth redirects
// 1. Forces Google account selection screen
// 2. Handles native app redirects with token in query parameters
// 3. Logs errors for debugging
app.fastify.addHook('onSend', async (request, reply, payload) => {
  try {
    // Log error responses on auth endpoints
    if (request.url.includes('/api/auth/') && reply.statusCode >= 400) {
      app.logger.warn(
        {
          path: request.url,
          method: request.method,
          statusCode: reply.statusCode,
          provider: (request.body as any)?.provider,
          errorMessage: typeof payload === 'string' ? payload : undefined,
        },
        'OAuth error response'
      );
    }

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

// Add error handler for auth-related errors
app.fastify.addHook('onError', async (request, reply, error) => {
  if (request.url.includes('/api/auth/')) {
    app.logger.error(
      {
        err: error,
        path: request.url,
        method: request.method,
        statusCode: reply.statusCode,
        provider: (request.body as any)?.provider,
      },
      'Authentication error'
    );
  }
});

await app.run();
app.logger.info('Application running');
