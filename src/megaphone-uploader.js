import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { logger } from './logger.js';

export class MegaphoneUploader {
  constructor() {
    this.apiToken = process.env.MEGAPHONE_API_TOKEN;
    this.networkId = process.env.MEGAPHONE_NETWORK_ID;
    this.podcastId = process.env.MEGAPHONE_PODCAST_ID;
    this.apiUrl = process.env.MEGAPHONE_API_URL || 'https://cms.megaphone.fm/api';
    
    // Debug logging
    logger.info('Megaphone configuration:', {
      hasToken: !!this.apiToken,
      tokenLength: this.apiToken?.length || 0,
      networkId: this.networkId || 'NOT SET',
      podcastId: this.podcastId || 'NOT SET',
      apiUrl: this.apiUrl
    });
    
    if (!this.apiToken) {
      logger.warn('MEGAPHONE_API_TOKEN not set. Generate one in Megaphone Settings.');
    }
  }

  async uploadEpisode({ videoPath, audioPath, title, description, publishDate, thumbnailUrl, isDraft = false, duration }) {
    // Support both videoPath and audioPath for backwards compatibility
    const mediaPath = videoPath || audioPath;
    
    // Test mode - skip actual upload
    if (process.env.TEST_MODE === 'true') {
      logger.info('TEST MODE: Would upload to Megaphone:', {
        title,
        description: description.substring(0, 100) + '...',
        publishDate,
        isDraft,
        mediaPath
      });
      
      // Clean up media file
      fs.unlinkSync(mediaPath);
      
      return 'TEST-EPISODE-' + Date.now();
    }
    
    // Check if API is properly configured
    if (!this.apiToken || !this.networkId || !this.podcastId) {
      throw new Error('Megaphone API not configured. Set MEGAPHONE_API_TOKEN, MEGAPHONE_NETWORK_ID, and MEGAPHONE_PODCAST_ID');
    }
    
    try {
      // First, upload the audio file
      const uploadForm = new FormData();
      uploadForm.append('file', fs.createReadStream(mediaPath));
      
      const uploadResponse = await axios.post(
        `${this.apiUrl}/networks/${this.networkId}/audio`,
        uploadForm,
        {
          headers: {
            'Authorization': `Token token="${this.apiToken}"`,
            ...uploadForm.getHeaders()
          }
        }
      );

      const audioFileUrl = uploadResponse.data.url;
      logger.info(`Uploaded audio file: ${audioFileUrl}`);

      // Create episode with the uploaded audio
      const episodeData = {
        title,
        summary: description,
        pubdate: publishDate,
        audioFile: audioFileUrl,
        draft: isDraft,
        podcastId: this.podcastId
      };

      // If we have a thumbnail, add it
      if (thumbnailUrl) {
        episodeData.imageFile = thumbnailUrl;
      }

      // Add ad configuration if enabled
      if (process.env.ENABLE_ADS === 'true') {
        // Pre-roll ads
        episodeData.preCount = parseInt(process.env.PREROLL_COUNT || '1');
        
        // Post-roll ads
        episodeData.postCount = parseInt(process.env.POSTROLL_COUNT || '1');
        
        // Mid-roll ads - calculate insertion points based on video duration
        if (process.env.MIDROLL_INTERVAL && duration) {
          const interval = parseInt(process.env.MIDROLL_INTERVAL); // in seconds
          const cuepoints = [];
          
          // Calculate midroll positions based on interval
          // Start at interval, then every interval after that
          for (let time = interval; time < duration - 60; time += interval) {
            cuepoints.push({
              cuepointType: "midroll",
              startTime: time,
              adCount: parseInt(process.env.MIDROLL_AD_COUNT || '1'),
              adSources: ["auto"],
              isActive: true
            });
          }
          
          if (cuepoints.length > 0) {
            episodeData.cuepoints = cuepoints;
            logger.info(`Added ${cuepoints.length} midroll ad breaks at ${interval}s intervals`);
          }
        }
      }

      // Create episode
      const createResponse = await axios.post(
        `${this.apiUrl}/networks/${this.networkId}/podcasts/${this.podcastId}/episodes`,
        episodeData,
        {
          headers: {
            'Authorization': `Token token="${this.apiToken}"`,
            'Content-Type': 'application/json'
          }
        }
      );

      const episodeId = createResponse.data.id;
      logger.info(`Created episode with ID: ${episodeId}`);
      logger.info(`Episode status: ${isDraft ? 'draft' : 'published'}`);

      // Clean up media file
      fs.unlinkSync(mediaPath);

      return episodeId;
    } catch (error) {
      logger.error('Error uploading to Megaphone:', error.response?.data || error.message);
      throw error;
    }
  }
}