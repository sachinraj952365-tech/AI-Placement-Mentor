# 🎨 AI Placement Mentor - Frontend Portal

This directory contains the client-side user interface of the **AI Placement Mentor** application. It is a single-page application (SPA) built using **React** and compiled with **Vite** for fast hot-module-replacement (HMR).

The user interface follows a modern **dark-mode glassmorphism** design theme with smooth transition animations, responsive layout grids, and interactive placement preparation dashboards.

---

## 🚀 Key Features

*   **State-driven Dashboard**: Smooth navigation between Dashboard, AI Chat, Resume Reviews, Placement Roadmaps, Mock Interviews, and Progress Analytics.
*   **ATS Resume Analysis View**: Handles local file selections (`.pdf`), uploads them to the server, and renders detailed ATS feedback along with visual progress meters.
*   **Interactive Roadmap Checklist**: A task checklist component connected to the database to mark roadmap milestones as completed or pending in real-time.
*   **Dual Mock Interview Portals**: Dedicated chat panels for **Technical Interviews** and **HR Interviews** displaying active session histories, score metrics, and final evaluation reports.
*   **Micro-animations**: Interactive hover effects, glow states, modal fade-ins, and animated loading indicators for a premium user experience.

---

## 🛠️ Tech Stack & Utilities

*   **Core**: React 18 (Hooks, state routers)
*   **Bundler**: Vite 5 (Fast dev server with server proxies)
*   **Styling**: Custom Vanilla CSS3 (Design variables, flexbox, grid, glass cards)
*   **Iconography**: Lucide React Icons
*   **Linter**: Oxlint (For high-speed JavaScript code linting)

---

## 📂 Frontend Structure

```text
frontend/
├── public/
│   ├── favicon.svg      # Page favicon
│   └── icons.svg        # Scalable Vector Graphics assets
├── src/
│   ├── assets/          # Static assets (images, badges)
│   ├── App.jsx          # Central layout, application state, and sub-views
│   ├── App.css          # Tab layout structures and panel alignments
│   ├── index.css        # Global CSS variables, scrollbars, and design system variables
│   └── main.jsx         # React DOM entry point
├── index.html           # Main HTML loader
├── vite.config.js       # Vite configuration with API Proxy setup
├── .gitignore           # File excludes for Git
├── .oxlintrc.json       # Linter preferences for Oxlint
├── package.json         # Node package configuration & scripts
└── README.md            # Frontend documentation (This file)
```

---

## ⚙️ Development Scripts

Navigate to the `frontend/` directory and run:

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
By default, the client starts at **http://localhost:5173**. 
*Note: Vite is pre-configured to proxy all requests sent to `/api` to the backend running at `http://localhost:8000` automatically.*

### 3. Build for Production
```bash
npm run build
```
This generates the optimized, production-ready static bundle inside the `dist/` directory, which is served by FastAPI or Vercel.

### 4. Code Linting
```bash
npm run lint
```
Runs Oxlint compiler checking for syntax and code errors.

---

## 🔧 Vite Configuration & Proxying
To prevent Cross-Origin Resource Sharing (CORS) issues in development, `vite.config.js` is configured with a local dev proxy:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```
This maps any API calls to `/api/...` from the React app directly to `http://localhost:8000/api/...` without exposing origin differences.
