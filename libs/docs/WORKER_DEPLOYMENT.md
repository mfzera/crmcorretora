# Worker Deployment Guide

The background worker has been integrated into the API application for simplified deployment.

## 🎯 What It Does

The worker handles automatic background tasks:
- **Renewal Detection**: Daily at 3:00 AM - automatically creates renewal records for expiring policies
- **Urgent Notifications**: Hourly (9 AM - 6 PM) - notifies sales reps about urgent renewals

## 🚀 Deployment on Render

### Option 1: Using Render Redis (Recommended for Testing)

Render doesn't offer a free Redis service anymore, but you can use their paid Redis add-on:

1. **Add Redis to your Render service:**
   - Go to your Render dashboard
   - Navigate to your `ecotech-api` service
   - Click "Environment" → "Add Environment Variable"
   - Add a Redis add-on or use an external Redis provider

### Option 2: Using Upstash Redis (Free Tier Available)

1. **Create a free Upstash account:**
   - Go to https://upstash.com/
   - Create a new Redis database
   - Copy the connection details

2. **Add environment variables in Render:**
   ```bash
   REDIS_HOST=your-redis-host.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password
   ```

### Option 3: Using Redis Cloud (Free 30MB)

1. **Create a Redis Cloud account:**
   - Go to https://redis.com/try-free/
   - Create a new database
   - Copy connection details

2. **Add environment variables in Render:**
   ```bash
   REDIS_HOST=redis-xxxxx.cloud.redislabs.com
   REDIS_PORT=12345
   REDIS_PASSWORD=your-password
   ```

### Option 4: Disable Worker (Fallback)

If you don't need background jobs immediately, the API will continue to work without Redis. The worker initialization will fail gracefully and log a warning, but the API will remain functional.

## 🔧 Local Development

1. **Install and run Redis locally:**
   ```bash
   # Using Docker (recommended)
   docker run -d --name redis -p 6379:6379 redis:7-alpine
   
   # Or using Homebrew (macOS)
   brew install redis
   brew services start redis
   ```

2. **Set environment variables:**
   ```bash
   # .env file
   REDIS_HOST=localhost
   REDIS_PORT=6379
   # REDIS_PASSWORD= (leave empty for local)
   ```

3. **Start the API:**
   ```bash
   pnpm dev:api
   ```

   You should see logs like:
   ```
   🚀 Initializing background worker...
   📡 Connecting to Redis...
   ✅ Redis connected
   ✅ Workers initialized
   ✅ Scheduled jobs configured
   ```

## 📊 Monitoring

Check your API logs to see when jobs execute:
```
🔄 Processando job: detect-renewals-daily [job-id-12345]
✅ Job concluído: detect-renewals-daily em 2340ms
📈 Resultado: {
  totalRenewalsCreated: 15,
  tenantsProcessed: 3
}
```

## 🐛 Troubleshooting

### Worker fails to initialize
- Check if Redis is accessible
- Verify REDIS_HOST, REDIS_PORT, and REDIS_PASSWORD are correct
- The API will continue to work, but background jobs won't run

### Jobs not executing
- Verify Redis connection is stable
- Check API logs for error messages
- Ensure the container/server time is correct (affects cron scheduling)

## 💡 Benefits of This Approach

✅ **Single Deployment**: No need to manage separate worker service
✅ **Shared Code**: Worker uses the same codebase as API
✅ **Simplified Config**: One set of environment variables
✅ **Cost Effective**: Single container/instance instead of two
✅ **Easier Monitoring**: All logs in one place

## ⚠️ Considerations

- For high-volume workloads, consider separating the worker into its own service
- Single point of failure: if API crashes, worker stops too
- Resource sharing: worker jobs consume API container resources

For most small-to-medium applications, this integrated approach is perfectly fine!
