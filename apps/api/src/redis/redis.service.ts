import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL');
    this.client = url
      ? new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 })
      : new Redis({ lazyConnect: true, maxRetriesPerRequest: 3 });

    this.client.on('error', (err) => {
      this.logger.error('Redis client error', err);
    });
  }

  onModuleDestroy() {
    void this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  /**
   * Atomic check-and-increment via Lua.
   * Returns the new count, or -1 if the limit was already reached.
   */
  async checkAndIncrement(key: string, limit: number, ttlSeconds: number): Promise<number> {
    const script = `
      local current = tonumber(redis.call('GET', KEYS[1])) or 0
      if current >= tonumber(ARGV[1]) then
        return -1
      end
      local new = redis.call('INCR', KEYS[1])
      if new == 1 then
        redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
      end
      return new
    `;
    const result = await this.client.eval(script, 1, key, String(limit), String(ttlSeconds));
    return result as number;
  }

  /** Read current counter value without incrementing. Returns 0 if key absent. */
  async getCount(key: string): Promise<number> {
    const value = await this.client.get(key);
    return value ? parseInt(value, 10) : 0;
  }
}
