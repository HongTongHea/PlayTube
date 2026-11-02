# PlayTube — Clean, Ad-Free YouTube Web App (Next.js)

A minimalist, distraction-free, ad-free video streaming web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and the **YouTube Data API v3**.

## Features

- **100% Ad-Free Playback**: Uses privacy-enhanced `youtube-nocookie.com` embedded player with clean controls and Theater Mode.
- **YouTube Data API v3 Integration**:
  - Configure your API key directly in the web UI (**Set YouTube API Key** button in the top navbar, persisted in `localStorage`) **or** via `.env.local` (`NEXT_PUBLIC_YOUTUBE_API_KEY`).
  - Live one-click API key verification inside the settings modal.
  - Built-in curated fallback demo videos so the app works immediately out of the box even before adding an API key.
- **Simple, Clean UI**:
  - Responsive video grid with duration badges, view counts, and publish timestamps.
  - Category filter pills (`All`, `Coding & Tech`, `Music`, `Gaming`, `Science & AI`, `Cinema`, `Tech News`, `Sports`).
  - Instant search bar (also supports pasting any YouTube URL or 11-character video ID to watch immediately).
  - Local **Watch Later** bookmarks and **Watch History** (no account required).
  - Dark & Light mode toggle.

## Getting Started

1. Open a terminal in `D:\Project Develop\youtube-nextjs`:
   ```bash
   npm install
   npm run dev
   ```
2. Open [http://localhost:3000](http://localhost:3000) in your browser.
3. Click **Set YouTube API Key** in the top-right navigation bar (or copy `.env.local.example` to `.env.local` and set `NEXT_PUBLIC_YOUTUBE_API_KEY`).
