import express from 'express';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import { YouTubeMonitor } from './src/youtube-monitor.js';
import { MegaphoneUploader } from './src/megaphone-uploader.js';
import { logger } from './src/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const youtubeMonitor = new YouTubeMonitor();
const megaphoneUploader = new MegaphoneUploader();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Status endpoint with more details
app.get('/status', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    monitoringChannels: process.env.CHANNEL_IDS ? process.env.CHANNEL_IDS.split(',').map(id => id.trim()) : [],
    checkInterval: process.env.CHECK_INTERVAL || '*/5 * * * *'
  });
});

// Recent activity endpoint
app.get('/activity', async (req, res) => {
  try {
    const logs = await logger.getRecentLogs();
    res.json({ logs });
  } catch (error) {
    res.json({ logs: 'Unable to fetch logs' });
  }
});

// Channel ID lookup endpoint
app.post('/find-channel-id', async (req, res) => {
  const { channelName } = req.body;
  
  if (!channelName) {
    return res.status(400).json({ error: 'Channel name is required' });
  }
  
  try {
    const searchResults = await youtubeMonitor.searchChannel(channelName);
    res.json({ results: searchResults });
  } catch (error) {
    logger.error('Error searching for channel:', error);
    res.status(500).json({ error: 'Failed to search for channel' });
  }
});

// Manual trigger endpoint
app.post('/check-now', async (req, res) => {
  try {
    logger.info('Manual check triggered');
    await checkForNewVideos();
    res.json({ message: 'Check initiated successfully' });
  } catch (error) {
    logger.error('Error during manual check:', error);
    res.status(500).json({ error: 'Failed to initiate check' });
  }
});

// Manual video upload endpoint
app.post('/upload-video', async (req, res) => {
  const { videoUrl } = req.body;
  
  if (!videoUrl) {
    return res.status(400).json({ error: 'Video URL is required' });
  }
  
  // Set up SSE for streaming logs
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const sendLog = (message) => {
    res.write(JSON.stringify({ type: 'log', message }) + '\n');
  };
  
  try {
    sendLog('Fetching video details...');
    
    // Extract video ID from URL
    const videoIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (!videoIdMatch) {
      throw new Error('Invalid YouTube URL');
    }
    
    const videoId = videoIdMatch[1];
    const video = await youtubeMonitor.getVideoDetails(videoId);
    
    sendLog(`Found video: ${video.title}`);
    sendLog('Downloading video...');
    
    // Download video
    const videoPath = await youtubeMonitor.downloadVideo(video);
    
    sendLog('Video downloaded successfully');
    sendLog('Uploading to Megaphone as draft...');
    
    // Upload to Megaphone as draft
    const episodeId = await megaphoneUploader.uploadEpisode({
      videoPath,
      title: video.title,
      description: video.description,
      publishDate: video.publishDate,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.durationSeconds,
      isDraft: true // This flag will tell Megaphone to save as draft
    });
    
    sendLog(`Successfully uploaded as draft with ID: ${episodeId}`);
    res.write(JSON.stringify({ type: 'complete', episodeId }) + '\n');
    
  } catch (error) {
    logger.error('Error during manual upload:', error);
    res.write(JSON.stringify({ type: 'error', message: error.message }) + '\n');
  } finally {
    res.end();
  }
});

// Main function to check for new videos
async function checkForNewVideos() {
  try {
    const channelIds = process.env.CHANNEL_IDS.split(',').map(id => id.trim());
    
    for (const channelId of channelIds) {
      logger.info(`Checking channel: ${channelId}`);
      
      const newVideos = await youtubeMonitor.checkChannel(channelId);
      
      for (const video of newVideos) {
        try {
          logger.info(`Processing video: ${video.title}`);
          
          // Download video
          const videoPath = await youtubeMonitor.downloadVideo(video);
          
          // Upload to Megaphone
          await megaphoneUploader.uploadEpisode({
            videoPath,
            title: video.title,
            description: video.description,
            publishDate: video.publishDate,
            thumbnailUrl: video.thumbnailUrl,
            duration: video.durationSeconds
          });
          
          logger.info(`Successfully uploaded: ${video.title}`);
        } catch (error) {
          logger.error(`Failed to process video ${video.id}:`, error);
        }
      }
    }
  } catch (error) {
    logger.error('Error in checkForNewVideos:', error);
  }
}

// Schedule cron job (default: every 5 minutes)
const checkInterval = process.env.CHECK_INTERVAL || '*/5 * * * *';
cron.schedule(checkInterval, checkForNewVideos);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Monitoring channels: ${process.env.CHANNEL_IDS}`);
  logger.info(`Check interval: ${checkInterval}`);
});

// Initial check on startup
checkForNewVideos();