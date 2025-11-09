import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OrderRequest, Order } from '../types';
import { OrderQueue } from '../queue/OrderQueue';
import { PostgresClient } from '../database/postgres';
import { randomUUID } from 'crypto';

const OrderRequestSchema = z.object({
  walletAddress: z.string().min(32).max(44),
  tokenIn: z.string().min(1),
  tokenOut: z.string().min(1),
  amountIn: z.number().positive(),
  orderType: z.enum(['market', 'limit']),
  slippage: z.number().min(0).max(100),
  limitPrice: z.number().positive().optional(),
});

export async function orderRoutes(
  fastify: FastifyInstance,
  orderQueue: OrderQueue,
  postgres: PostgresClient
): Promise<void> {
  // POST /api/orders/execute - Submit a new order
  fastify.post<{ Body: OrderRequest }>('/api/orders/execute', async (request, reply) => {
    try {
      const validation = OrderRequestSchema.safeParse(request.body);
      
      if (!validation.success) {
        return reply.code(400).send({
          error: 'Invalid request',
          details: validation.error.errors,
        });
      }

      const orderRequest = validation.data;

      // Validate limit order has limitPrice
      if (orderRequest.orderType === 'limit' && !orderRequest.limitPrice) {
        return reply.code(400).send({
          error: 'Limit orders must include limitPrice',
        });
      }

      // Create order object
      const order: Order = {
        ...orderRequest,
        orderId: randomUUID(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
      };

      // Add to queue
      await orderQueue.addOrder(order);

      return reply.code(202).send({
        orderId: order.orderId,
        status: order.status,
        message: 'Order submitted successfully',
      });
    } catch (error) {
      console.error('Error submitting order:', error);
      return reply.code(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/orders/:orderId - Get order status
  fastify.get<{ Params: { orderId: string } }>('/api/orders/:orderId', async (request, reply) => {
    try {
      const { orderId } = request.params;

      const order = await postgres.getOrder(orderId);

      if (!order) {
        return reply.code(404).send({
          error: 'Order not found',
        });
      }

      return reply.send({
        orderId: order.orderId,
        status: order.status,
        walletAddress: order.walletAddress,
        tokenIn: order.tokenIn,
        tokenOut: order.tokenOut,
        amountIn: order.amountIn,
        orderType: order.orderType,
        slippage: order.slippage,
        limitPrice: order.limitPrice,
        selectedDex: order.selectedDex,
        quote: order.quote,
        txSignature: order.txSignature,
        errorMessage: order.errorMessage,
        retryCount: order.retryCount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      return reply.code(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/orders - Get queue metrics
  fastify.get('/api/orders', async (request, reply) => {
    try {
      const metrics = await orderQueue.getQueueMetrics();
      return reply.send(metrics);
    } catch (error) {
      console.error('Error fetching queue metrics:', error);
      return reply.code(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
