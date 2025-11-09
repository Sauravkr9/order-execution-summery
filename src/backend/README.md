# Order Execution Engine - Backend Task 2

A high-performance order execution engine for Solana DEX trading with support for Raydium and Meteora pools.

## Features

- Market and Limit order types
- DEX routing (Raydium & Meteora)
- Real-time WebSocket status updates
- Queue-based concurrent processing (up to 10 orders)
- Automatic retry with exponential backoff (up to 3 attempts)
- 100 orders/minute throughput
- PostgreSQL for order history
- Redis for active order tracking
- Mock implementation for testing

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Fastify (with WebSocket support)
- **Queue**: BullMQ + Redis
- **Database**: PostgreSQL + Redis
- **DEX Integration**: Mock DEX Router (Raydium & Meteora)

## Prerequisites

- Node.js v18+ 
- PostgreSQL 14+
- Redis 7+
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development

REDIS_HOST=localhost
REDIS_PORT=6379

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=order_execution
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

MOCK_MODE=true
```

4. Start PostgreSQL and Redis:
```bash
# Using Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:14
docker run -d -p 6379:6379 redis:7
```

5. Run the application:
```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

## API Endpoints

### 1. Submit Order
**POST** `/api/orders/execute`

Submit a new order for execution.

**Request Body:**
```json
{
  "walletAddress": "6xKS8hCXqh5VCBKhNJ6YJJqzqGwKCyp8CYVDJqmz3Lez",
  "tokenIn": "So11111111111111111111111111111111111111112",
  "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amountIn": 1.5,
  "orderType": "market",
  "slippage": 1.0
}
```

**Response (202 Accepted):**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Order submitted successfully"
}
```

### 2. Get Order Status
**GET** `/api/orders/:orderId`

Retrieve order details and current status.

**Response (200 OK):**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "confirmed",
  "walletAddress": "6xKS8hCXqh5VCBKhNJ6YJJqzqGwKCyp8CYVDJqmz3Lez",
  "tokenIn": "So11111111111111111111111111111111111111112",
  "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amountIn": 1.5,
  "orderType": "market",
  "slippage": 1.0,
  "selectedDex": "raydium",
  "quote": {
    "dex": "raydium",
    "amountOut": 2.245,
    "priceImpact": 0.8,
    "fee": 0.0045,
    "route": ["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"]
  },
  "txSignature": "5j7s6NiJS3JAkvgkoc18WVAsiSaci2pxB2A6ueCJP4tprA2TFg9wSyTLeYouxPBJEMzJinENTkpA52YStRW5Dia7",
  "retryCount": 0,
  "createdAt": "2025-11-09T10:30:00.000Z",
  "updatedAt": "2025-11-09T10:30:05.000Z"
}
```

### 3. Get Queue Metrics
**GET** `/api/orders`

Get current queue status and metrics.

**Response (200 OK):**
```json
{
  "waiting": 5,
  "active": 10,
  "completed": 234,
  "failed": 12,
  "total": 261
}
```

## WebSocket

Connect to `ws://localhost:3000/ws` for real-time order updates.

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Order update:', update);
};
```

### Message Format
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "routing",
  "timestamp": "2025-11-09T10:30:02.000Z",
  "quote": {
    "dex": "raydium",
    "amountOut": 2.245,
    "priceImpact": 0.8,
    "fee": 0.0045,
    "route": ["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"]
  },
  "selectedDex": "raydium"
}
```

## Order Status Flow

1. **pending** → Order received and queued
2. **routing** → Fetching quotes from DEXs
3. **building** → Building transaction
4. **submitted** → Transaction submitted to blockchain
5. **confirmed** → Transaction confirmed 
6. **failed** → Transaction failed 

## Testing

### Using cURL

**Submit Market Order:**
```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "6xKS8hCXqh5VCBKhNJ6YJJqzqGwKCyp8CYVDJqmz3Lez",
    "tokenIn": "So11111111111111111111111111111111111111112",
    "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amountIn": 1.5,
    "orderType": "market",
    "slippage": 1.0
  }'
```

**Submit Limit Order:**
```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "6xKS8hCXqh5VCBKhNJ6YJJqzqGwKCyp8CYVDJqmz3Lez",
    "tokenIn": "So11111111111111111111111111111111111111112",
    "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amountIn": 1.5,
    "orderType": "limit",
    "slippage": 1.0,
    "limitPrice": 1.48
  }'
```

**Get Order Status:**
```bash
curl http://localhost:3000/api/orders/550e8400-e29b-41d4-a716-446655440000
```

### Using Postman

Import the provided Postman collection in `postman_collection.json` for comprehensive testing.

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ├─── HTTP (POST /api/orders/execute)
       │
       └─── WebSocket (/ws)
              │
       ┌──────▼──────┐
       │   Fastify   │
       │   Server    │
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │   BullMQ    │
       │    Queue    │
       └──────┬──────┘
              │
       ┌──────▼──────────┐
       │ Order Execution │
       │    Service      │
       └──────┬──────────┘
              │
       ┌──────▼──────┐
       │  Mock DEX   │
       │   Router    │
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │  PostgreSQL │
       │  +  Redis   │
       └─────────────┘
```

## Configuration

### Queue Settings
- **Max Concurrent Orders**: 10
- **Max Retries**: 3
- **Retry Backoff**: Exponential (starting at 1000ms)
- **Throughput**: 100 orders/minute

### Mock DEX Settings
- **Raydium Success Rate**: 95%
- **Meteora Success Rate**: 95%
- **Processing Time**: 2000ms (simulated)

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use managed PostgreSQL (AWS RDS, Supabase, etc.)
3. Use managed Redis (AWS ElastiCache, Redis Cloud, etc.)
4. Deploy to cloud platform (AWS, GCP, Heroku, Railway, etc.)
5. Set up monitoring and logging
6. Configure SSL/TLS for WebSocket connections

## Troubleshooting

**Redis Connection Error:**
```
Ensure Redis is running: redis-cli ping
```

**PostgreSQL Connection Error:**
```
Check PostgreSQL status: pg_isready
```

**Port Already in Use:**
```
Change PORT in .env or kill process: lsof -ti:3000 | xargs kill
```
