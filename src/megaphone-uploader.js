import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { logger } from './logger.js';

export class MegaphoneUploader {
  constructor() {
    this.apiKey = process.env.MEGAPHONE_API_KEY;
    this.podcastId = process.env.MEGAPHONE_PODCAST_ID;
    this.apiUrl = process.env.MEGAPHONE_API_URL || 'https://api.megaphone.fm';
  }

  async uploadEpisode({ audioPath, title, description, publishDate, thumbnailUrl }) {
    try {
      // Note: This is a placeholder implementation as Megaphone's API documentation
      // is not publicly available. You'll need to adjust this based on actual API specs.
      
      // First, create the episode metadata
      const episodeData = {
        title,
        description,
        publishedAt: publishDate,
        status: 'published',
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

      // Upload audio file
      const form = new FormData();
      form.append('audio', fs.createReadStream(audioPath));
      
      await axios.post(
        `${this.apiUrl}/v1/episodes/${episodeId}/audio`,
        form,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            ...form.getHeaders()
          }
        }
      );

      logger.info(`Successfully uploaded audio for episode: ${title}`);

      // Clean up audio file
      fs.unlinkSync(audioPath);

      return episodeId;
    } catch (error) {
      logger.error('Error uploading to Megaphone:', error.response?.data || error.message);
      throw error;
    }
  }
}