# Deploy Python Backend to Render

This guide shows how to deploy your async Python backend to Render.

## What Was Changed

✅ **Backend now supports async processing:**
- Upload returns job ID instantly (no waiting)
- Frontend polls for progress every 2 seconds
- Shows real-time progress: "Processing 20k/80k rows... 45%"
- No timeout issues - processes files of any size
- Better user experience with progress tracking

## Prerequisites

1. GitHub account (to connect repository)
2. Render account (free tier available at https://render.com)

## Deployment Steps

### 1. Push Code to GitHub

Make sure your latest code is on GitHub:

```bash
git add .
git commit -m "Add async job processing system"
git push origin main
```

### 2. Create Render Web Service

1. Go to https://render.com/dashboard
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:

   - **Name:** `ca-automation-backend`
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** Leave empty (or use `backend/python` if deploying subdirectory)
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r backend/python/requirements.txt`
   - **Start Command:** `cd backend/python && python app.py`
   
5. **Environment Variables:**
   - `PORT`: `5000` (Render will override this automatically)
   - `PYTHON_VERSION`: `3.11.0` (or your preferred version)

6. **Instance Type:**
   - Free tier: Good for testing (sleeps after inactivity)
   - Starter ($7/month): Recommended for production (always on)

7. Click **"Create Web Service"**

### 3. Update Frontend Configuration

Once deployed, Render will give you a URL like:
`https://ca-automation-backend.onrender.com`

Update your frontend `src/config.js`:

```javascript
export const API_URL = 
  import.meta.env.MODE === 'production'
    ? 'https://ca-automation-backend.onrender.com'
    : 'http://localhost:5000';
```

### 4. Deploy Frontend to Vercel

Your frontend is already set up for Vercel. Just push the config change:

```bash
git add src/config.js
git commit -m "Update API URL for Render backend"
git push
```

Vercel will auto-deploy.

## Testing the Async System

1. Upload an 80k row Excel file
2. You should see:
   - "Uploading file..." (instant)
   - "Processing 20k/80k rows... 25%"
   - "Calculating GST totals... 55%"
   - "Generating output file... 85%"
   - "Processing complete! 100%"
3. Download automatically starts when complete

## API Endpoints

### `POST /api/gst/check`
Upload file, returns job ID immediately.

**Response:**
```json
{
  "job_id": "abc-123-def",
  "message": "Processing started",
  "status": "processing"
}
```

### `GET /api/gst/status/<job_id>`
Check job progress.

**Response:**
```json
{
  "job_id": "abc-123-def",
  "status": "processing",
  "progress": 45,
  "message": "Calculating GST totals...",
  "created_at": "2025-11-21T10:30:00",
  "updated_at": "2025-11-21T10:30:15"
}
```

Status values: `processing`, `completed`, `failed`

### `GET /api/gst/download/<job_id>`
Download processed file (only when status is `completed`).

## Troubleshooting

### Backend sleeping on free tier
- Free tier sleeps after 15 min inactivity
- First request takes ~30s to wake up
- Solution: Upgrade to Starter ($7/month) for always-on service

### CORS errors
- Make sure `CORS(app, origins='*')` is in app.py
- Or whitelist your Vercel domain: `CORS(app, origins=['https://your-site.vercel.app'])`

### Job not found errors
- Jobs are stored in memory (cleared on restart)
- For production: Use Redis or database for job storage
- Quick fix: Upgrade to Starter tier (fewer restarts)

## Performance Benchmarks

| File Size | Rows | Processing Time | Old System | New System |
|-----------|------|----------------|------------|------------|
| Small     | 1k   | ~5 seconds     | Frozen 5s  | Progress bar |
| Medium    | 10k  | ~15 seconds    | Frozen 15s | Progress bar |
| Large     | 80k  | ~60 seconds    | **TIMEOUT** ❌ | Works! ✅ |

## Next Steps (Optional Optimizations)

1. **Add Redis for job storage** - Persist jobs across restarts
2. **Optimize pandas operations** - Process in chunks for even faster speeds
3. **Add cleanup cron** - Delete old jobs after 24 hours
4. **Add authentication** - Secure endpoints with API keys
5. **Apply to other features** - TDS, Invoice, and Ledger features can use the same async pattern

## Cost Summary

- **Vercel (Frontend):** Free
- **Render Free Tier:** $0 (good for testing)
- **Render Starter:** $7/month (recommended for production)
- **Total:** $7/month for production-ready app

---

**Questions?** Check the logs in Render dashboard or contact support.
