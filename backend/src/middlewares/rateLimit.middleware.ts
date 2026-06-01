import { Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { AuthenticatedRequest } from './auth';
import { ApiResponse } from '../utils/apiResponse';

export const rateLimiter = (limit = 20, windowSeconds = 60) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Identity is determined by authenticated userId, falling back to IP address
      const identifier = req.user?.userId || req.ip;
      const key = `rate_limit:notifications:${identifier}`;

      if (!redisClient.isOpen) {
        console.warn('[RateLimiter] Redis client is not open. Bypassing rate limiter.');
        return next();
      }

      // Increment count
      const currentCount = await redisClient.incr(key);

      // If it is the first request in the window, set expiration
      if (currentCount === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      // Check limit
      if (currentCount > limit) {
        const ttl = await redisClient.ttl(key);
        res.setHeader('Retry-After', ttl > 0 ? ttl : 1);
        return ApiResponse.error(
          res,
          `Rate limit exceeded. Max ${limit} notifications per ${windowSeconds / 60} minute(s). Please try again in ${ttl} seconds.`,
          'RateLimitExceeded',
          429
        );
      }

      // Set standard rate limit headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - currentCount));

      next();
    } catch (error) {
      console.error('[RateLimiter] Error evaluating rate limit:', error);
      // Fail open to ensure system availability if Redis experiences hiccups
      next();
    }
  };
};
