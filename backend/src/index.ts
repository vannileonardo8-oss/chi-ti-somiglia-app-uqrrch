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

await app.run();
app.logger.info('Application running');
