# 🚀 EVENTOS Fullstack Platform - Deployment Guide

This guide walks you through deploying EVENTOS with:
- **Backend (Express API)** on **Render** (or Railway / Fly.io)
- **Frontend (Vanilla Web App)** on **Vercel** (or Netlify / GitHub Pages)

---

## 📦 Part 1: Deploy Backend to Render (Free Web Service)

1. **Push your code to GitHub / GitLab:**
   - Initialize git (if not already):
     `ash
     git init
     git add .
     git commit -m Initial commit for EVENTOS platform
     git branch -M main
     git remote add origin <YOUR_GITHUB_REPO_URL>
     git push -u origin main
     `

2. **Create a Web Service on Render:**
   - Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** -> **Web Service**.
   - Connect your GitHub repository.
   - Configure the following settings:
     - **Name:** eventos-backend
     - **Root Directory:** eventos_fullstack_platform/backend (or ackend if repo root is the project)
     - **Runtime:** Node
     - **Build Command:** 
pm install
     - **Start Command:** 
ode server.js
     - **Instance Type:** Free
   - Add Environment Variable (Optional):
     - NODE_ENV: production
   - Click **Deploy Web Service**.

3. **Get your Live Backend URL:**
   - Once deployed, Render will provide a URL like:
     https://eventos-backend-xxxx.onrender.com
   - Verify it by opening https://eventos-backend-xxxx.onrender.com/health in your browser. It should return {status:ok}.

---

## 🌐 Part 2: Deploy Frontend to Vercel

1. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
   - Import your GitHub repository.
   - Set **Root Directory** to eventos_fullstack_platform (or ./ if your repo is at root).
   - Framework Preset: **Other**
   - Click **Deploy**.

2. **Connect Frontend to Backend:**
   - Open your deployed Vercel site (e.g. https://eventos-platform.vercel.app).
   - Click on the **API** indicator dot in the top navigation bar.
   - Enter your Render backend URL with /api (e.g. https://eventos-backend-xxxx.onrender.com/api).
   - Click **Save & Connect**.
   - The dot will turn **Green (Live)**!

*(Alternative)* You can also share the URL with the parameter pre-filled:
`
https://eventos-platform.vercel.app/?api=https://eventos-backend-xxxx.onrender.com/api
`

---

## ⚡ Alternative: Deploy Frontend to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) and select **Add new site** -> **Import an existing project**.
2. Select your repository and set base directory to eventos_fullstack_platform.
3. Publish directory: . (the 
etlify.toml will handle routing and headers).
4. Click **Deploy Site**.

---

## 🧪 Local Testing Before Deploying

To run both locally:
1. **Start Backend:**
   `ash
   cd backend
   npm install
   node server.js
   `
   *(Running at http://localhost:3001)*

2. **Start Frontend:**
   `ash
   # From the project root:
   python -m http.server 8000
   # OR: npx serve .
   `
   *(Open http://localhost:8000)*
