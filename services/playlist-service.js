/**
 * Playlist Service - Manages user playlists and queues
 */

const logger = require('../utils/logger');

class PlaylistService {
    constructor() {
        // In-memory storage (in production, use a database)
        this.playlists = new Map(); // userId -> { playlistName: [songs] }
        this.queues = new Map(); // chatId -> { songs: [], currentIndex: 0, repeat: false, shuffle: false }
        
        logger.info('Playlist service initialized');
    }
    
    /**
     * Create a new playlist for user
     */
    createPlaylist(userId, playlistName) {
        try {
            if (!this.playlists.has(userId)) {
                this.playlists.set(userId, new Map());
            }
            
            const userPlaylists = this.playlists.get(userId);
            
            if (userPlaylists.has(playlistName)) {
                throw new Error('Playlist already exists');
            }
            
            userPlaylists.set(playlistName, []);
            logger.info(`Created playlist "${playlistName}" for user ${userId}`);
            return true;
        } catch (error) {
            logger.error('Error creating playlist:', error);
            throw error;
        }
    }
    
    /**
     * Add song to playlist
     */
    addToPlaylist(userId, playlistName, song) {
        try {
            if (!this.playlists.has(userId)) {
                throw new Error('User has no playlists');
            }
            
            const userPlaylists = this.playlists.get(userId);
            
            if (!userPlaylists.has(playlistName)) {
                throw new Error('Playlist not found');
            }
            
            const playlist = userPlaylists.get(playlistName);
            
            // Check for duplicates
            const exists = playlist.some(s => s.id === song.id && s.platform === song.platform);
            if (exists) {
                throw new Error('Song already in playlist');
            }
            
            playlist.push({
                ...song,
                addedAt: new Date().toISOString()
            });
            
            logger.info(`Added song "${song.title}" to playlist "${playlistName}"`);
            return true;
        } catch (error) {
            logger.error('Error adding to playlist:', error);
            throw error;
        }
    }
    
    /**
     * Remove song from playlist
     */
    removeFromPlaylist(userId, playlistName, songIndex) {
        try {
            if (!this.playlists.has(userId)) {
                throw new Error('User has no playlists');
            }
            
            const userPlaylists = this.playlists.get(userId);
            
            if (!userPlaylists.has(playlistName)) {
                throw new Error('Playlist not found');
            }
            
            const playlist = userPlaylists.get(playlistName);
            
            if (songIndex < 0 || songIndex >= playlist.length) {
                throw new Error('Invalid song index');
            }
            
            const removedSong = playlist.splice(songIndex, 1)[0];
            logger.info(`Removed song "${removedSong.title}" from playlist "${playlistName}"`);
            return removedSong;
        } catch (error) {
            logger.error('Error removing from playlist:', error);
            throw error;
        }
    }
    
    /**
     * Get user's playlists
     */
    getUserPlaylists(userId) {
        if (!this.playlists.has(userId)) {
            return [];
        }
        
        const userPlaylists = this.playlists.get(userId);
        const result = [];
        
        for (const [name, songs] of userPlaylists) {
            result.push({
                name: name,
                songCount: songs.length,
                totalDuration: songs.reduce((total, song) => {
                    const duration = this.parseDuration(song.duration || '0:00');
                    return total + duration;
                }, 0),
                lastModified: songs.length > 0 ? 
                    Math.max(...songs.map(s => new Date(s.addedAt || 0).getTime())) : 0
            });
        }
        
        return result;
    }
    
    /**
     * Get playlist contents
     */
    getPlaylist(userId, playlistName) {
        try {
            if (!this.playlists.has(userId)) {
                return null;
            }
            
            const userPlaylists = this.playlists.get(userId);
            
            if (!userPlaylists.has(playlistName)) {
                return null;
            }
            
            return userPlaylists.get(playlistName);
        } catch (error) {
            logger.error('Error getting playlist:', error);
            return null;
        }
    }

    /**
     * Get all songs from all user playlists (simulating "downloaded songs")
     */
    getDownloadedSongs(userId) {
        if (!this.playlists.has(userId)) {
            return [];
        }

        const userPlaylists = this.playlists.get(userId);
        let allSongs = [];

        for (const songs of userPlaylists.values()) {
            allSongs = allSongs.concat(songs);
        }

        return allSongs;
    }
    
    /**
     * Delete playlist
     */
    deletePlaylist(userId, playlistName) {
        try {
            if (!this.playlists.has(userId)) {
                throw new Error('User has no playlists');
            }
            
            const userPlaylists = this.playlists.get(userId);
            
            if (!userPlaylists.has(playlistName)) {
                throw new Error('Playlist not found');
            }
            
            userPlaylists.delete(playlistName);
            logger.info(`Deleted playlist "${playlistName}" for user ${userId}`);
            return true;
        } catch (error) {
            logger.error('Error deleting playlist:', error);
            throw error;
        }
    }
    
    // Queue Management
    
    /**
     * Add song to queue
     */
    addToQueue(chatId, song, position = -1) {
        try {
            if (!this.queues.has(chatId)) {
                this.queues.set(chatId, {
                    songs: [],
                    currentIndex: 0,
                    repeat: false,
                    shuffle: false,
                    playing: false
                });
            }
            
            const queue = this.queues.get(chatId);
            
            if (position === -1 || position >= queue.songs.length) {
                queue.songs.push(song);
            } else {
                queue.songs.splice(position, 0, song);
            }
            
            logger.info(`Added song "${song.title}" to queue for chat ${chatId}`);
            return queue.songs.length - 1;
        } catch (error) {
            logger.error('Error adding to queue:', error);
            throw error;
        }
    }
    
    /**
     * Get current queue
     */
    getQueue(chatId) {
        return this.queues.get(chatId) || {
            songs: [],
            currentIndex: 0,
            repeat: false,
            shuffle: false,
            playing: false
        };
    }
    
    /**
     * Get current song
     */
    getCurrentSong(chatId) {
        const queue = this.getQueue(chatId);
        if (queue.songs.length === 0 || queue.currentIndex >= queue.songs.length) {
            return null;
        }
        return queue.songs[queue.currentIndex];
    }
    
    /**
     * Skip to next song
     */
    nextSong(chatId) {
        const queue = this.queues.get(chatId);
        if (!queue || queue.songs.length === 0) {
            return null;
        }
        
        if (queue.repeat) {
            // Stay on current song if repeat is enabled
            return this.getCurrentSong(chatId);
        }
        
        if (queue.shuffle) {
            // Random next song
            queue.currentIndex = Math.floor(Math.random() * queue.songs.length);
        } else {
            // Next song in order
            queue.currentIndex++;
            if (queue.currentIndex >= queue.songs.length) {
                queue.currentIndex = 0; // Loop back to start
            }
        }
        
        return this.getCurrentSong(chatId);
    }
    
    /**
     * Go to previous song
     */
    previousSong(chatId) {
        const queue = this.queues.get(chatId);
        if (!queue || queue.songs.length === 0) {
            return null;
        }
        
        if (queue.shuffle) {
            // Random previous song
            queue.currentIndex = Math.floor(Math.random() * queue.songs.length);
        } else {
            // Previous song in order
            queue.currentIndex--;
            if (queue.currentIndex < 0) {
                queue.currentIndex = queue.songs.length - 1; // Loop to end
            }
        }
        
        return this.getCurrentSong(chatId);
    }
    
    /**
     * Clear queue
     */
    clearQueue(chatId) {
        if (this.queues.has(chatId)) {
            this.queues.set(chatId, {
                songs: [],
                currentIndex: 0,
                repeat: false,
                shuffle: false,
                playing: false
            });
        }
    }
    
    /**
     * Remove song from queue
     */
    removeFromQueue(chatId, index) {
        const queue = this.queues.get(chatId);
        if (!queue || index < 0 || index >= queue.songs.length) {
            return null;
        }
        
        const removedSong = queue.songs.splice(index, 1)[0];
        
        // Adjust current index if needed
        if (index < queue.currentIndex) {
            queue.currentIndex--;
        } else if (index === queue.currentIndex && queue.currentIndex >= queue.songs.length) {
            queue.currentIndex = 0;
        }
        
        return removedSong;
    }
    
    /**
     * Toggle repeat mode
     */
    toggleRepeat(chatId) {
        const queue = this.queues.get(chatId);
        if (queue) {
            queue.repeat = !queue.repeat;
            return queue.repeat;
        }
        return false;
    }
    
    /**
     * Toggle shuffle mode
     */
    toggleShuffle(chatId) {
        const queue = this.queues.get(chatId);
        if (queue) {
            queue.shuffle = !queue.shuffle;
            return queue.shuffle;
        }
        return false;
    }
    
    /**
     * Set playing status
     */
    setPlaying(chatId, playing) {
        const queue = this.queues.get(chatId);
        if (queue) {
            queue.playing = playing;
        }
    }
    
    /**
     * Load playlist into queue
     */
    loadPlaylistToQueue(chatId, userId, playlistName, replace = false) {
        try {
            const playlist = this.getPlaylist(userId, playlistName);
            if (!playlist) {
                throw new Error('Playlist not found');
            }
            
            if (replace) {
                this.clearQueue(chatId);
            }
            
            let addedCount = 0;
            for (const song of playlist) {
                this.addToQueue(chatId, song);
                addedCount++;
            }
            
            logger.info(`Loaded ${addedCount} songs from playlist "${playlistName}" to queue`);
            return addedCount;
        } catch (error) {
            logger.error('Error loading playlist to queue:', error);
            throw error;
        }
    }
    
    /**
     * Parse duration string (MM:SS) to seconds
     */
    parseDuration(durationStr) {
        const parts = durationStr.split(':');
        if (parts.length === 2) {
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
        return 0;
    }
    
    /**
     * Format seconds to MM:SS
     */
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// Export singleton instance
module.exports = new PlaylistService();