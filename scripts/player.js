/**
 * Player Module
 * Handles video playback, pattern sync, and queue management
 */

const Player = {
    // State
    videoElement: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
    playbackMode: 'next', // 'loop' or 'next'
    isFullscreen: false,
    
    // Queue
    queue: [],
    currentQueueIndex: 0,
    
    // Pattern state
    activePattern: null,
    lastPatternTime: -1,
    
    // Volume overlay
    volumeOverlayTimer: null,
    
    // Callbacks
    onTimeUpdate: null,
    onPlayStateChange: null,
    onQueueChange: null,
    onPatternChange: null,
    onVideoEnd: null,

    /**
     * Initialize player with video element
     */
    init(videoElement) {
        this.videoElement = videoElement;
        
        videoElement.addEventListener('loadedmetadata', () => {
            this.duration = videoElement.duration;
            videoElement.volume = this.volume;
        });
        
        videoElement.addEventListener('timeupdate', () => {
            this.currentTime = videoElement.currentTime;
            this.checkPatternSync();
            
            if (this.onTimeUpdate) {
                this.onTimeUpdate(this.currentTime, this.duration);
            }
            
            // Update fullscreen progress if in fullscreen
            this.updateFullscreenProgress();
        });
        
        videoElement.addEventListener('play', () => {
            this.isPlaying = true;
            this.updateFullscreenPlayButton();
            if (this.onPlayStateChange) {
                this.onPlayStateChange(true);
            }
        });
        
        videoElement.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updateFullscreenPlayButton();
            if (this.onPlayStateChange) {
                this.onPlayStateChange(false);
            }
        });
        
        videoElement.addEventListener('ended', () => {
            this.handleVideoEnd();
        });
        
        // Click overlay for play/pause and double-click for fullscreen
        const clickOverlay = document.getElementById('videoClickOverlay');
        if (clickOverlay) {
            let clickTimeout = null;
            
            clickOverlay.addEventListener('click', (e) => {
                // Use timeout to distinguish single vs double click
                if (clickTimeout) {
                    // Double click - toggle fullscreen
                    clearTimeout(clickTimeout);
                    clickTimeout = null;
                    this.toggleFullscreen();
                } else {
                    // Single click - wait to see if it's a double click
                    clickTimeout = setTimeout(() => {
                        clickTimeout = null;
                        this.togglePlayPause();
                    }, 250);
                }
            });
        }
        
        // Also handle clicks directly on video (non-fullscreen, no overlay)
        let videoClickTimeout = null;
        videoElement.addEventListener('click', (e) => {
            if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
                return; // Let overlay handle it in fullscreen
            }
            
            if (videoClickTimeout) {
                clearTimeout(videoClickTimeout);
                videoClickTimeout = null;
                this.toggleFullscreen();
            } else {
                videoClickTimeout = setTimeout(() => {
                    videoClickTimeout = null;
                    this.togglePlayPause();
                }, 250);
            }
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowLeft':
                    this.seek(this.currentTime - 5);
                    break;
                case 'ArrowRight':
                    this.seek(this.currentTime + 5);
                    break;
                case 'f':
                case 'F':
                    this.toggleFullscreen();
                    break;
                case 'm':
                case 'M':
                    this.toggleMute();
                    break;
            }
        });
        
        // Fullscreen change detection (cross-browser)
        const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
        
        const fullscreenChangeHandler = () => {
        this.isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
        const container = document.getElementById('videoContainer');
        const firefoxHints = document.getElementById('fullscreenFirefoxHints');
        const controls = document.getElementById('fullscreenControls');
        const bottomControls = document.getElementById('fullscreenBottom');
        
        // Add/remove class as fallback for CSS pseudo-selectors
        if (container) {
            container.classList.toggle('is-fullscreen', this.isFullscreen);
        }
        
        // Remove cursor-hidden when exiting fullscreen
        if (!this.isFullscreen) {
            container.classList.remove('cursor-hidden');
        }
        
        // Firefox-specific: Force controls to be visible and interactive
        if (isFirefox && this.isFullscreen) {
            if (controls) {
                controls.style.display = 'block';
                // Don't set pointer-events on container - let clicks pass through to overlay
            }
            if (bottomControls) {
                bottomControls.style.pointerEvents = 'auto';
            }
        } else if (!this.isFullscreen) {
            // Reset when exiting fullscreen
            if (controls) {
                controls.style.display = '';
            }
        }
        
        // Show Firefox hints when in fullscreen on Firefox
        if (firefoxHints) {
            if (this.isFullscreen && isFirefox) {
                firefoxHints.style.display = 'block';
                // Auto-hide after 5 seconds
                setTimeout(() => {
                    firefoxHints.style.display = 'none';
                }, 5000);
            } else {
                firefoxHints.style.display = 'none';
            }
        }
        
        if (this.isFullscreen) {
            this.initFullscreenControls();
        }
    };
        
        document.addEventListener('fullscreenchange', fullscreenChangeHandler);
        document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);
        document.addEventListener('mozfullscreenchange', fullscreenChangeHandler);
        
        // Fullscreen progress bar
        const fullscreenProgress = document.getElementById('fullscreenProgress');
        if (fullscreenProgress) {
            fullscreenProgress.addEventListener('input', (e) => {
                this.seek(parseFloat(e.target.value));
            });
        }
        
        // Fullscreen play button
        const fullscreenPlayBtn = document.getElementById('fullscreenPlayBtn');
        if (fullscreenPlayBtn) {
            fullscreenPlayBtn.addEventListener('click', () => this.togglePlayPause());
        }
        
        // Fullscreen exit button
        const fullscreenExitBtn = document.getElementById('fullscreenExitBtn');
        if (fullscreenExitBtn) {
            fullscreenExitBtn.addEventListener('click', () => {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                }
            });
        }
        
        // Fullscreen volume slider
        const fullscreenVolumeSlider = document.getElementById('fullscreenVolumeSlider');
        if (fullscreenVolumeSlider) {
            fullscreenVolumeSlider.addEventListener('input', (e) => {
                this.setVolume(parseFloat(e.target.value));
            });
        }
    },
    
    /**
     * Initialize fullscreen controls (mouse move to show/hide)
     * YouTube-style: show on mouse move, fade after 3s of no movement
     */
    initFullscreenControls() {
        const container = document.getElementById('videoContainer');
        const controls = document.getElementById('fullscreenControls');
        const bottomControls = document.getElementById('fullscreenBottom');
        if (!container || !controls) return;
        
        let hideTimeout;
        const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
        
        const showControls = () => {
            if (!this.isFullscreen) return;
            
            controls.classList.add('visible');
            container.classList.remove('cursor-hidden');
            
            // Firefox: ensure controls are interactive
            if (isFirefox && bottomControls) {
                bottomControls.style.pointerEvents = 'auto';
            }
            
            // Clear any existing timeout
            clearTimeout(hideTimeout);
            
            // Hide after 3 seconds of no movement
            hideTimeout = setTimeout(() => {
                if (this.isFullscreen) {
                    controls.classList.remove('visible');
                    container.classList.add('cursor-hidden');
                }
            }, 3000);
        };
        
        const hideControls = () => {
            clearTimeout(hideTimeout);
            controls.classList.remove('visible');
            container.classList.add('cursor-hidden');
        };
        
        // Show on mouse move anywhere in fullscreen
        const mouseMoveHandler = (e) => {
            if (this.isFullscreen) {
                showControls();
            }
        };
        
        // Use capture phase and attach to document for Firefox
        container.addEventListener('mousemove', mouseMoveHandler, { capture: true });
        document.addEventListener('mousemove', (e) => {
            if (this.isFullscreen) {
                showControls();
            }
        }, { passive: true });
        
        // Keep visible while interacting with controls
        controls.addEventListener('mouseenter', () => {
            clearTimeout(hideTimeout);
            controls.classList.add('visible');
            container.classList.remove('cursor-hidden');
        });
        
        controls.addEventListener('mouseleave', () => {
            // Restart hide timer when leaving controls
            hideTimeout = setTimeout(() => {
                if (this.isFullscreen) {
                    controls.classList.remove('visible');
                    container.classList.add('cursor-hidden');
                }
            }, 3000);
        });
        
        // Show immediately when entering fullscreen
        showControls();
    },
    
    /**
     * Update fullscreen progress bar
     */
    updateFullscreenProgress() {
        const progress = document.getElementById('fullscreenProgress');
        const currentTimeEl = document.getElementById('fullscreenCurrentTime');
        const durationEl = document.getElementById('fullscreenDuration');
        
        if (progress) {
            progress.max = this.duration;
            progress.value = this.currentTime;
        }
        if (currentTimeEl) {
            currentTimeEl.textContent = Utils.formatTime(this.currentTime);
        }
        if (durationEl) {
            durationEl.textContent = Utils.formatTime(this.duration);
        }
    },
    
    /**
     * Update fullscreen play button icon
     */
    updateFullscreenPlayButton() {
        const btn = document.getElementById('fullscreenPlayBtn');
        if (!btn) return;
        
        btn.innerHTML = this.isPlaying 
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    },
    
    /**
     * Show volume overlay temporarily
     */
    showVolumeOverlay() {
        const overlay = document.getElementById('volumeOverlay');
        if (!overlay) return;
        
        overlay.classList.add('visible');
        
        // Clear existing timer
        if (this.volumeOverlayTimer) {
            clearTimeout(this.volumeOverlayTimer);
        }
        
        // Hide after 3 seconds
        this.volumeOverlayTimer = setTimeout(() => {
            overlay.classList.remove('visible');
        }, 3000);
    },

    /**
     * Load queue from files
     */
    loadQueue(files) {
        this.queue = files.filter(f => f.status === 'complete' && f.script);
        this.currentQueueIndex = 0;
        
        if (this.onQueueChange) {
            this.onQueueChange(this.queue.length, this.currentQueueIndex);
        }
        
        if (this.queue.length > 0) {
            this.loadQueueItem(0);
        }
    },

    /**
     * Load specific queue item
     */
    loadQueueItem(index) {
        if (index < 0 || index >= this.queue.length) return false;
        
        const item = this.queue[index];
        this.currentQueueIndex = index;
        
        // Create video URL if needed
        const videoUrl = FileHandler.createVideoUrl(item);
        this.videoElement.src = videoUrl;
        
        // Reset state
        this.currentTime = 0;
        this.activePattern = null;
        this.lastPatternTime = -1;
        
        if (this.onQueueChange) {
            this.onQueueChange(this.queue.length, this.currentQueueIndex);
        }
        
        return true;
    },

    /**
     * Get current queue item
     */
    getCurrentItem() {
        return this.queue[this.currentQueueIndex] || null;
    },

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (!this.videoElement) return;
        
        if (this.isPlaying) {
            this.videoElement.pause();
            // Immediately stop device - don't let current pattern finish
            this.stopDevice();
        } else {
            this.videoElement.play();
            this.startPatternPlayback();
        }
    },

    /**
     * Play
     */
    play() {
        if (this.videoElement && !this.isPlaying) {
            this.videoElement.play();
            this.startPatternPlayback();
        }
    },

    /**
     * Pause
     */
    pause() {
        if (this.videoElement && this.isPlaying) {
            this.videoElement.pause();
            // Immediately stop device - don't let current pattern finish
            this.stopDevice();
        }
    },

    /**
     * Stop
     */
    stop() {
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.currentTime = 0;
            this.currentTime = 0;
            this.isPlaying = false;
            this.stopDevice();
            
            if (this.onPlayStateChange) {
                this.onPlayStateChange(false);
            }
        }
    },

    /**
     * Seek to time
     */
    seek(time) {
        if (this.videoElement) {
            this.videoElement.currentTime = Utils.clamp(time, 0, this.duration);
        }
    },

    /**
     * Set volume
     */
    setVolume(vol) {
        this.volume = Utils.clamp(vol, 0, 1);
        if (this.videoElement) {
            this.videoElement.volume = this.volume;
        }
        
        // Sync fullscreen volume slider
        const fullscreenVolumeSlider = document.getElementById('fullscreenVolumeSlider');
        if (fullscreenVolumeSlider) {
            fullscreenVolumeSlider.value = this.volume;
        }
    },

    /**
     * Toggle mute
     */
    toggleMute() {
        if (this.volume > 0) {
            this._savedVolume = this.volume;
            this.setVolume(0);
        } else {
            this.setVolume(this._savedVolume || 1);
        }
    },

    /**
     * Set playback mode
     */
    setPlaybackMode(mode) {
        this.playbackMode = mode; // 'loop' or 'next'
        if (this.videoElement) {
            this.videoElement.loop = mode === 'loop';
        }
    },

    /**
     * Toggle fullscreen (cross-browser)
     */
    toggleFullscreen() {
        const container = this.videoElement?.parentElement;
        if (!container) return;
        
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
        
        if (!isFullscreen) {
            // Enter fullscreen
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.mozRequestFullScreen) {
                container.mozRequestFullScreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            }
        }
    },

    /**
     * Go to next in queue
     */
    async next(force = false) {
        if (this.isPlaying && !force) {
            return false; // Caller should show confirmation
        }
        
        // Stop current playback and device
        this.stop();
        
        if (this.currentQueueIndex < this.queue.length - 1) {
            const success = this.loadQueueItem(this.currentQueueIndex + 1);
            if (success) {
                // Wait for video to be ready, then autoplay
                await this.waitForVideoReady();
                this.play();
            }
            return success;
        }
        return false;
    },

    /**
     * Go to previous in queue
     */
    async previous(force = false) {
        if (this.isPlaying && !force) {
            return false; // Caller should show confirmation
        }
        
        // Stop current playback and device
        this.stop();
        
        if (this.currentQueueIndex > 0) {
            const success = this.loadQueueItem(this.currentQueueIndex - 1);
            if (success) {
                // Wait for video to be ready, then autoplay
                await this.waitForVideoReady();
                this.play();
            }
            return success;
        }
        return false;
    },
    
    /**
     * Wait for video to be ready to play
     */
    waitForVideoReady() {
        return new Promise((resolve) => {
            if (!this.videoElement) {
                resolve();
                return;
            }
            
            if (this.videoElement.readyState >= 3) {
                resolve();
                return;
            }
            
            const onCanPlay = () => {
                this.videoElement.removeEventListener('canplay', onCanPlay);
                resolve();
            };
            
            this.videoElement.addEventListener('canplay', onCanPlay);
            
            // Timeout fallback
            setTimeout(() => {
                this.videoElement.removeEventListener('canplay', onCanPlay);
                resolve();
            }, 3000);
        });
    },

    /**
     * Handle video end
     */
    async handleVideoEnd() {
        this.stopDevice();
        
        if (this.playbackMode === 'next' && this.currentQueueIndex < this.queue.length - 1) {
            // Auto-advance to next
            this.loadQueueItem(this.currentQueueIndex + 1);
            await this.waitForVideoReady();
            this.play();
        } else if (this.playbackMode === 'loop') {
            // Loop is handled by video element's loop attribute
        } else {
            // End of queue
            if (this.onVideoEnd) {
                this.onVideoEnd();
            }
        }
    },

    /**
     * Start pattern playback (with smart resume support)
     */
    startPatternPlayback() {
        const item = this.getCurrentItem();
        if (!item?.script) return;
        
        // For simple patterns, send immediately
        if (item.script.type === 'simple') {
            const pattern = item.script.patternName 
                ? PatternGenerator.getLibraryPattern(item.script.patternName, LovenseApi.getActiveDevice()?.deviceType)
                : item.script.pattern;
            
            if (pattern && LovenseApi.isConnected) {
                LovenseApi.sendPattern(LovenseApi.activeDeviceId, pattern, item.script.duration);
                this.activePattern = { pattern, duration: item.script.duration };
                
                if (this.onPatternChange) {
                    this.onPatternChange(this.activePattern);
                }
            }
            return;
        }
        
        // For scripted patterns, find the pattern at current time and send a sliced version
        if (item.script.type === 'scripted' && item.script.loaded) {
            this.sendPatternAtCurrentTime();
        }
    },
    
    /**
     * Send the appropriate pattern for current video time (with smart slicing for resume)
     */
    sendPatternAtCurrentTime() {
        const item = this.getCurrentItem();
        if (!item?.script?.patterns) return;
        
        // Find the pattern that covers current time
        const currentPattern = item.script.patterns.find(p => {
            const startTime = p.time ?? p.rawCommand?._meta?.startTime ?? 0;
            const endTime = p.rawCommand?._meta?.endTime ?? (startTime + (p.duration || p.rawCommand?.timeSec || 1));
            return this.currentTime >= startTime && this.currentTime < endTime;
        });
        
        if (!currentPattern) return;
        
        // Check if this pattern has raw command data we can slice
        if (currentPattern.rawCommand?._meta && currentPattern.rawCommand.strength) {
            const slicedPattern = PatternGenerator.createResumePattern(
                currentPattern.rawCommand, 
                this.currentTime
            );
            
            if (slicedPattern && LovenseApi.isConnected && LovenseApi.activeDeviceId) {
                LovenseApi.sendPattern(
                    LovenseApi.activeDeviceId,
                    currentPattern.pattern,
                    slicedPattern.timeSec,
                    slicedPattern
                );
                
                this.activePattern = { ...currentPattern, sliced: true };
                this.lastPatternTime = currentPattern.time;
                
                if (this.onPatternChange) {
                    this.onPatternChange(this.activePattern);
                }
            }
        }
    },

    /**
     * Check and sync patterns during playback
     * Pre-sends next pattern slightly before current one ends for seamless transitions
     */
    checkPatternSync() {
        const item = this.getCurrentItem();
        if (!item?.script || item.script.type !== 'scripted' || !item.script.loaded) return;
        if (!this.isPlaying) return;
        
        const patterns = item.script.patterns;
        
        // Find current pattern index
        let currentPatternIndex = -1;
        for (let i = 0; i < patterns.length; i++) {
            const p = patterns[i];
            const startTime = p.time ?? p.rawCommand?._meta?.startTime ?? 0;
            const endTime = p.rawCommand?._meta?.endTime ?? (startTime + (p.duration || p.rawCommand?.timeSec || 1));
            if (this.currentTime >= startTime && this.currentTime < endTime) {
                currentPatternIndex = i;
                break;
            }
        }
        
        if (currentPatternIndex === -1) return;
        
        const currentPattern = patterns[currentPatternIndex];
        const patternStartTime = currentPattern.time ?? currentPattern.rawCommand?._meta?.startTime ?? 0;
        const patternEndTime = currentPattern.rawCommand?._meta?.endTime ?? 
            (patternStartTime + (currentPattern.duration || currentPattern.rawCommand?.timeSec || 1));
        
        // Pre-send threshold: send next pattern 200ms before current ends
        const PRE_SEND_MS = 0.2;
        const timeUntilEnd = patternEndTime - this.currentTime;
        const nextPatternIndex = currentPatternIndex + 1;
        
        // Check if we should pre-send the next pattern
        if (timeUntilEnd <= PRE_SEND_MS && timeUntilEnd > 0 && nextPatternIndex < patterns.length) {
            const nextPattern = patterns[nextPatternIndex];
            const nextStartTime = nextPattern.time ?? nextPattern.rawCommand?._meta?.startTime ?? 0;
            
            // Only pre-send if we haven't already
            if (this.lastPatternTime !== nextStartTime) {
                this.lastPatternTime = nextStartTime;
                this.sendPattern(nextPattern);
                return;
            }
        }
        
        // Normal pattern send when entering a new pattern's time window
        if (Math.abs(this.lastPatternTime - patternStartTime) >= 0.05) {
            this.lastPatternTime = patternStartTime;
            this.sendPattern(currentPattern);
        }
    },
    
    /**
     * Send a pattern to the device
     */
    sendPattern(pattern) {
        let patternToSend;
        let rawCommand = null;
        
        if (pattern.patternName) {
            patternToSend = PatternGenerator.getLibraryPattern(
                pattern.patternName, 
                LovenseApi.getActiveDevice()?.deviceType
            );
        } else if (pattern.rawCommand) {
            patternToSend = pattern.pattern;
            rawCommand = pattern.rawCommand;
        } else {
            patternToSend = pattern.pattern;
        }
        
        this.activePattern = { 
            ...pattern, 
            pattern: patternToSend 
        };
        
        if (LovenseApi.isConnected && LovenseApi.activeDeviceId) {
            LovenseApi.sendPattern(
                LovenseApi.activeDeviceId, 
                patternToSend, 
                pattern.duration || rawCommand?.timeSec || 1, 
                rawCommand
            );
        }
        
        if (this.onPatternChange) {
            this.onPatternChange(this.activePattern);
        }
    },

    /**
     * Stop device
     */
    stopDevice() {
        if (LovenseApi.isConnected && LovenseApi.activeDeviceId) {
            LovenseApi.stopDevice(LovenseApi.activeDeviceId);
        }
        this.activePattern = null;
        this.lastPatternTime = -1;
    },

    /**
     * Handle volume scroll on video
     */
    handleVolumeScroll(e) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        this.setVolume(this.volume + delta);
        
        // Update volume overlay display and show it
        const overlayValue = document.getElementById('volumeOverlayValue');
        if (overlayValue) {
            overlayValue.textContent = `${Math.round(this.volume * 100)}%`;
        }
        this.showVolumeOverlay();
        
        // Update volume slider
        const slider = document.getElementById('volumeSlider');
        if (slider) {
            slider.value = this.volume;
        }
        
        const valueDisplay = document.getElementById('volumeValue');
        if (valueDisplay) {
            valueDisplay.textContent = `${Math.round(this.volume * 100)}%`;
        }
    },

    /**
     * Clean up
     */
    destroy() {
        this.stop();
        this.queue = [];
        this.currentQueueIndex = 0;
    }
};

// Export for use in other modules
window.Player = Player;
