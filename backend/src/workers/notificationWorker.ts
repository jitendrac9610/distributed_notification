import { Worker, Job } from 'bullmq';
import { bullConnection, redisClient } from '../config/redis';
import { prisma } from '../config/db';
import { QUEUE_NAME } from '../queues/notificationQueue';
import { ChannelProviders } from '../services/channelProviders';

export let notificationWorker: Worker | null = null;

export const startNotificationWorker = () => {
  notificationWorker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const { notificationId } = job.data;
      console.log(`Processing job ${job.id} for notification ${notificationId}`);

      // 1. Fetch notification including recipient details
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        include: { recipient: true },
      });

      if (!notification) {
        console.warn(`Notification ${notificationId} not found in database. Skipping.`);
        return;
      }

      const currentAttempt = (job.attemptsMade || 0) + 1;

      // Update attempt count in DB
      await prisma.notification.update({
        where: { id: notificationId },
        data: { attempts: currentAttempt },
      });

      try {
        // Simulate local latency processing
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Allow simulated failures for testing retry & backoff
        if (notification.title.toLowerCase().startsWith('fail')) {
          throw new Error('Artificial delivery failure triggered by title prefix "fail"');
        }

        if (
          notification.metadata &&
          typeof notification.metadata === 'object' &&
          (notification.metadata as any).simulateFailure === true
        ) {
          throw new Error('Artificial delivery failure triggered by metadata flag');
        }

        // Determine which channels to route this notification through
        const channels: string[] = ['IN_APP']; // WebSockets is always active
        const deliveryResults: any = { inApp: { success: true } };

        let metadataChannels: any = null;
        if (notification.metadata && typeof notification.metadata === 'object') {
          metadataChannels = (notification.metadata as any).channels;
        }

        if (Array.isArray(metadataChannels)) {
          // Use channels specified explicitly in metadata
          metadataChannels.forEach((chan: any) => {
            const normalized = String(chan).toUpperCase();
            if (['EMAIL', 'SMS', 'IN_APP'].includes(normalized) && !channels.includes(normalized)) {
              channels.push(normalized);
            }
          });
        } else {
          // Default rule: Critical triggers email + SMS, High triggers email
          if (notification.priority === 'CRITICAL') {
            channels.push('EMAIL');
            channels.push('SMS');
          } else if (notification.priority === 'HIGH') {
            channels.push('EMAIL');
          }
        }

        // Send through optional SMS provider mock
        if (channels.includes('SMS')) {
          let phoneNum = '+1-555-0199';
          if (notification.metadata && typeof notification.metadata === 'object' && (notification.metadata as any).phone) {
            phoneNum = String((notification.metadata as any).phone);
          } else {
            phoneNum = `+1-555-${notification.recipientId.substring(0, 4)}`;
          }

          const smsRes = await ChannelProviders.sendSMS(
            phoneNum,
            `[${notification.title}] ${notification.message}`
          );
          deliveryResults.sms = smsRes;
        }

        // Send through optional EMAIL provider mock
        if (channels.includes('EMAIL')) {
          const emailRes = await ChannelProviders.sendEmail(
            notification.recipient.email,
            notification.title,
            notification.message
          );
          deliveryResults.email = emailRes;
        }

        // 2. Mark as DELIVERED in database and save delivery channel results in JSON metadata
        const existingMetadata = (notification.metadata && typeof notification.metadata === 'object')
          ? (notification.metadata as Record<string, any>)
          : {};

        const updatedMetadata = {
          ...existingMetadata,
          _delivery: {
            channels,
            results: deliveryResults,
          },
        };

        const updatedNotification = await prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: 'DELIVERED',
            metadata: updatedMetadata,
          },
        });

        // 3. Write success log
        await prisma.deliveryLog.create({
          data: {
            notificationId,
            status: 'DELIVERED',
            attempt: currentAttempt,
          },
        });

        // 4. Publish event to Redis Pub/Sub, adding delivery channel detail
        const pubsubPayload = {
          event: 'notification:new',
          recipientId: notification.recipientId,
          notification: {
            ...updatedNotification,
            deliveryChannels: channels,
            deliveryResults,
          },
        };

        if (redisClient.isOpen) {
          await redisClient.publish('notifications', JSON.stringify(pubsubPayload));
          console.log(`Published notification ${notificationId} to Redis Pub/Sub channels list: ${channels.join(', ')}`);
        } else {
          console.warn('Redis client not connected. Unable to publish Pub/Sub event.');
        }

        return { success: true, notificationId, channels, deliveryResults };
      } catch (error: any) {
        console.error(`Attempt ${currentAttempt} failed for notification ${notificationId}:`, error.message);

        // Record failure log
        await prisma.deliveryLog.create({
          data: {
            notificationId,
            status: 'FAILED',
            error: error.message,
            attempt: currentAttempt,
          },
        });

        const maxAttempts = job.opts.attempts || 3;
        if (currentAttempt >= maxAttempts) {
          // Final state is FAILED
          await prisma.notification.update({
            where: { id: notificationId },
            data: { status: 'FAILED' },
          });
        }

        // Throw error to trigger BullMQ exponential backoff retry
        throw error;
      }
    },
    {
      connection: bullConnection,
      concurrency: 5, // Concurrent jobs per worker thread
    }
  );

  if (notificationWorker) {
    notificationWorker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully.`);
    });

    notificationWorker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed on final attempt or error: ${err.message}`);
    });
  }

  console.log('BullMQ background notification worker listening for jobs...');
  return notificationWorker;
};
