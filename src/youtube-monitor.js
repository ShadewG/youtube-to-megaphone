import axios from 'axios';
import youtubedl from 'youtube-dl-exec';
import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';

export class YouTubeMonitor {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
    this.tempDir = process.env.TEMP_DIR || './temp';
    this.processedVideos = new Set();
    this.stateFile = './processed-videos.json';
    
    this.init();
  }

  async init() {
    // Ensure temp directory exists
    await fs.mkdir(this.tempDir, { recursive: true });
    
    // Load processed videos from state file
    try {
      const data = await fs.readFile(this.stateFile, 'utf8');
      this.processedVideos = new Set(JSON.parse(data));
    } catch (error) {
      // File doesn't exist yet, that's okay
      logger.info('No previous state file found, starting fresh');
    }
  }

  async checkChannel(channelId) {
    try {
      // Get channel uploads playlist ID
      const channelResponse = await axios.get(`${this.baseUrl}/channels`, {
        params: {
          key: this.apiKey,
          id: channelId,
          part: 'contentDetails'
        }
      });

      logger.info(`Channel API response for ${channelId}:`, {
        itemCount: channelResponse.data.items?.length || 0,
        pageInfo: channelResponse.data.pageInfo
      });

      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        logger.error(`No channel found with ID: ${channelId}`);
        logger.info(`Note: You must use channel IDs, not channel names. Find channel IDs at: https://commentpicker.com/youtube-channel-id.php`);
        return [];
      }

      const uploadsPlaylistId = channelResponse.data.items[0]?.contentDetails?.relatedPlaylists?.uploads;
      
      if (!uploadsPlaylistId) {
        throw new Error(`No uploads playlist found for channel ${channelId}`);
      }

      // Get recent videos from uploads playlist
      const videosResponse = await axios.get(`${this.baseUrl}/playlistItems`, {
        params: {
          key: this.apiKey,
          playlistId: uploadsPlaylistId,
          part: 'snippet',
          maxResults: 10
        }
      });

      const newVideos = [];
      
      for (const item of videosResponse.data.items) {
        const videoId = item.snippet.resourceId.videoId;
        
        if (!this.processedVideos.has(videoId)) {
          // Get full video details
          const videoDetails = await this.getVideoDetails(videoId);
          newVideos.push(videoDetails);
          
          // Mark as processed
          this.processedVideos.add(videoId);
        }
      }

      // Save state
      await this.saveState();
      
      return newVideos;
    } catch (error) {
      logger.error(`Error checking channel ${channelId}:`, error);
      throw error;
    }
  }

  async getVideoDetails(videoId) {
    const response = await axios.get(`${this.baseUrl}/videos`, {
      params: {
        key: this.apiKey,
        id: videoId,
        part: 'snippet,contentDetails'
      }
    });

    const video = response.data.items[0];
    
    return {
      id: videoId,
      title: video.snippet.title,
      description: video.snippet.description,
      publishDate: video.snippet.publishedAt,
      thumbnailUrl: video.snippet.thumbnails.maxres?.url || 
                     video.snippet.thumbnails.high?.url ||
                     video.snippet.thumbnails.default?.url,
      duration: video.contentDetails.duration,
      url: `https://www.youtube.com/watch?v=${videoId}`
    };
  }

  async downloadVideo(video) {
    const tempVideoPath = path.join(this.tempDir, `${video.id}.mp4`);

    try {
      // Download video using youtube-dl
      logger.info(`Downloading video: ${video.title}`);
      
      await youtubedl(video.url, {
        output: tempVideoPath,
        format: 'best[ext=mp4]/best',
        noPlaylist: true
      });

      logger.info(`Successfully downloaded video: ${video.title}`);
      
      return tempVideoPath;
    } catch (error) {
      logger.error(`Error downloading video ${video.id}:`, error);
      
      // Clean up on error
      try {
        await fs.unlink(tempVideoPath);
      } catch {}
      
      throw error;
    }
  }

  // Keep the old method for backwards compatibility
  async downloadAndExtractAudio(video) {
    return this.downloadVideo(video);
  }

  async saveState() {
    await fs.writeFile(
      this.stateFile, 
      JSON.stringify(Array.from(this.processedVideos), null, 2)
    );
  }

  async searchChannel(channelName) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          key: this.apiKey,
          q: channelName,
          type: 'channel',
          part: 'snippet',
          maxResults: 5
        }
      });

      return response.data.items.map(item => ({
        channelId: item.id.channelId,
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.default?.url
      }));
    } catch (error) {
      logger.error('Error searching for channel:', error);
      throw error;
    }
  }
}