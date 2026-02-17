import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerComparisonsRoutes } from './routes/comparisons.js';

const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication with Expo deep link URL support
app.withAuth({
  // Trust Expo deep link URLs for mobile app redirects
  trustedOrigins: [
    "exp://",
    "exp://**",
    "exp://10.0.0.*:*/**",
    "http://localhost:*",
  ],
});

// Enable storage
app.withStorage();

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerComparisonsRoutes(app);

// Helper endpoint for Expo clients to verify OAuth and retrieve session
// This endpoint handles the deferred session retrieval after OAuth redirect
app.fastify.get(
  '/api/auth/expo/verify-session',
  async (request, reply) => {
    try {
      const query = request.query as {
        code?: string;
        state?: string;
      };

      app.logger.info(
        {
          hasCode: !!query.code,
          hasState: !!query.state,
        },
        'Expo client verifying OAuth session'
      );

      // This endpoint is called by the Expo client after returning from the OAuth flow
      // Better Auth has already created the session, but the native app needs
      // to know how to access it without cookies

      // The native app should:
      // 1. Receive the OAuth redirect to exp://callback
      // 2. Call this endpoint to verify the session was created
      // 3. Then call GET /api/auth/get-session with a Bearer token if available

      return reply.status(200).send({
        message: 'OAuth session verification endpoint',
        instructions:
          'Call GET /api/auth/get-session to retrieve your current session',
      });
    } catch (error) {
      app.logger.error({ err: error }, 'Error in Expo session verification');
      throw error;
    }
  }
);

// Add logging middleware to capture auth errors and requests
app.fastify.addHook('onError', async (request, reply, error) => {
  // Log auth-related errors for debugging
  if (request.url.startsWith('/api/auth/')) {
    app.logger.error(
      {
        err: error,
        path: request.url,
        method: request.method,
        query: request.query,
      },
      'Auth endpoint error'
    );
  }
});

// Add request logging for auth callbacks
app.fastify.addHook('preHandler', async (request, reply) => {
  if (request.url.startsWith('/api/auth/')) {
    const query = request.query as any;
    const body = request.body as any;

    app.logger.info(
      {
        path: request.url,
        method: request.method,
        provider: query?.provider || body?.provider,
        isExpoClient: query?.expo_client === 'true' || body?.expo_client === 'true',
      },
      'Auth request received'
    );

    // Log Expo-specific parameters for debugging OAuth flow
    if (query.expo_client === 'true' || body?.expo_client === 'true') {
      app.logger.info(
        {
          redirect_to: query.redirect_to || body?.redirect_to,
          code: query.code ? '[present]' : undefined,
          state: query.state ? '[present]' : undefined,
        },
        'Expo client OAuth flow detected'
      );
    }
  }
});

await app.run();
app.logger.info('Application running');
