/**
 * Utility functions for Lovense Video Sync
 */

const Utils = {
    /**
     * Format seconds to MM:SS
     */
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Format bytes to human-readable size
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    },

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Parse filename for pattern info (legacy support)
     */
    parseFilename(filename) {
        const name = filename.replace(/\.[^/.]+$/, '');
        const parts = name.split('_');
        
        if (parts[parts.length - 1] === 'scripted') {
            return { type: 'scripted', name: name };
        }
        
        if (parts.length >= 3) {
            const patternName = parts[parts.length - 2];
            const durationStr = parts[parts.length - 1];
            const duration = parseInt(durationStr);
            
            if (patternName.startsWith('custom-')) {
                const customPattern = patternName.replace('custom-', '');
                return {
                    type: 'custom',
                    pattern: decodeURIComponent(customPattern),
                    duration: isNaN(duration) ? 30 : duration
                };
            }
            
            // Check if it's a known pattern
            const knownPatterns = ['wave', 'pulse', 'escalate', 'earthquake', 'heartbeat', 
                                   'fireworks', 'gentle', 'intense', 'teasing', 'steady'];
            if (knownPatterns.includes(patternName) && !isNaN(duration)) {
                return {
                    type: 'simple',
                    pattern: patternName,
                    duration: duration
                };
            }
        }
        
        return { type: 'none' };
    },

    /**
     * Download data as JSON file
     */
    downloadJson(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Read file as text
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    },

    /**
     * Read file as ArrayBuffer
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }
};

// Export for use in other modules
window.Utils = Utils;
