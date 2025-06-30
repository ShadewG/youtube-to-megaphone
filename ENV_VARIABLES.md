# Environment Variables Documentation

## Required Variables

### YouTube Configuration

#### `YOUTUBE_API_KEY` (Required)
- **Description**: Your YouTube Data API v3 key
- **How to get it**:
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Create a new project or select existing
  3. Enable "YouTube Data API v3"
  4. Go to "Credentials" → "Create Credentials" → "API Key"
  5. Copy the API key
- **Example**: `AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY`

#### `CHANNEL_IDS` (Required)
- **Description**: Comma-separated list of YouTube channel IDs to monitor
- **How to find channel ID**:
  1. Go to the YouTube channel
  2. View page source (right-click → "View Page Source")
  3. Search for "channelId"
  4. Or use: https://commentpicker.com/youtube-channel-id.php
- **Example**: `UCddiUEpeqJcYeBxX1IVBKvQ,UC_x5XG1OV2P6uZZ5FSM9Ttw`

### Megaphone Configuration

#### `MEGAPHONE_API_KEY` (Required)
- **Description**: Your Megaphone API authentication key
- **How to get it**:
  1. Contact Megaphone support for API access
  2. They typically require you to be a larger publisher
  3. API access is provided after approval
- **Example**: `mg_prod_1234567890abcdef`

#### `MEGAPHONE_PODCAST_ID` (Required)
- **Description**: Your podcast ID in Megaphone
- **How to find it**:
  1. Log into your Megaphone dashboard
  2. Go to your podcast settings
  3. The ID is usually in the URL or settings page
- **Example**: `PPL1234567890`

#### `MEGAPHONE_API_URL` (Optional)
- **Description**: Megaphone API base URL
- **Default**: `https://api.megaphone.fm`
- **Note**: Only change if Megaphone provides a different endpoint

### Application Configuration

#### `PORT` (Optional)
- **Description**: Port for the web server
- **Default**: `3000`
- **Railway**: Automatically set by Railway

#### `CHECK_INTERVAL` (Optional)
- **Description**: How often to check for new videos (in milliseconds)
- **Default**: `300000` (5 minutes)
- **Examples**:
  - `60000` = 1 minute
  - `300000` = 5 minutes
  - `600000` = 10 minutes
  - `3600000` = 1 hour

#### `TEMP_DIR` (Optional)
- **Description**: Directory for temporary video/audio files
- **Default**: `./temp`
- **Note**: Ensure sufficient disk space

#### `LOG_LEVEL` (Optional)
- **Description**: Logging verbosity
- **Default**: `info`
- **Options**: `error`, `warn`, `info`, `debug`

## Setting Variables on Railway

1. Go to your Railway project
2. Click on your service
3. Go to "Variables" tab
4. Click "Add Variable"
5. Add each variable with its value
6. Railway will automatically restart your app

## Example .env file for local development

```env
# YouTube Configuration
YOUTUBE_API_KEY=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY
CHANNEL_IDS=UCddiUEpeqJcYeBxX1IVBKvQ,UC_x5XG1OV2P6uZZ5FSM9Ttw

# Megaphone Configuration
MEGAPHONE_API_KEY=mg_prod_1234567890abcdef
MEGAPHONE_PODCAST_ID=PPL1234567890
MEGAPHONE_API_URL=https://api.megaphone.fm

# App Configuration
PORT=3000
CHECK_INTERVAL=300000
TEMP_DIR=./temp
LOG_LEVEL=info
```

## Testing Your Configuration

1. **Check YouTube API**:
   - Visit `/health` endpoint
   - Try manual upload with a YouTube URL

2. **Check Megaphone API**:
   - The actual upload will fail until you have valid Megaphone credentials
   - Check logs for detailed error messages

3. **Monitor Status**:
   - Visit the web UI at your app URL
   - Check system status and monitoring channels
   - View recent activity logs

## Troubleshooting

- **YouTube API quota exceeded**: YouTube has daily quotas, consider increasing check interval
- **Megaphone upload fails**: Verify API key and podcast ID are correct
- **No videos found**: Check channel IDs are correct and channels have recent videos
- **High disk usage**: Reduce `CHECK_INTERVAL` or ensure temp files are cleaned