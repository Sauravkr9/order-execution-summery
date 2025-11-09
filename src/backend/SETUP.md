# Setup Guide - Order Execution Engine

## Quick Start with Docker

The easiest way to get started is using Docker Compose:

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Install dependencies
npm install

# Run in development mode
npm run dev
```

The server will start on `http://localhost:3000`

## Manual Setup

### 1. Install Prerequisites

- **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/)
- **PostgreSQL 14+**: Download from [postgresql.org](https://www.postgresql.org/download/)
- **Redis 7+**: Download from [redis.io](https://redis.io/download)

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings.

### 4. Start Database Services

**PostgreSQL:**
```bash
# On macOS (using Homebrew)
brew services start postgresql@14

# On Linux (using systemd)
sudo systemctl start postgresql

# Create database
psql -U postgres -c "CREATE DATABASE order_execution;"
```

**Redis:**
```bash
# On macOS (using Homebrew)
brew services start redis

# On Linux (using systemd)
sudo systemctl start redis
```

### 5. Run the Application

**Development mode (with hot reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

## Verification

### 1. Check Health Endpoint
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-11-09T10:30:00.000Z"}
```

### 2. Submit Test Order
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

### 3. Test WebSocket Connection

Create a file `test-ws.js`:
```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('WebSocket connected');
});

ws.on('message', (data) => {
  console.log('Received:', JSON.parse(data));
});

ws.on('error', (error) => {
  console.error('Error:', error);
});
```

Run it:
```bash
node test-ws.js
```

## Testing with Postman

1. Import `postman_collection.json` into Postman
2. Set the `baseUrl` variable to `http://localhost:3000`
3. Run the collection tests

## Troubleshooting

### Port 3000 Already in Use
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or change port in .env
PORT=3001
```

### PostgreSQL Connection Failed
```bash
# Check if PostgreSQL is running
pg_isready

# Check connection
psql -U postgres -h localhost -p 5432
```

### Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping

# Should return: PONG
```

### BullMQ Queue Issues
```bash
# Clear Redis data
redis-cli FLUSHALL
```

### TypeScript Errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## Next Steps

- Import Postman collection for API testing
- Connect WebSocket client for real-time updates
- Review the API documentation in README.md
- Deploy to production (see deployment guide)

## Support

For issues or questions, please refer to:
- README.md for API documentation
- Assignment specification for requirements
- GitHub issues for bug reports
