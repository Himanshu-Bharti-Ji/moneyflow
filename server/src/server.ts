import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { startRecurringWorker } from './workers/recurring.worker.js';

async function main() {
  await connectDB();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`[server] running at http://localhost:${env.port}`);
    console.log(`[server] env: ${env.nodeEnv}`);
  });

  startRecurringWorker();
}

main().catch((err) => {
  console.error('[fatal] failed to start:', err.message);
  process.exit(1);
});
