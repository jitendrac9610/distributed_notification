import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisUrl = process.env.REDIS_URL;
if (!redisUrl && process.env.REDIS_HOST) {
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT || '6379';
  redisUrl = `redis://${host}:${port}`;
}
if (!redisUrl) {
  redisUrl = 'redis://localhost:6379';
}

const parseRedisUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port || '6379', 10),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      maxRetriesPerRequest: null, // Required by BullMQ
    };
  } catch (e) {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
};

export const bullConnection = parseRedisUrl(redisUrl);

// General purpose / Publisher Redis Client
export const redisClient = createClient({ url: redisUrl });

// Dedicated Subscriber Redis Client (Pub/Sub subscription blocks the connection)
export const redisSubClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => {
  console.error('Redis Publisher Client error:', err);
});

redisSubClient.on('error', (err) => {
  console.error('Redis Subscriber Client error:', err);
});

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Redis Publisher Client connected');
  }
  if (!redisSubClient.isOpen) {
    await redisSubClient.connect();
    console.log('Redis Subscriber Client connected');
  }
};
