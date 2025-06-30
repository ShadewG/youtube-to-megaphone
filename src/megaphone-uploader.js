import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { logger } from './logger.js';

export class MegaphoneUploader {
  constructor() {
    this.apiKey = process.env.MEGAPHONE_API_KEY;
    this.podcastId = process.env.MEGAPHONE_PODCAST_ID;
    this.apiUrl = process.env.MEGAPHONE_API_URL;
    
    if (!this.apiUrl) {
      logger.warn('MEGAPHONE_API_URL not set. You need to get the actual API endpoint from Megaphone support.');
      logger.warn('The API endpoint might be something like: https://cms.megaphone.fm/api or similar');
      this.apiUrl = 'https://REPLACE-WITH-ACTUAL-MEGAPHONE-API.com';
    }
  }

  async uploadEpisode({ videoPath, audioPath, title, description, publishDate, thumbnailUrl, isDraft = false }) {
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
    if (!this.apiUrl || this.apiUrl.includes('REPLACE-WITH-ACTUAL')) {
      throw new Error('Megaphone API URL not configured. Please contact Megaphone support to get your API endpoint and update MEGAPHONE_API_URL environment variable.');
    }
    
    try {
      // Note: This is a placeholder implementation as Megaphone's API documentation
      // is not publicly available. You'll need to adjust this based on actual API specs.
      // 
      // Common Megaphone API endpoints might include:
      // - https://cms.megaphone.fm/api/v1/
      // - https://api-prod.megaphone.fm/
      // - https://partners.megaphone.fm/api/
      // 
      // Contact Megaphone support to get:
      // 1. Your actual API endpoint
      // 2. API authentication method (Bearer token, API key, etc.)
      // 3. Correct endpoints for creating episodes and uploading media
      
      // First, create the episode metadata
      const episodeData = {
        title,
        description,
        publishedAt: publishDate,
        status: isDraft ? 'draft' : 'published',
        podcastId: this.podcastId
      };

      // Create episode
      const createResponse = await axios.post(
        `${this.apiUrl}/v1/podcasts/${this.podcastId}/episodes`,
        episodeData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const episodeId = createResponse.data.id;
      logger.info(`Created episode with ID: ${episodeId}`);

      // Upload media file (video or audio)
      const form = new FormData();
      const fieldName = videoPath ? 'video' : 'audio';
      form.append(fieldName, fs.createReadStream(mediaPath));
      
      await axios.post(
        `${this.apiUrl}/v1/episodes/${episodeId}/media`,
        form,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            ...form.getHeaders()
          }
        }
      );

      logger.info(`Successfully uploaded ${fieldName} for episode: ${title}`);

      // Clean up media file
      fs.unlinkSync(mediaPath);

      return episodeId;
    } catch (error) {
      logger.error('Error uploading to Megaphone:', error.response?.data || error.message);
      throw error;
    }
  }
}