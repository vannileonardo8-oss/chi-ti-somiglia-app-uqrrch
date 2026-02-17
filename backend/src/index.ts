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
    app.logger.info(
      {
        path: request.url,
        method: request.method,
        provider: (request.query as any)?.provider || (request.body as any)?.provider,
      },
      'Auth request received'
    );
  }
});

await app.run();
app.logger.info('Application running');
