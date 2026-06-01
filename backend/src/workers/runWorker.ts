import { connectRedis } from '../config/redis';
import { startNotificationWorker } from './notificationWorker';

const run = async () => {
  console.log('Starting standalone BullMQ notification worker process...');
  await connectRedis();
  startNotificationWorker();
};

run().catch((err) => {
  console.error('Fatal worker crash:', err);
  process.exit(1);
});
