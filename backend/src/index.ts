import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerComparisonsRoutes } from './routes/comparisons.js';

const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication
app.withAuth();

// Enable storage
app.withStorage();

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerComparisonsRoutes(app);

// Custom handler to force Google account selection screen
// Intercepts OAuth redirect responses and adds the prompt parameter to Google's OAuth endpoint
app.fastify.addHook('onSend', async (request, reply, payload) => {
  try {
    // Check if this is a redirect response from Better Auth's OAuth flow
    if ((reply.statusCode === 302 || reply.statusCode === 303) && request.url.includes('/api/auth/')) {
      const location = reply.getHeader('location');

      if (location && typeof location === 'string' && location.includes('accounts.google.com')) {
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
    }
  } catch (error) {
    app.logger.error({ err: error }, 'Error in Google OAuth interception hook');
  }

  return payload;
});

await app.run();
app.logger.info('Application running');
