import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config';
import { PostgresClient } from './database/postgres';
import { RedisClient } from './database/redis';
import { WebSocketManager } from './services/WebSocketManager';
import { OrderQueue } from './queue/OrderQueue';
import { orderRoutes } from './routes/orders';

async function start() {
  const fastify = Fastify({
    logger: true,
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true,
  });

  await fastify.register(websocket);

  // Initialize databases
  const postgres = new PostgresClient();
  const redis = new RedisClient();
  const wsManager = new WebSocketManager();

  await postgres.initialize();
  console.log('PostgreSQL initialized');

  // Initialize order queue
  const orderQueue = new OrderQueue(redis, postgres, wsManager);
  console.log('Order queue initialized');

  // Register routes
  await orderRoutes(fastify, orderQueue, postgres);

  // WebSocket endpoint
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
      wsManager.addClient(connection.socket);
      
      // Send welcome message
      connection.socket.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connection established',
        timestamp: new Date(),
      }));
    });
  });

  // Health check
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date() };
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    await orderQueue.close();
    await postgres.close();
    await redis.close();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Start server
  try {
    await fastify.listen({ port: config.server.port, host: '0.0.0.0' });
    console.log(`Server listening on port ${config.server.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
