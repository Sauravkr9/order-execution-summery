# Deployment Guide

## Local Development

See `SETUP.md` for local development setup.

## Production Deployment Options

### Option 1: Railway (Recommended - Easy)

Railway provides easy deployment with PostgreSQL and Redis add-ons.

1. **Install Railway CLI**
```bash
npm i -g @railway/cli
```

2. **Login and Initialize**
```bash
railway login
railway init
```

3. **Add PostgreSQL and Redis**
```bash
railway add --plugin postgresql
railway add --plugin redis
```

4. **Set Environment Variables**
```bash
railway variables set NODE_ENV=production
railway variables set MOCK_MODE=true
```

5. **Deploy**
```bash
railway up
```

### Option 2: Heroku

1. **Create Heroku App**
```bash
heroku create order-execution-engine
```

2. **Add Add-ons**
```bash
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini
```

3. **Set Environment Variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set MOCK_MODE=true
```

4. **Add Procfile**
```
web: npm start
```

5. **Deploy**
```bash
git push heroku main
```

### Option 3: AWS (EC2 + RDS + ElastiCache)

1. **Launch EC2 Instance**
   - Ubuntu Server 22.04 LTS
   - t3.small or larger
   - Security group: Allow ports 3000, 22

2. **Set up RDS PostgreSQL**
   - PostgreSQL 14
   - db.t3.micro or larger
   - Note endpoint and credentials

3. **Set up ElastiCache Redis**
   - Redis 7.x
   - cache.t3.micro or larger
   - Note endpoint

4. **SSH into EC2 and Setup**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone <your-repo>
cd backend

# Install dependencies
npm install

# Build
npm run build

# Set environment variables
export DATABASE_URL=<rds-endpoint>
export REDIS_URL=<elasticache-endpoint>
export NODE_ENV=production

# Start with PM2
pm2 start dist/server.js --name order-execution
pm2 startup
pm2 save
```

### Option 4: Google Cloud Run

1. **Create Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

2. **Build and Push**
```bash
gcloud builds submit --tag gcr.io/PROJECT-ID/order-execution
```

3. **Deploy**
```bash
gcloud run deploy order-execution \
  --image gcr.io/PROJECT-ID/order-execution \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Environment Variables for Production

Required environment variables:

```env
NODE_ENV=production
PORT=3000

# Database
POSTGRES_HOST=<your-postgres-host>
POSTGRES_PORT=5432
POSTGRES_DB=order_execution
POSTGRES_USER=<your-user>
POSTGRES_PASSWORD=<your-password>

# Redis
REDIS_HOST=<your-redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<your-password>

# Mock Configuration
MOCK_MODE=true
RAYDIUM_SUCCESS_RATE=0.95
METEORA_SUCCESS_RATE=0.95
MOCK_PROCESSING_TIME_MS=2000

# Queue Configuration
MAX_CONCURRENT_ORDERS=10
MAX_RETRIES=3
RETRY_BACKOFF_MS=1000
```

## Post-Deployment Checklist

- [ ] Health endpoint returns 200: `curl https://your-domain/health`
- [ ] Submit test order and verify response
- [ ] Connect to WebSocket and receive updates
- [ ] Check queue metrics endpoint
- [ ] Monitor logs for errors
- [ ] Set up monitoring (New Relic, Datadog, etc.)
- [ ] Configure SSL/TLS certificate
- [ ] Set up backup strategy for PostgreSQL
- [ ] Configure CORS for production domains
- [ ] Set up rate limiting if needed

## Monitoring

### Log Monitoring
```bash
# Using PM2
pm2 logs order-execution

# Using Railway
railway logs

# Using Heroku
heroku logs --tail
```

### Database Monitoring
- Monitor PostgreSQL connections
- Check query performance
- Set up automated backups

### Queue Monitoring
- Monitor BullMQ queue metrics
- Track failed jobs
- Set up alerts for high failure rates

## Scaling

### Horizontal Scaling
- Deploy multiple instances behind a load balancer
- Ensure Redis is shared across instances
- PostgreSQL connection pooling

### Vertical Scaling
- Increase instance size
- Optimize database queries
- Add database indexes

## Security

1. **Enable SSL/TLS**
   - Use HTTPS for API endpoints
   - Use WSS for WebSocket connections

2. **Rate Limiting**
   - Implement rate limiting per IP
   - Prevent abuse

3. **Input Validation**
   - Already implemented with Zod schemas
   - Keep dependencies updated

4. **Database Security**
   - Use strong passwords
   - Enable SSL for database connections
   - Restrict network access

## Troubleshooting

### High Memory Usage
- Increase instance size
- Optimize queue job retention
- Clear old completed jobs

### Slow Response Times
- Check database connection pool
- Optimize database queries
- Increase concurrent workers

### WebSocket Disconnections
- Implement reconnection logic on client
- Use sticky sessions with load balancer
- Increase timeout values

## Backup and Recovery

### PostgreSQL Backup
```bash
# Manual backup
pg_dump -h localhost -U postgres order_execution > backup.sql

# Restore
psql -h localhost -U postgres order_execution < backup.sql
```

### Automated Backups
- Railway: Automatic daily backups
- Heroku: Use Heroku Postgres continuous protection
- AWS RDS: Enable automated backups

## Cost Estimation

### Railway (Starter)
- PostgreSQL: $5/month
- Redis: $5/month
- App hosting: $5/month
- **Total: ~$15/month**

### Heroku (Hobby)
- Dyno: $7/month
- PostgreSQL: $9/month
- Redis: $15/month
- **Total: ~$31/month**

### AWS (Basic)
- EC2 t3.small: ~$15/month
- RDS db.t3.micro: ~$15/month
- ElastiCache t3.micro: ~$12/month
- **Total: ~$42/month**

## Support

For deployment issues:
1. Check application logs
2. Verify environment variables
3. Test database/Redis connectivity
4. Review the README.md and SETUP.md
