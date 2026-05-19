# Stream Display Fix Guide

## Problem Summary
Your system was showing only 16-17 cameras out of all available cameras. This number varied (sometimes 25-26), and cameras would change randomly.

## Root Cause Analysis

### Primary Issue: Limited Feed Workers
- **Configuration**: Only **1 FEED_WORKER** was configured
- **Design limitation**: Each feed worker handles 10 cameras sequentially (cameras 1-10, 11-20, etc.)
- **With 1 worker**: Only one camera was being processed at a time, causing streams to timeout and disconnect

### Secondary Issues:
1. **No Health Monitoring**: Failed streams were never restarted
2. **No Connection Persistence**: When a stream failed, no recovery mechanism existed
3. **Frame Publishing Bottleneck**: Single Redis client could timeout, blocking all frames
4. **Async Issues**: Frame publishing to websockets wasn't handling disconnections well

## Solution Implemented

### 1. **Increased Feed Workers** (CRITICAL)
```env
# Before:
FEED_WORKERS=1

# After:
FEED_WORKERS=4
```

**Why this works**: 
- With 4 workers, you can handle ~40 cameras in parallel
- Each worker handles 10 cameras independently
- Cameras 1-10 → Worker 1
- Cameras 11-20 → Worker 2
- Cameras 21-30 → Worker 3
- Cameras 31-40 → Worker 4

### 2. **Added Health Monitoring**
New monitoring system automatically detects and restarts failed feeds:
- Monitors all camera feed status via Redis keys
- Restarts any feed marked as inactive when global running flag is True
- Runs periodically to ensure 100% uptime

**New Endpoint**: `/intrusions/restart_failed_feeds` (Admin only)

### 3. **Improved Frame Publishing**
- Added retry logic for Redis connections
- Graceful error handling if publishing fails
- Better connection state management

### 4. **Better Stream Lifecycle Management**
- Streams now use Redis TTL (Time-To-Live) to indicate they're active
- Counter to detect and handle connection timeouts
- More granular logging to track stream health

### 5. **Enhanced WebSocket Management**
- Better error logging when clients disconnect
- Proper cleanup of stale connections
- More stable frame broadcasting

## Implementation Steps

### Step 1: Update Configuration
1. Edit `.env` file
2. Change `FEED_WORKERS=1` to `FEED_WORKERS=4` (or higher if you have >40 cameras)

```bash
cd /home/mis-cell/Desktop/Smart-Campus
nano .env
# Update FEED_WORKERS value and save
```

### Step 2: Restart Workers
Restart your Celery workers to apply the new configuration:

```bash
# If using Docker:
docker-compose down
docker-compose up -d

# If running locally:
pkill -f "celery -A core.celery.full_feed_worker"
# Then restart your worker startup script
bash start_workers.sh 1 4 3  # format: CELERY_WORKERS FEED_WORKERS LICENSE_WORKERS
```

### Step 3: Start All Camera Feeds
Via API or Frontend:

```bash
# Using curl:
curl -X GET "http://localhost:8000/intrusions/start_all_feed_workers" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Or through the frontend UI:
# Click "Start All Feeds" button
```

### Step 4: Monitor Stream Health
Check which cameras are currently streaming:

```bash
curl -X GET "http://localhost:8000/intrusions/feed_health_check" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Response example:
```json
{
  "total_cameras": 30,
  "active_streams": 30,
  "inactive_streams": [],
  "cameras": [
    {
      "id": 1,
      "name": "Camera 1",
      "running": true,
      "websocket_active": true
    },
    ...
  ]
}
```

### Step 5: Enable Auto-Recovery
To enable automatic recovery of failed feeds, set up a periodic task. Add this to your crontab or use a scheduler:

```bash
# Every 30 seconds, check and restart failed feeds
*/1 * * * * curl -X POST "http://localhost:8000/intrusions/restart_failed_feeds" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Recommended Configuration by Camera Count

| Cameras | FEED_WORKERS | Notes |
|---------|--------------|-------|
| 1-10    | 1            | Minimum |
| 11-20   | 2            | Parallel processing |
| 21-30   | 3            | Good performance |
| 31-50   | 4            | Recommended |
| 51-100  | 5-7          | High load |
| 100+    | 8-10         | Very high load |

**Note**: Each worker uses significant resources. Balance between coverage and CPU/memory usage.

## Troubleshooting

### Streams Still Not Showing All Cameras

1. **Check Health Status**:
```bash
curl -X GET "http://localhost:8000/intrusions/feed_health_check" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

2. **Check Feed Worker Logs**:
```bash
# Docker:
docker logs smart-campus-worker-1 | grep -i "feed_worker"

# Local:
# Check your worker output for errors
```

3. **Increase FEED_WORKERS Further**:
- If many cameras are still inactive, increase `FEED_WORKERS`
- Restart workers after changing the value

4. **Check Camera Connectivity**:
```bash
# Test individual camera:
curl -X POST "http://localhost:8000/camera/1/test_connection" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### High Memory Usage

- Reduce `FEED_WORKERS` by 1
- Check if multiple browser tabs are creating excessive WebSocket connections
- Monitor frame publishing performance

### Cameras Keep Disconnecting

1. Check network stability to cameras
2. Increase timeout values in camera settings
3. Check if there are many failed reconnection attempts in logs

## Performance Tuning

### For Better Performance:

1. **Enable Hardware Acceleration**:
```bash
# In .env:
GST_HW_DECODER=nvidia  # For NVIDIA GPU
# or
GST_HW_DECODER=intel   # For Intel iGPU
```

2. **Reduce Frame Size**:
```bash
# In .env:
FEED_DIMS=(640,480)    # Current
# Change to:
FEED_DIMS=(480,360)    # Smaller = faster
```

3. **Adjust FPS**:
```bash
# In .env:
FEED_FPS=10            # Current (frames per second)
# Change to:
FEED_FPS=5             # Lower = less bandwidth
```

## New Features Available

### 1. Health Check Endpoint
- **URL**: `/intrusions/feed_health_check`
- **Method**: GET
- **Returns**: Status of all camera feeds

### 2. Restart Failed Feeds Endpoint
- **URL**: `/intrusions/restart_failed_feeds`
- **Method**: POST
- **Returns**: Task ID for monitoring

### 3. Monitoring in Logs
- Each camera now logs when it starts/stops
- Connection failures are logged with details
- Frame publishing issues are tracked

## Expected Results

After implementing these fixes:
- ✅ **All cameras will stream simultaneously**
- ✅ **No random disconnections**
- ✅ **Automatic recovery of failed streams**
- ✅ **Better performance and stability**
- ✅ **Detailed health monitoring**

## Verification Checklist

- [ ] Updated `.env` with new `FEED_WORKERS` value
- [ ] Restarted all workers
- [ ] Started all camera feeds
- [ ] Checked health status shows all cameras active
- [ ] Monitored streams for 5+ minutes (no disconnections)
- [ ] Tested manual restart endpoint
- [ ] Set up periodic health checks (optional but recommended)

## Support

If issues persist after implementing these changes:

1. Check worker logs for connection errors
2. Verify all cameras are accessible from the server
3. Check Redis connectivity and performance
4. Ensure sufficient system resources (CPU, memory, network bandwidth)
5. Review detailed logs in `/var/log/celery/` or your logging directory

---

**Updated**: May 19, 2026
**Version**: 1.0
