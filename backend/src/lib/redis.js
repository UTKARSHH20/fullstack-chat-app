import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

let redisClient = null;

/**
 * Initializes and returns a singleton instance of the Redis client.
 * Includes graceful connection error fallbacks to keep the core app 
 * operational even if the local Redis container drops.
 * * @returns {Redis|null} The active Redis client instance or null if unavailable.
 */
export const getRedisClient = () => {
    if (redisClient) return redisClient;

    const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    
    try {
        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 3) {
                    console.warn("Redis Connection Warning: Maximum retry attempts reached. Falling back to primary DB loops.");
                    return null; // Stop retrying and fail gracefully
                }
                return Math.min(times * 200, 1000);
            }
        });

        redisClient.on("error", (err) => {
            console.error("Redis Cache Error:", err.message);
        });

        redisClient.on("connect", () => {
            console.log("Redis Server Cache Connection Successfully Established.");
        });

    } catch (error) {
        console.error("Failed to initialize Redis client:", error.message);
        redisClient = null;
    }

    return redisClient;
};

export default getRedisClient();