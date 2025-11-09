# Quick Start Guide

Get the Order Execution Engine running in under 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Docker installed (easiest option)

## Option 1: Docker (Recommended)

### Step 1: Start Services
```bash
cd backend
docker-compose up -d
```

This starts PostgreSQL and Redis in Docker containers.

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Setup Environment
```bash
cp .env.example .env
```

No need to edit `.env` - defaults work with Docker!

### Step 4: Start Server
```bash
npm run dev
```

You should see:
```
PostgreSQL initialized
Order queue initialized
Server listening on port 3000
```

### Step 5: Test It!

**Open a new terminal and test:**
```bash
# Test health
curl http://localhost:3000/health

# Submit an order
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

You should get a response with an `orderId`!

### Step 6: Watch Real-Time Updates
```bash
node test-websocket.js
```

Submit another order and watch it update in real-time! 🚀

## Option 2: Manual Setup

If you prefer not to use Docker:

### Step 1: Install PostgreSQL
```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# Ubuntu
sudo apt install postgresql-14
sudo systemctl start postgresql

# Create database
psql -U postgres -c "CREATE DATABASE order_execution;"
```

### Step 2: Install Redis
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt install redis
sudo systemctl start redis
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Setup Environment
```bash
cp .env.example .env
```

Edit `.env` if your PostgreSQL/Redis use different credentials.

### Step 5: Start Server
```bash
npm run dev
```

### Step 6: Test
Same as Option 1, Step 5!

## What's Next?

### Run All Tests
```bash
node test-api.js
```

### Import Postman Collection
1. Open Postman
2. Import `postman_collection.json`
3. Run all tests

### Explore the API
- Health: `GET /health`
- Submit Order: `POST /api/orders/execute`
- Get Order: `GET /api/orders/:orderId`
- Queue Metrics: `GET /api/orders`
- WebSocket: `ws://localhost:3000/ws`

### Read Documentation
- `README.md` - Full API documentation
- `ARCHITECTURE.md` - System design
- `TESTING.md` - Testing guide
- `DEPLOYMENT.md` - Deploy to production

## Troubleshooting

### "Port 3000 already in use"
```bash
# Change port in .env
PORT=3001
```

### "Cannot connect to PostgreSQL"
```bash
# Check if PostgreSQL is running
docker ps  # Should show postgres container
# OR
pg_isready
```

### "Cannot connect to Redis"
```bash
# Check if Redis is running
docker ps  # Should show redis container
# OR
redis-cli ping  # Should return PONG
```

### Still stuck?
Check `SETUP.md` for detailed troubleshooting steps.

## Demo for Assignment

### 1. Start Everything
```bash
# Terminal 1: Start databases
docker-compose up -d

# Terminal 2: Start server
npm run dev

# Terminal 3: Start WebSocket client
node test-websocket.js
```

### 2. Submit Orders
```bash
# Terminal 4: Submit orders
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

### 3. Watch Updates
Watch Terminal 3 for real-time status updates!

### 4. Check Status
```bash
# Get the orderId from step 2, then:
curl http://localhost:3000/api/orders/YOUR_ORDER_ID
```

### 5. Run Postman Tests
- Open Postman
- Import `postman_collection.json`
- Run collection (should have 10+ tests)
- All tests should pass 

## Clean Up

### Stop Everything
```bash
# Stop server (Ctrl+C in Terminal 2)

# Stop Docker containers
docker-compose down

# Remove data (optional)
docker-compose down -v
```

## Next Steps

You now have a working Order Execution Engine!

- Explore the code in `src/`
- Read the architecture documentation
- Try load testing with Apache Bench
- Deploy to Railway or Heroku
- Star the repository 


