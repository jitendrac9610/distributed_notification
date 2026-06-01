import { Queue } from 'bullmq';
import { bullConnection } from '../config/redis';

export const QUEUE_NAME = 'notification-delivery-queue';

export const notificationQueue = new Queue(QUEUE_NAME, {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // Initial retry delay of 5 seconds
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for an hour
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
});

export const addNotificationToQueue = async (notificationId: string) => {
  try {
    await notificationQueue.add('deliver', { notificationId }, {
      jobId: notificationId, // Deduplication by using notificationId as jobId
    });
    console.log(`Added notification ${notificationId} to queue`);
  } catch (error) {
    console.error('Error adding notification to queue:', error);
    throw error;
  }
};
