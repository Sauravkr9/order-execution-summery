import Redis from 'ioredis';
import { config } from '../config';
import { Order } from '../types';

export class RedisClient {
  private client: Redis;
  private readonly ACTIVE_ORDERS_KEY = 'active_orders';
  private readonly ORDER_PREFIX = 'order:';
  private readonly TTL = 3600; // 1 hour

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    });
  }

  async saveActiveOrder(order: Order): Promise<void> {
    const key = `${this.ORDER_PREFIX}${order.orderId}`;
    await this.client.setex(key, this.TTL, JSON.stringify(order));
    await this.client.sadd(this.ACTIVE_ORDERS_KEY, order.orderId);
  }

  async getOrder(orderId: string): Promise<Order | null> {
    const key = `${this.ORDER_PREFIX}${orderId}`;
    const data = await this.client.get(key);
    if (!data) return null;
    return JSON.parse(data);
  }

  async updateOrderStatus(orderId: string, updates: Partial<Order>): Promise<void> {
    const order = await this.getOrder(orderId);
    if (!order) return;

    const updatedOrder = { ...order, ...updates, updatedAt: new Date() };
    await this.saveActiveOrder(updatedOrder);
  }

  async removeActiveOrder(orderId: string): Promise<void> {
    const key = `${this.ORDER_PREFIX}${orderId}`;
    await this.client.del(key);
    await this.client.srem(this.ACTIVE_ORDERS_KEY, orderId);
  }

  async getActiveOrders(): Promise<string[]> {
    return await this.client.smembers(this.ACTIVE_ORDERS_KEY);
  }

  async close(): Promise<void> {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }
}
