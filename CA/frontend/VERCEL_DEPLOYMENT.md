# Vercel Deployment Guide

## Prerequisites
- A Vercel account (sign up at https://vercel.com)
- Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### 1. Push Your Code to Git
```bash
git init
git add .
git commit -m "Initial commit for Vercel deployment"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Import Project to Vercel
1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Vercel will auto-detect the configuration

### 3. Configure Environment Variables
In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

**For Production:**
- `VITE_API_URL` = `https://your-project-name.vercel.app`

**For Preview (optional):**
- `VITE_API_URL` = `https://your-project-name.vercel.app`

### 4. Deploy
Click "Deploy" and Vercel will:
- Build your Vite frontend
- Deploy your Python Flask backend as serverless functions
- Serve everything from the same domain

## How It Works

### Backend (Flask)
- Your Flask app in `backend/python/app.py` becomes a serverless function
- All `/api/*` routes are handled by the Python backend
- The backend runs on-demand (serverless)

### Frontend (React + Vite)
- Built as static files in the `dist` folder
- Served directly from Vercel's CDN
- API calls go to `/api/*` on the same domain (no CORS issues!)

### Environment Variables
- In **development**: API calls go to `http://localhost:5000`
- In **production**: API calls go to `/api/*` on the same Vercel domain

## Local Development

1. Install dependencies:
```bash
npm install
pip install -r backend/python/requirements.txt
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Run backend (in one terminal):
```bash
cd backend/python
python app.py
```

4. Run frontend (in another terminal):
```bash
npm run dev
```

## Vercel CLI (Optional)

Install Vercel CLI for local testing:
```bash
npm i -g vercel
vercel dev  # Test locally with Vercel's environment
vercel      # Deploy to preview
vercel --prod  # Deploy to production
```

## Important Notes

1. **Same Domain**: Both frontend and backend run on the same domain (e.g., `your-app.vercel.app`)
2. **No CORS Issues**: Since everything is on one domain, no CORS configuration needed
3. **Serverless Backend**: Python backend runs on-demand, scales automatically
4. **Free Tier**: Vercel's hobby plan is free for personal projects
5. **Automatic HTTPS**: Vercel provides free SSL certificates

## Troubleshooting

### Backend not working?
- Check Vercel logs in the dashboard
- Ensure `requirements.txt` has all dependencies
- Verify `vercel.json` routes configuration

### Environment variables not working?
- Make sure you added them in Vercel Dashboard
- Redeploy after adding environment variables
- Check variable names match exactly (case-sensitive)

### Build failing?
- Check build logs in Vercel dashboard
- Ensure Node.js version is compatible (>= 18.0.0)
- Verify all dependencies are in `package.json`

## File Structure for Vercel
```
your-project/
├── backend/
│   └── python/
│       ├── app.py           # Backend serverless function
│       └── requirements.txt  # Python dependencies
├── src/                      # React source code
├── public/                   # Static assets
├── dist/                     # Built frontend (auto-generated)
├── vercel.json              # Vercel configuration
├── package.json             # Node.js dependencies
├── vite.config.js           # Vite configuration
└── .vercelignore           # Files to ignore during deployment
```

## Support
For issues, check:
- Vercel Documentation: https://vercel.com/docs
- Vercel Community: https://github.com/vercel/vercel/discussions
