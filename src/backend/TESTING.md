# Testing Guide

## Quick Test

After starting the server, run the automated test script:

```bash
node test-api.js
```

This will test all API endpoints and display results.

## Manual Testing

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-09T10:30:00.000Z"
}
```

### 2. Submit Market Order

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

Expected response (202 Accepted):
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Order submitted successfully"
}
```

### 3. Submit Limit Order

```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "6xKS8hCXqh5VCBKhNJ6YJJqzqGwKCyp8CYVDJqmz3Lez",
    "tokenIn": "So11111111111111111111111111111111111111112",
    "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amountIn": 2.0,
    "orderType": "limit",
    "slippage": 0.5,
    "limitPrice": 1.48
  }'
```

### 4. Get Order Status

```bash
# Replace ORDER_ID with actual order ID from step 2
curl http://localhost:3000/api/orders/ORDER_ID
```

Expected response (200 OK):
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

### 5. Get Queue Metrics

```bash
curl http://localhost:3000/api/orders
```

Expected response (200 OK):
```json
{
  "waiting": 5,
  "active": 2,
  "completed": 150,
  "failed": 8,
  "total": 165
}
```

## WebSocket Testing

### Using Node.js

Run the WebSocket test client:

```bash
node test-websocket.js
```

Then submit an order in another terminal and watch real-time updates.

### Using Browser Console

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Order update:', data);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket closed');
};
```

### Using wscat

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:3000/ws
```

## Postman Testing

### Import Collection

1. Open Postman
2. Click "Import"
3. Select `postman_collection.json`
4. Click "Import"

### Set Variables

1. Go to collection settings
2. Set `baseUrl` to `http://localhost:3000`
3. Save

### Run Collection

1. Click "Run collection"
2. Select all tests
3. Click "Run Order Execution Engine API"

All tests should pass 

## Load Testing

### Using Apache Bench

```bash
# Install Apache Bench
# macOS: brew install httpd
# Ubuntu: sudo apt-get install apache2-utils

# Test with 100 requests, 10 concurrent
ab -n 100 -c 10 -T 'application/json' \
  -p order.json \
  http://localhost:3000/api/orders/execute
```

Create `order.json`:
```json
{
  "walletAddress": "6xKS8hCXqh5VCBKhNJ6YJJqzqGwKCyp8CYVDJqmz3Lez",
  "tokenIn": "So11111111111111111111111111111111111111112",
  "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amountIn": 1.0,
  "orderType": "market",
  "slippage": 1.0
}
```

### Using Artillery

```bash
# Install Artillery
npm install -g artillery

# Create artillery.yml
artillery quick --count 100 --num 10 http://localhost:3000/health
```

## Error Testing

### Test Invalid Wallet Address

```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "invalid",
    "tokenIn": "So11111111111111111111111111111111111111112",
    "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amountIn": 1.5,
    "orderType": "market",
    "slippage": 1.0
  }'
```

Expected: 400 Bad Request

### Test Missing Required Fields

```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "6xKS8hCXqh5VCBKhNJ6YJJqzqGwKCyp8CYVDJqmz3Lez",
    "tokenIn": "So11111111111111111111111111111111111111112"
  }'
```

Expected: 400 Bad Request

### Test Limit Order Without Price

```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "6xKS8hCXqh5VCBKhNJ6YJJqzqGwKCyp8CYVDJqmz3Lez",
    "tokenIn": "So11111111111111111111111111111111111111112",
    "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amountIn": 1.5,
    "orderType": "limit",
    "slippage": 1.0
  }'
```

Expected: 400 Bad Request

### Test Negative Amount

```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "6xKS8hCXqh5VCBKhNJ6YJJqzqGwKCyp8CYVDJqmz3Lez",
    "tokenIn": "So11111111111111111111111111111111111111112",
    "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amountIn": -1.5,
    "orderType": "market",
    "slippage": 1.0
  }'
```

Expected: 400 Bad Request

### Test Non-Existent Order

```bash
curl http://localhost:3000/api/orders/non-existent-id
```

Expected: 404 Not Found

## Performance Benchmarks

Expected performance on standard hardware:

- **Throughput**: 100 orders/minute
- **Concurrent Processing**: 10 orders simultaneously
- **Average Response Time**: < 200ms for API endpoints
- **Order Processing Time**: 2-3 seconds (with mock 2s delay)
- **WebSocket Latency**: < 50ms

## Test Checklist

- [ ] Health endpoint returns 200
- [ ] Can submit market order
- [ ] Can submit limit order
- [ ] Can retrieve order status
- [ ] Can get queue metrics
- [ ] WebSocket connects successfully
- [ ] WebSocket receives order updates
- [ ] Invalid orders are rejected (400)
- [ ] Non-existent orders return 404
- [ ] Limit orders without price fail
- [ ] Negative amounts are rejected
- [ ] Concurrent orders process correctly
- [ ] Failed orders retry up to 3 times
- [ ] Queue metrics are accurate
- [ ] PostgreSQL stores order history
- [ ] Redis caches active orders

## Debugging

### View Logs

```bash
# Development mode (console)
npm run dev

# Production mode with PM2
pm2 logs order-execution
```

### Check PostgreSQL

```bash
psql -U postgres -d order_execution

# View orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;

# Count orders by status
SELECT status, COUNT(*) FROM orders GROUP BY status;
```

### Check Redis

```bash
redis-cli

# View active orders
SMEMBERS active_orders

# View specific order
GET order:550e8400-e29b-41d4-a716-446655440000
```

### Check BullMQ Queue

```bash
redis-cli

# View queue jobs
KEYS bull:order-execution:*
```

## Common Issues

### Orders Not Processing

1. Check Redis is running: `redis-cli ping`
2. Check PostgreSQL is running: `pg_isready`
3. Check server logs for errors
4. Verify queue worker is running

### WebSocket Not Connecting

1. Ensure server is running
2. Check firewall settings
3. Verify WebSocket URL (ws:// not http://)

### High Failure Rate

1. Check mock success rates in .env
2. Review error logs
3. Check database connection pool

## Video Demo Script

For the assignment video demo, follow this script:

1. **Show running server**
   ```bash
   npm run dev
   ```

2. **Test health endpoint**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Open WebSocket client**
   ```bash
   node test-websocket.js
   ```

4. **Submit order and show real-time updates**
   ```bash
   curl -X POST http://localhost:3000/api/orders/execute ...
   ```

5. **Show order status**
   ```bash
   curl http://localhost:3000/api/orders/ORDER_ID
   ```

6. **Show queue metrics**
   ```bash
   curl http://localhost:3000/api/orders
   ```

7. **Show Postman collection**
   - Run all tests
   - Show results

8. **Show database**
   ```sql
   SELECT * FROM orders;
   ```
