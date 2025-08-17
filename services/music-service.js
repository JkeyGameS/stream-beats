/**
 * Music Service - Core music functionality
 * Handles YouTube downloads, Spotify integration, and music streaming
 */

const ytdl = require('@distube/ytdl-core');
const SpotifyWebApi = require('spotify-web-api-node');
const YouTube = require('youtube-sr').default;
const fetch = require('node-fetch');
const logger = require('../utils/logger');

class MusicService {
    constructor() {
        this.spotify = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET
        });
        
        this.spotifyEnabled = false;
        
        // Set up Spotify credentials if available
        this.initializeSpotify();
        
        // Rate limiting
        this.downloadQueue = new Map(); // chatId -> array of downloads
        this.activeDownloads = new Map(); // chatId -> count
        this.maxConcurrentDownloads = 2;
        
        logger.info('Music service initialized');
    }
    
    async initializeSpotify() {
        try {
            if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
                // Validate credentials format
                const clientId = process.env.SPOTIFY_CLIENT_ID.trim();
                const clientSecret = process.env.SPOTIFY_CLIENT_SECRET.trim();
                
                if (clientId.length < 20 || clientSecret.length < 20) {
                    logger.warn('Spotify credentials appear to be invalid (too short) - Spotify features disabled');
                    this.spotifyEnabled = false;
                    return;
                }
                
                // Update credentials
                this.spotify.setClientId(clientId);
                this.spotify.setClientSecret(clientSecret);
                
                const data = await this.spotify.clientCredentialsGrant();
                this.spotify.setAccessToken(data.body['access_token']);
                this.spotifyEnabled = true;
                
                // Set token refresh interval (Spotify tokens expire after 1 hour)
                setInterval(async () => {
                    try {
                        const refreshData = await this.spotify.clientCredentialsGrant();
                        this.spotify.setAccessToken(refreshData.body['access_token']);
                        logger.info('Spotify access token refreshed');
                    } catch (refreshError) {
                        logger.error('Failed to refresh Spotify token:', refreshError);
                        this.spotifyEnabled = false;
                    }
                }, 55 * 60 * 1000); // Refresh every 55 minutes
                
                logger.info('Spotify API initialized successfully');
            } else {
                logger.info('Spotify credentials not provided - Spotify features disabled (YouTube still available)');
                this.spotifyEnabled = false;
            }
        } catch (error) {
            this.spotifyEnabled = false;
            if (error.body && error.body.error === 'invalid_client') {
                logger.warn('Invalid Spotify credentials - Spotify features disabled (YouTube still available)');
            } else {
                logger.warn('Failed to initialize Spotify API - Spotify features disabled (YouTube still available):', error.message);
            }
        }
    }
    
    /**
     * Search for music across platforms
     */
    async searchMusic(query, platform = 'youtube', limit = 5) {
        try {
            switch (platform.toLowerCase()) {
                case 'youtube':
                    return await this.searchYouTube(query, limit);
                case 'spotify':
                    return await this.searchSpotify(query, limit);
                default:
                    // Search YouTube by default
                    return await this.searchYouTube(query, limit);
            }
        } catch (error) {
            logger.error(`Error searching ${platform}:`, error);
            return [];
        }
    }
    
    /**
     * Search YouTube for music
     */
    async searchYouTube(query, limit = 5) {
        try {
            const results = await YouTube.search(query, { 
                limit: limit,
                type: 'video',
                safeSearch: false
            });
            
            return results.map(video => ({
                platform: 'youtube',
                id: video.id,
                title: video.title,
                artist: video.channel?.name || 'Unknown',
                duration: video.durationFormatted,
                thumbnail: video.thumbnail?.url || null,
                url: video.url,
                views: video.views,
                uploadedAt: video.uploadedAt
            }));
        } catch (error) {
            logger.error('YouTube search error:', error);
            return [];
        }
    }
    
    /**
     * Search Spotify for music
     */
    async searchSpotify(query, limit = 5) {
        try {
            if (!this.spotifyEnabled) {
                logger.info('Spotify is disabled, skipping Spotify search');
                return [];
            }

            if (!this.spotify.getAccessToken()) {
                await this.initializeSpotify();
            }
            
            if (!this.spotifyEnabled) {
                return [];
            }
            
            const results = await this.spotify.searchTracks(query, { limit: limit });
            
            return results.body.tracks.items.map(track => ({
                platform: 'spotify',
                id: track.id,
                title: track.name,
                artist: track.artists.map(artist => artist.name).join(', '),
                album: track.album.name,
                duration: this.formatDuration(track.duration_ms),
                thumbnail: track.album.images[0]?.url || null,
                preview_url: track.preview_url,
                external_urls: track.external_urls,
                popularity: track.popularity
            }));
        } catch (error) {
            logger.error('Spotify search error:', error);
            return [];
        }
    }
    
    /**
     * Get YouTube audio stream for download/streaming
     */
    async getYouTubeAudioStream(videoId) {
        try {
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            
            // Check if video exists and is available
            const info = await ytdl.getInfo(videoUrl);
            
            if (!info) {
                throw new Error('Video not found or unavailable');
            }
            
            // Get the best audio quality stream
            const audioStream = ytdl(videoUrl, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25 // 32MB buffer
            });
            
            return {
                stream: audioStream,
                info: {
                    title: info.videoDetails.title,
                    author: info.videoDetails.author.name,
                    duration: parseInt(info.videoDetails.lengthSeconds),
                    thumbnail: info.videoDetails.thumbnails[0]?.url
                }
            };
        } catch (error) {
            logger.error('Error getting YouTube audio stream:', error);
            throw error;
        }
    }
    
    /**
     * Download music from Spotify (finds YouTube equivalent)
     */
    async downloadFromSpotify(trackId) {
        try {
            if (!this.spotifyEnabled) {
                throw new Error('Spotify is disabled - cannot download from Spotify');
            }

            // Get track info from Spotify
            const track = await this.spotify.getTrack(trackId);
            const trackInfo = track.body;
            
            // Create search query for YouTube
            const searchQuery = `${trackInfo.artists[0].name} ${trackInfo.name}`;
            
            // Search for equivalent on YouTube
            const youtubeResults = await this.searchYouTube(searchQuery, 1);
            
            if (youtubeResults.length === 0) {
                throw new Error('No YouTube equivalent found for Spotify track');
            }
            
            // Download from YouTube
            return await this.getYouTubeAudioStream(youtubeResults[0].id);
            
        } catch (error) {
            logger.error('Error downloading from Spotify:', error);
            throw error;
        }
    }
    
    /**
     * Get track info without downloading
     */
    async getTrackInfo(platform, id) {
        try {
            switch (platform) {
                case 'youtube':
                    const videoUrl = `https://www.youtube.com/watch?v=${id}`;
                    const info = await ytdl.getInfo(videoUrl);
                    return {
                        title: info.videoDetails.title,
                        author: info.videoDetails.author.name,
                        duration: parseInt(info.videoDetails.lengthSeconds),
                        views: parseInt(info.videoDetails.viewCount),
                        thumbnail: info.videoDetails.thumbnails[0]?.url,
                        description: info.videoDetails.description?.substring(0, 200) + '...'
                    };
                    
                case 'spotify':
                    if (!this.spotifyEnabled) {
                        throw new Error('Spotify is disabled - cannot get track info');
                    }
                    const track = await this.spotify.getTrack(id);
                    const trackInfo = track.body;
                    return {
                        title: trackInfo.name,
                        author: trackInfo.artists.map(artist => artist.name).join(', '),
                        album: trackInfo.album.name,
                        duration: Math.floor(trackInfo.duration_ms / 1000),
                        popularity: trackInfo.popularity,
                        thumbnail: trackInfo.album.images[0]?.url,
                        preview_url: trackInfo.preview_url
                    };
                    
                default:
                    throw new Error(`Unsupported platform: ${platform}`);
            }
        } catch (error) {
            logger.error('Error getting track info:', error);
            throw error;
        }
    }
    
    /**
     * Validate URL and extract platform/ID
     */
    parseUrl(url) {
        try {
            // YouTube patterns
            const ytRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
            const ytMatch = url.match(ytRegex);
            if (ytMatch) {
                return { platform: 'youtube', id: ytMatch[1] };
            }
            
            // Spotify patterns
            const spotifyRegex = /(?:open\.spotify\.com\/track\/|spotify:track:)([a-zA-Z0-9]+)/;
            const spotifyMatch = url.match(spotifyRegex);
            if (spotifyMatch) {
                return { platform: 'spotify', id: spotifyMatch[1] };
            }
            
            return null;
        } catch (error) {
            logger.error('Error parsing URL:', error);
            return null;
        }
    }
    
    /**
     * Format duration from milliseconds to MM:SS
     */
    formatDuration(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}:${seconds.padStart(2, '0')}`;
    }
    
    /**
     * Check if user can download (rate limiting)
     */
    canUserDownload(chatId) {
        const activeCount = this.activeDownloads.get(chatId) || 0;
        return activeCount < this.maxConcurrentDownloads;
    }
    
    /**
     * Start download tracking
     */
    startDownload(chatId) {
        const current = this.activeDownloads.get(chatId) || 0;
        this.activeDownloads.set(chatId, current + 1);
    }
    
    /**
     * End download tracking
     */
    endDownload(chatId) {
        const current = this.activeDownloads.get(chatId) || 0;
        if (current > 0) {
            this.activeDownloads.set(chatId, current - 1);
        }
    }
    
    /**
     * Get platform statistics
     */
    getStats() {
        return {
            activeDownloads: Array.from(this.activeDownloads.values()).reduce((a, b) => a + b, 0),
            queuedDownloads: Array.from(this.downloadQueue.values()).reduce((a, b) => a + b.length, 0),
            spotifyEnabled: !!this.spotify.getAccessToken()
        };
    }
}

// Export singleton instance
module.exports = new MusicService();