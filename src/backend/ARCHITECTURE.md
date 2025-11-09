# Architecture Documentation

## System Overview

The Order Execution Engine is a backend service that handles order execution for Solana DEX trading with support for Raydium and Meteora pools.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  HTTP Client │  │ WS Client    │  │  Dashboard   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          │ POST /api/orders │ ws://            │ GET /api/
          │      /execute    │                  │     orders
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼──────────────┐
│                      Fastify Server                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              WebSocket Manager                        │   │
│  │  - Manages WS connections                            │   │
│  │  - Broadcasts order updates                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Routes                              │   │
│  │  - POST /api/orders/execute                          │   │
│  │  - GET  /api/orders/:orderId                         │   │
│  │  - GET  /api/orders (metrics)                        │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        │ Queue Job
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      BullMQ Queue                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Queue Configuration:                                │  │
│  │  - Max Concurrent: 10                                │  │
│  │  - Max Retries: 3                                    │  │
│  │  - Backoff: Exponential                              │  │
│  │  - Rate Limit: 100/minute                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Worker 1  │  │  Worker 2  │  │  Worker N  │  (max 10) │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘           │
└────────┼───────────────┼───────────────┼────────────────────┘
         │               │               │
         └───────────────┴───────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│               Order Execution Service                        │
│                                                              │
│  Order Processing Flow:                                     │
│  1. pending    → Order received                             │
│  2. routing    → Fetching DEX quotes                        │
│  3. building   → Building transaction                       │
│  4. submitted  → Transaction submitted                      │
│  5. confirmed  → Transaction confirmed ✅                   │
│     OR failed  → Transaction failed ❌                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  For each order:                                     │  │
│  │  1. Update status to 'pending'                       │  │
│  │  2. Update status to 'routing'                       │  │
│  │  3. Call DEX Router to get quotes                    │  │
│  │  4. Select best quote                                │  │
│  │  5. Broadcast quote via WebSocket                    │  │
│  │  6. Update status to 'building'                      │  │
│  │  7. Update status to 'submitted'                     │  │
│  │  8. Execute swap on selected DEX                     │  │
│  │  9. Update status to 'confirmed' or 'failed'         │  │
│  │  10. Broadcast final status via WebSocket            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Mock DEX Router                           │
│                                                              │
│  ┌────────────────────┐      ┌────────────────────┐        │
│  │  Raydium Adapter   │      │  Meteora Adapter   │        │
│  │                    │      │                    │        │
│  │  - Get quote       │      │  - Get quote       │        │
│  │  - Execute swap    │      │  - Execute swap    │        │
│  │  - Success: 95%    │      │  - Success: 95%    │        │
│  └────────────────────┘      └────────────────────┘        │
│                                                              │
│  Quote Selection:                                           │
│  - Fetch quotes from both DEXs in parallel                  │
│  - Compare amountOut                                        │
│  - Select DEX with higher output                            │
│                                                              │
│  Mock Execution:                                            │
│  - Simulate 2s processing time                              │
│  - Random success based on configured rate                  │
│  - Generate mock transaction signature                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ Save order state
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Persistence Layer                     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              PostgreSQL                            │    │
│  │  - Order history (permanent storage)               │    │
│  │  - Full order details                              │    │
│  │  - Transaction signatures                          │    │
│  │  - Error logs                                      │    │
│  │                                                    │    │
│  │  Table: orders                                     │    │
│  │  - order_id (PK)                                   │    │
│  │  - wallet_address                                  │    │
│  │  - token_in, token_out                             │    │
│  │  - amount_in, order_type                           │    │
│  │  - status, selected_dex                            │    │
│  │  - quote (JSONB)                                   │    │
│  │  - tx_signature                                    │    │
│  │  - error_message                                   │    │
│  │  - retry_count                                     │    │
│  │  - created_at, updated_at                          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Redis                                 │    │
│  │  - Active orders cache (fast lookup)              │    │
│  │  - BullMQ queue data                               │    │
│  │  - Session data                                    │    │
│  │  - TTL: 1 hour                                     │    │
│  │                                                    │    │
│  │  Keys:                                             │    │
│  │  - order:{orderId}                                 │    │
│  │  - active_orders (Set)                             │    │
│  │  - bull:order-execution:*                          │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Fastify Server
- **Purpose**: HTTP server and WebSocket gateway
- **Responsibilities**:
  - Handle HTTP requests
  - Manage WebSocket connections
  - Route requests to appropriate handlers
  - CORS handling
  - Error handling

### 2. WebSocket Manager
- **Purpose**: Real-time communication with clients
- **Responsibilities**:
  - Maintain active WebSocket connections
  - Broadcast order updates to all connected clients
  - Handle connection lifecycle (connect, disconnect, error)

### 3. API Routes
- **POST /api/orders/execute**
  - Validate order request
  - Create order object
  - Add to BullMQ queue
  - Return 202 Accepted with order ID

- **GET /api/orders/:orderId**
  - Fetch order from PostgreSQL
  - Return order details
  - Return 404 if not found

- **GET /api/orders**
  - Get queue metrics
  - Return waiting, active, completed, failed counts

### 4. BullMQ Queue
- **Purpose**: Asynchronous order processing with retry logic
- **Configuration**:
  - Max concurrent workers: 10
  - Max retries: 3
  - Backoff strategy: Exponential (1s, 2s, 4s)
  - Rate limit: 100 orders/minute

- **Job Processing**:
  1. Receive order from queue
  2. Pass to Order Execution Service
  3. Handle success/failure
  4. Retry on failure (up to 3 times)
  5. Mark job as complete or failed

### 5. Order Execution Service
- **Purpose**: Core business logic for order execution
- **Responsibilities**:
  - Manage order state transitions
  - Call DEX Router for quotes
  - Execute swaps
  - Update databases
  - Broadcast WebSocket updates

- **State Machine**:
  ```
  pending → routing → building → submitted → confirmed
                                           ↘ failed
  ```

### 6. Mock DEX Router
- **Purpose**: Simulate Raydium and Meteora DEX interactions
- **Responsibilities**:
  - Generate mock quotes from both DEXs
  - Select best quote (highest output)
  - Simulate transaction execution
  - Generate mock transaction signatures

- **Quote Logic**:
  - Raydium: baseRate = 1.5 ± 0.05, fee = 0.3%
  - Meteora: baseRate = 1.48 ± 0.05, fee = 0.25%
  - Price impact: random 0-2% (Raydium), 0-1.5% (Meteora)

### 7. PostgreSQL
- **Purpose**: Permanent order history storage
- **Schema**: See database/postgres.ts
- **Indexes**:
  - order_id (primary key)
  - status (for filtering)
  - wallet_address (for user queries)
  - created_at (for sorting)

### 8. Redis
- **Purpose**: Fast cache and queue backend
- **Usage**:
  - Active order cache (TTL: 1 hour)
  - BullMQ queue storage
  - Set of active order IDs

## Data Flow

### Order Submission Flow
```
1. Client → POST /api/orders/execute
2. Fastify → Validate request (Zod schema)
3. Fastify → Create Order object
4. Fastify → Save to PostgreSQL + Redis
5. Fastify → Add to BullMQ queue
6. Fastify → Return 202 with order ID
7. BullMQ → Pick up job (when worker available)
8. Worker → Call OrderExecutionService
9. Service → Update status to 'routing'
10. Service → Call DEX Router for quotes
11. Router → Return Raydium + Meteora quotes
12. Service → Select best quote
13. Service → Broadcast quote via WebSocket
14. Service → Update status to 'building'
15. Service → Update status to 'submitted'
16. Service → Execute swap on selected DEX
17. Router → Return success + tx signature
18. Service → Update status to 'confirmed'
19. Service → Save to PostgreSQL + Redis
20. Service → Broadcast final status via WebSocket
21. Service → Remove from active orders
```

### WebSocket Update Flow
```
1. Order status changes
2. OrderExecutionService → Create WebSocketMessage
3. Service → Call WebSocketManager.broadcast()
4. Manager → Iterate through all connected clients
5. Manager → Send JSON message to each client
6. Client → Receive and display update
```

### Retry Flow
```
1. Order execution fails
2. BullMQ → Check retry count (< 3)
3. BullMQ → Calculate backoff delay (exponential)
4. BullMQ → Wait for backoff delay
5. BullMQ → Re-queue job
6. Worker → Process order again
7. Repeat up to 3 times
8. If still failing → Mark as permanently failed
```

## Technology Choices

### Why Fastify?
- Fast and lightweight
- Native WebSocket support via plugin
- Excellent TypeScript support
- Schema validation built-in
- Lower overhead than Express

### Why BullMQ?
- Built on Redis (fast, reliable)
- Excellent retry mechanisms
- Concurrent processing support
- Rate limiting built-in
- Job prioritization
- Job status tracking

### Why PostgreSQL + Redis?
- **PostgreSQL**: Permanent storage, complex queries, ACID compliance
- **Redis**: Fast cache, active orders, queue backend, pub/sub
- Best of both worlds: durability + speed

### Why TypeScript?
- Type safety
- Better IDE support
- Catch errors at compile time
- Easier refactoring
- Better documentation

## Performance Characteristics

### Throughput
- **Target**: 100 orders/minute
- **Actual**: Limited by mock processing time (2s)
- **Theoretical Max**: 300 orders/minute (10 workers × 30 seconds)

### Latency
- **API Response**: < 100ms (order submission)
- **Order Processing**: 2-3 seconds (with mock delay)
- **WebSocket Update**: < 50ms
- **Database Query**: < 10ms

### Concurrency
- **Max Concurrent Orders**: 10 (configurable)
- **Queue Size**: Unlimited (limited by Redis memory)
- **WebSocket Connections**: Thousands (limited by system resources)

## Scalability

### Vertical Scaling
- Increase worker count (MAX_CONCURRENT_ORDERS)
- Increase server resources (CPU, RAM)
- Optimize database queries
- Add database connection pooling

### Horizontal Scaling
- Deploy multiple server instances
- Use load balancer (sticky sessions for WebSocket)
- Share Redis instance across servers
- Share PostgreSQL instance across servers
- Queue jobs are distributed automatically

## Security Considerations

### Input Validation
- Zod schema validation on all inputs
- Wallet address format validation
- Numeric range validation (amounts, slippage)

### Error Handling
- Try-catch blocks around all async operations
- Graceful degradation
- Detailed error logging
- User-friendly error messages

### Rate Limiting
- BullMQ rate limiter: 100 orders/minute
- Prevents abuse
- Configurable per environment

## Monitoring and Observability

### Logs
- Fastify built-in logger
- Order submission logs
- Order processing logs
- WebSocket connection logs
- Error logs with stack traces

### Metrics
- Queue metrics (waiting, active, completed, failed)
- Order status distribution
- Success/failure rates
- Processing times

### Health Checks
- `/health` endpoint
- Database connectivity check
- Redis connectivity check
- Queue status check

## Future Enhancements

### Real Solana Integration
- Replace MockDexRouter with real Raydium/Meteora SDKs
- Connect to Solana Devnet
- Handle real transactions
- Implement wallet signing

### Advanced Features
- Order cancellation
- Partial fills
- TWAP orders
- Stop-loss orders
- Order history pagination
- User authentication
- API rate limiting per user
- Transaction fee estimation

### Performance
- Database query optimization
- Add database indexes
- Implement caching strategies
- Connection pooling
- Batch updates

### Operations
- Monitoring dashboard
- Alerting system
- Automated backups
- Deployment automation
- Load testing suite
