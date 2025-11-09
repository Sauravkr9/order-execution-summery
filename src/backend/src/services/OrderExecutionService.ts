import { Order, OrderStatus, WebSocketMessage } from '../types';
import { MockDexRouter } from '../dex/MockDexRouter';
import { PostgresClient } from '../database/postgres';
import { RedisClient } from '../database/redis';
import { WebSocketManager } from './WebSocketManager';

export class OrderExecutionService {
  private dexRouter: MockDexRouter;
  private postgres: PostgresClient;
  private redis: RedisClient;
  private wsManager: WebSocketManager;

  constructor(
    postgres: PostgresClient,
    redis: RedisClient,
    wsManager: WebSocketManager
  ) {
    this.dexRouter = new MockDexRouter();
    this.postgres = postgres;
    this.redis = redis;
    this.wsManager = wsManager;
  }

  async executeOrder(order: Order): Promise<void> {
    try {
      // Step 1: Pending status
      await this.updateOrderStatus(order, 'pending');

      // Step 2: Routing - Get quotes from DEXs
      await this.updateOrderStatus(order, 'routing');
      const quote = await this.dexRouter.getBestQuote(
        order.tokenIn,
        order.tokenOut,
        order.amountIn,
        order.slippage
      );

      order.quote = quote;
      order.selectedDex = quote.dex;
      await this.saveOrder(order);

      // Send quote update via WebSocket
      this.wsManager.broadcast({
        orderId: order.orderId,
        status: 'routing',
        timestamp: new Date(),
        quote,
        selectedDex: quote.dex,
      });

      // Check limit price if limit order
      if (order.orderType === 'limit' && order.limitPrice) {
        const executionPrice = quote.amountOut / order.amountIn;
        if (executionPrice < order.limitPrice) {
          throw new Error(
            `Limit price not met. Required: ${order.limitPrice}, Got: ${executionPrice}`
          );
        }
      }

      // Step 3: Building transaction
      await this.updateOrderStatus(order, 'building');

      // Step 4: Submit transaction
      await this.updateOrderStatus(order, 'submitted');
      const result = await this.dexRouter.executeSwap(
        quote.dex,
        order.tokenIn,
        order.tokenOut,
        order.amountIn,
        quote,
        order.walletAddress
      );

      if (result.success && result.txSignature) {
        // Step 5: Confirmed
        order.txSignature = result.txSignature;
        await this.updateOrderStatus(order, 'confirmed');
        
        // Remove from active orders after confirmation
        await this.redis.removeActiveOrder(order.orderId);
      } else {
        throw new Error(result.errorMessage || 'Transaction failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      order.errorMessage = errorMessage;
      await this.updateOrderStatus(order, 'failed');
      
      // Remove from active orders after failure
      await this.redis.removeActiveOrder(order.orderId);
      
      throw error;
    }
  }

  private async updateOrderStatus(order: Order, status: OrderStatus): Promise<void> {
    order.status = status;
    order.updatedAt = new Date();
    await this.saveOrder(order);

    // Broadcast status update via WebSocket
    const message: WebSocketMessage = {
      orderId: order.orderId,
      status,
      timestamp: order.updatedAt,
      quote: order.quote,
      txSignature: order.txSignature,
      errorMessage: order.errorMessage,
      selectedDex: order.selectedDex,
    };

    this.wsManager.broadcast(message);
  }

  private async saveOrder(order: Order): Promise<void> {
    await Promise.all([
      this.postgres.saveOrder(order),
      this.redis.saveActiveOrder(order),
    ]);
  }
}
