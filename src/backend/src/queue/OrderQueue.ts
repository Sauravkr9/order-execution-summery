import { Queue, Worker, Job } from 'bullmq';
import { RedisClient } from '../database/redis';
import { PostgresClient } from '../database/postgres';
import { Order } from '../types';
import { OrderExecutionService } from '../services/OrderExecutionService';
import { WebSocketManager } from '../services/WebSocketManager';
import { config } from '../config';

export class OrderQueue {
  private queue: Queue;
  private worker: Worker;
  private executionService: OrderExecutionService;

  constructor(
    redis: RedisClient,
    postgres: PostgresClient,
    wsManager: WebSocketManager
  ) {
    const connection = redis.getClient();

    this.queue = new Queue('order-execution', {
      connection,
      defaultJobOptions: {
        attempts: config.queue.maxRetries,
        backoff: {
          type: 'exponential',
          delay: config.queue.retryBackoffMs,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 100, // Keep last 100 failed jobs
      },
    });

    this.executionService = new OrderExecutionService(postgres, redis, wsManager);

    this.worker = new Worker(
      'order-execution',
      async (job: Job<Order>) => {
        console.log(`Processing order ${job.data.orderId}, attempt ${job.attemptsMade + 1}`);
        
        // Update retry count
        job.data.retryCount = job.attemptsMade;
        
        await this.executionService.executeOrder(job.data);
        return { orderId: job.data.orderId, status: 'completed' };
      },
      {
        connection,
        concurrency: config.queue.maxConcurrent,
        limiter: {
          max: 100, // 100 orders
          duration: 60000, // per minute
        },
      }
    );

    this.setupWorkerEvents();
  }

  private setupWorkerEvents(): void {
    this.worker.on('completed', (job) => {
      console.log(`Order ${job.data.orderId} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Order ${job?.data.orderId} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error('Worker error:', err);
    });
  }

  async addOrder(order: Order): Promise<void> {
    await this.queue.add('execute-order', order, {
      jobId: order.orderId,
    });
    console.log(`Order ${order.orderId} added to queue`);
  }

  async getQueueMetrics() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
    };
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
  }
}
