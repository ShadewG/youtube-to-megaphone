# YouTube to Megaphone Uploader

Automatically monitors YouTube channels and uploads new videos to Megaphone.

## Features

- Monitors multiple YouTube channels for new videos
- Downloads videos in MP4 format
- Uploads complete videos to Megaphone with original metadata
- Tracks processed videos to avoid duplicates
- Runs on Railway with automatic scheduling
- Web UI with channel ID finder and manual upload testing

## Setup

1. **Clone the repository**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Add your YouTube API key
   - Add your Megaphone API credentials
   - Configure channel IDs to monitor

4. **Run locally:**
   ```bash
   npm start
   ```

## Deployment on Railway

1. Push to GitHub
2. Connect your GitHub repo to Railway
3. Add environment variables in Railway dashboard
4. Deploy!

## Environment Variables

- `YOUTUBE_API_KEY`: YouTube Data API v3 key
- `CHANNEL_IDS`: Comma-separated list of YouTube channel IDs
- `MEGAPHONE_API_KEY`: Your Megaphone API key
- `MEGAPHONE_PODCAST_ID`: Your podcast ID on Megaphone
- `CHECK_INTERVAL`: Cron expression for check frequency (default: every 5 minutes)

## API Endpoints

- `GET /health` - Health check
- `POST /check-now` - Manually trigger a check for new videos

## Important Notes

- Videos are downloaded in MP4 format and uploaded directly to Megaphone
- The Megaphone API implementation is a placeholder - you'll need to update it based on actual API documentation
- Make sure you have sufficient storage for temporary video files
- Use channel IDs, not channel names (use the Channel ID Finder in the web UI)