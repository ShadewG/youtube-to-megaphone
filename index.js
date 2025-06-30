import express from 'express';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { YouTubeMonitor } from './src/youtube-monitor.js';
import { MegaphoneUploader } from './src/megaphone-uploader.js';
import { logger } from './src/logger.js';

dotenv.config();

const app = express();
app.use(express.json());

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
          
          // Download video and extract audio
          const audioPath = await youtubeMonitor.downloadAndExtractAudio(video);
          
          // Upload to Megaphone
          await megaphoneUploader.uploadEpisode({
            audioPath,
            title: video.title,
            description: video.description,
            publishDate: video.publishDate,
            thumbnailUrl: video.thumbnailUrl
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