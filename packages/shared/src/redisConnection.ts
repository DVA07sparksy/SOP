// Lazy, shared ioredis connection for the Redis queue driver. Only loaded
// when QUEUE_DRIVER=redis, so the zero-infra path never requires ioredis.

let conn: any = null;

export function getRedisConnection(): any {
  if (conn) return conn;
  // ioredis exports the client class as a named export (CommonJS
  // interop-safe via the default shim below).
  const IORedis = (require("ioredis") as any).default ?? require("ioredis");
  conn = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null, // required by BullMQ blocking commands
  });
  return conn;
}
