/**
 * Lovense Video Sync - Main Application
 * Ties together all modules and handles app initialization
 */

const App = {
    /**
     * Initialize the application
     */
    init() {
        console.log('Lovense Video Sync initializing...');
        
        // Initialize UI first
        UI.init();
        
        // Initialize audio analyzer
        AudioAnalyzer.init();
        
        // Set up file handler callbacks
        this.setupFileHandlerCallbacks();
        
        // Set up Lovense API callbacks
        this.setupLovenseCallbacks();
        
        // Set up player callbacks
        this.setupPlayerCallbacks();
        
        // Bind UI events
        this.bindEvents();
        
        // Initialize drop zone
        if (UI.elements.dropZone) {
            FileHandler.initDropZone(UI.elements.dropZone, {
                acceptVideo: true,
                acceptJson: true,
                onDrop: () => this.onFilesAdded()
            });
        }
        
        // Initialize play view drop zone
        if (UI.elements.playDropZone) {
            FileHandler.initDropZone(UI.elements.playDropZone, {
                acceptVideo: true,
                acceptJson: true,
                onDrop: () => this.onPlayViewFilesAdded()
            });
        }
        
        // Initialize video player
        if (UI.elements.videoElement) {
            Player.init(UI.elements.videoElement);
        }
        
        // Check for saved IP
        const savedIP = LovenseApi.getSavedIP();
        if (savedIP && UI.elements.manualIPInput) {
            UI.elements.manualIPInput.value = savedIP;
        }
        
        console.log('Lovense Video Sync ready!');
    },

    /**
     * Set up file handler callbacks
     */
    setupFileHandlerCallbacks() {
        FileHandler.onFilesChange = (files) => {
            UI.renderFileCards(files, FileHandler.activeFileIndex);
            UI.updateBatchActions(FileHandler.getCompletedCount());
            
            // Show/hide panels based on file state
            const hasFiles = files.length > 0;
            UI.elements.analysisPanel?.classList.toggle('visible', hasFiles);
            
            if (!hasFiles) {
                UI.hideResults();
            }
        };
        
        FileHandler.onActiveFileChange = (file, index) => {
            UI.renderFileCards(FileHandler.files, index);
            UI.updateFileInfo(file);
            
            if (file?.analysisResult) {
                UI.showResults({
                    ...file.analysisResult,
                    lovenseJson: file.lovenseJson
                });
            } else {
                UI.hideResults();
            }
        };
        
        FileHandler.onProcessingProgress = (completed, total, text) => {
            UI.updateProgress(completed, total, text);
        };
        
        FileHandler.onProcessingComplete = (total, errorCount) => {
            setTimeout(() => UI.hideProgress(), 1000);
            
            if (errorCount > 0) {
                UI.showToast(`Completed with ${errorCount} error(s)`);
            } else {
                UI.showToast(`Converted ${total} file(s) successfully`);
            }
            
            // Update current file display
            const activeFile = FileHandler.getActiveFile();
            if (activeFile?.analysisResult) {
                UI.showResults({
                    ...activeFile.analysisResult,
                    lovenseJson: activeFile.lovenseJson
                });
            }
            
            // Re-enable convert button
            if (UI.elements.convertBtn) {
                UI.elements.convertBtn.disabled = false;
            }
        };
    },

    /**
     * Set up Lovense API callbacks
     */
    setupLovenseCallbacks() {
        LovenseApi.onConnectionChange = (isConnected, devices) => {
            UI.updateConnectionUI(isConnected, devices);
            
            if (isConnected) {
                UI.showToast(`Connected to ${devices.length} device(s)`);
                
                // Load queue if we have completed files
                const playableFiles = FileHandler.getPlayableFiles();
                if (playableFiles.length > 0) {
                    Player.loadQueue(playableFiles);
                }
            }
        };
        
        LovenseApi.onNetworkActivity = (entry) => {
            UI.addNetworkLog(entry);
        };
    },

    /**
     * Set up player callbacks
     */
    setupPlayerCallbacks() {
        Player.onTimeUpdate = (currentTime, duration) => {
            UI.updatePlayerUI(currentTime, duration, Player.isPlaying, Player.volume);
            
            // Update pattern visualization
            const item = Player.getCurrentItem();
            if (item?.script && UI.elements.patternCanvas) {
                Visualizer.drawPatternVisualization(
                    UI.elements.patternCanvas,
                    item.script,
                    currentTime,
                    duration
                );
            }
        };
        
        Player.onPlayStateChange = (isPlaying) => {
            UI.updatePlayPauseButton(isPlaying);
            
            // Update file status in sidebar
            const item = Player.getCurrentItem();
            if (item) {
                item.status = isPlaying ? 'playing' : 'complete';
                UI.renderFileCards(FileHandler.files, Player.currentQueueIndex, 'play');
            }
        };
        
        Player.onQueueChange = (queueLength, currentIndex) => {
            // Update sidebar to show current queue position
            UI.updateQueueInSidebar(Player.queue, currentIndex);
        };
        
        Player.onPatternChange = (pattern) => {
            // Could show current pattern info in UI
        };
        
        Player.onVideoEnd = () => {
            UI.showToast('Playback complete');
        };
    },

    /**
     * Bind UI events
     */
    bindEvents() {
        // Convert button
        UI.elements.convertBtn?.addEventListener('click', () => this.handleConvert());
        
        // Reset button
        UI.elements.resetBtn?.addEventListener('click', () => this.handleReset());
        
        // Add more files
        UI.elements.addMoreBtn?.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'video/*,.json,.funscript';
            input.onchange = (e) => {
                if (e.target.files.length) {
                    FileHandler.handleFiles(Array.from(e.target.files));
                }
            };
            input.click();
        });
        
        // Clear all
        UI.elements.clearAllBtn?.addEventListener('click', async () => {
            const confirmed = await UI.showConfirm('Clear all files?');
            if (confirmed) {
                FileHandler.clearAll();
                UI.hideResults();
            }
        });
        
        // Copy JSON
        UI.elements.copyJsonBtn?.addEventListener('click', () => {
            if (UI.elements.jsonOutput?.value) {
                navigator.clipboard.writeText(UI.elements.jsonOutput.value).then(() => {
                    UI.showToast('JSON copied to clipboard!');
                });
            }
        });
        
        // Download JSON
        UI.elements.downloadJsonBtn?.addEventListener('click', () => {
            const activeFile = FileHandler.getActiveFile();
            if (activeFile?.lovenseJson) {
                const filename = activeFile.file.name.replace(/\.[^/.]+$/, '') + '_lovense.funscript';
                Utils.downloadJson(activeFile.lovenseJson, filename);
                UI.showToast('Funscript downloaded!');
            }
        });
        
        // Convert all (regenerate with new settings)
        UI.elements.convertAllBtn?.addEventListener('click', () => {
            const settings = UI.getSettings();
            let count = 0;
            
            FileHandler.files.forEach((f, i) => {
                if (f.analysisResult) {
                    FileHandler.regeneratePatterns(i, settings);
                    count++;
                }
            });
            
            // Update display
            const activeFile = FileHandler.getActiveFile();
            if (activeFile?.analysisResult) {
                UI.showResults({
                    ...activeFile.analysisResult,
                    lovenseJson: activeFile.lovenseJson
                });
            }
            
            UI.showToast(`Regenerated patterns for ${count} file(s)`);
        });
        
        // Download all
        UI.elements.downloadAllBtn?.addEventListener('click', async () => {
            const completedFiles = FileHandler.files.filter(f => f.lovenseJson);
            if (completedFiles.length === 0) {
                UI.showToast('No patterns to download');
                return;
            }
            
            if (completedFiles.length <= 3) {
                completedFiles.forEach(f => {
                    const filename = f.file.name.replace(/\.[^/.]+$/, '') + '_lovense.json';
                    Utils.downloadJson(f.lovenseJson, filename);
                });
                UI.showToast(`Downloaded ${completedFiles.length} JSON file(s)`);
            } else {
                // Use JSZip for bulk download
                UI.showToast('Creating zip file...');
                const zip = new JSZip();
                
                completedFiles.forEach(f => {
                    const filename = f.file.name.replace(/\.[^/.]+$/, '') + '_lovense.json';
                    zip.file(filename, JSON.stringify(f.lovenseJson, null, 2));
                });
                
                const blob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `lovense_patterns_${completedFiles.length}_files.zip`;
                a.click();
                URL.revokeObjectURL(url);
                
                UI.showToast(`Downloaded ${completedFiles.length} files as zip`);
            }
        });
        
        // Connect button
        UI.elements.connectBtn?.addEventListener('click', () => this.handleConnect());
        
        // Reconnect button
        UI.elements.reconnectBtn?.addEventListener('click', () => this.handleConnect(true));
        
        // Disconnect button
        UI.elements.disconnectBtn?.addEventListener('click', () => {
            LovenseApi.disconnect();
            UI.showToast('Disconnected');
        });
        
        // Device select
        UI.elements.deviceSelect?.addEventListener('change', (e) => {
            LovenseApi.setActiveDevice(e.target.value);
        });
        
        // Player controls
        UI.elements.playPauseBtn?.addEventListener('click', () => Player.togglePlayPause());
        
        UI.elements.prevBtn?.addEventListener('click', async () => {
            if (Player.isPlaying) {
                const confirmed = await UI.showConfirm('Playback is running. Go to previous?');
                if (confirmed) {
                    const success = await Player.previous(true);
                    if (!success) UI.showToast('Already at first track');
                }
            } else {
                const success = await Player.previous(true);
                if (!success) UI.showToast('Already at first track');
            }
        });
        
        UI.elements.nextBtn?.addEventListener('click', async () => {
            if (Player.isPlaying) {
                const confirmed = await UI.showConfirm('Playback is running. Go to next?');
                if (confirmed) {
                    const success = await Player.next(true);
                    if (!success) UI.showToast('Already at last track');
                }
            } else {
                const success = await Player.next(true);
                if (!success) UI.showToast('Already at last track');
            }
        });
        
        UI.elements.playbackModeBtn?.addEventListener('click', () => {
            const newMode = Player.playbackMode === 'loop' ? 'next' : 'loop';
            Player.setPlaybackMode(newMode);
            UI.updatePlaybackModeButton(newMode);
        });
        
        UI.elements.playerProgress?.addEventListener('input', (e) => {
            Player.seek(parseFloat(e.target.value));
        });
        
        UI.elements.volumeSlider?.addEventListener('input', (e) => {
            Player.setVolume(parseFloat(e.target.value));
        });
        
        UI.elements.fullscreenBtn?.addEventListener('click', () => {
            Player.toggleFullscreen();
        });
        
        // Video container scroll for volume (passive: false to allow preventDefault)
        UI.elements.videoContainer?.addEventListener('wheel', (e) => {
            Player.handleVolumeScroll(e);
        }, { passive: false });
        
        // Keyboard navigation for files
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.key === '[' || (e.key === 'ArrowLeft' && e.ctrlKey)) {
                e.preventDefault();
                FileHandler.navigateFile(-1);
            } else if (e.key === ']' || (e.key === 'ArrowRight' && e.ctrlKey)) {
                e.preventDefault();
                FileHandler.navigateFile(1);
            }
        });
        
        // Window resize - redraw visualizations
        window.addEventListener('resize', Utils.debounce(() => {
            const activeFile = FileHandler.getActiveFile();
            if (activeFile?.analysisResult && UI.elements.waveformCanvas) {
                Visualizer.drawConverterWaveform(UI.elements.waveformCanvas, activeFile.analysisResult);
            }
        }, 200));
    },

    /**
     * Handle files added in convert view
     */
    onFilesAdded() {
        UI.elements.analysisPanel?.classList.add('visible');
    },
    
    /**
     * Handle files added in play view (pre-saved video+JSON pairs or auto-generate)
     */
    async onPlayViewFilesAdded() {
        // Remember current playback state BEFORE any processing
        const wasPlaying = Player.isPlaying;
        const currentItem = Player.getCurrentItem();
        const currentItemId = currentItem?.id;
        
        // Temporarily disable FileHandler's onFilesChange to prevent UI interference
        const originalOnFilesChange = FileHandler.onFilesChange;
        FileHandler.onFilesChange = null;
        
        try {
            // For play view uploads, try to load JSON scripts for files that have them
            for (const file of FileHandler.files) {
                if (file.jsonFile && !file.script) {
                    await FileHandler.loadScriptFromJson(file);
                    if (file.script) {
                        file.status = 'complete';
                    }
                }
            }
            
            // Auto-generate patterns for files without JSON
            const filesNeedingGeneration = FileHandler.files.filter(
                f => !f.script && !f.jsonFile && (f.status === 'pending' || f.status === 'error')
            );
            
            if (filesNeedingGeneration.length > 0) {
                UI.showToast(`Auto-generating patterns for ${filesNeedingGeneration.length} file(s)...`);
                
                const settings = UI.getSettings();
                await FileHandler.processPendingFiles(settings);
            }
        } finally {
            // Restore the callback
            FileHandler.onFilesChange = originalOnFilesChange;
        }
        
        // Get all playable files after processing
        const playableFiles = FileHandler.getPlayableFiles();
        
        if (playableFiles.length > 0) {
            // Find current playing item's index in the NEW queue
            let newCurrentIndex = 0;
            if (currentItemId) {
                const foundIndex = playableFiles.findIndex(f => f.id === currentItemId);
                if (foundIndex !== -1) {
                    newCurrentIndex = foundIndex;
                }
            }
            
            // Update Player queue directly
            Player.queue = playableFiles;
            Player.currentQueueIndex = newCurrentIndex;
            
            // Show player section
            UI.elements.playerSection?.classList.remove('hidden');
            
            // If nothing was playing before, load the first item
            if (!currentItemId) {
                Player.loadQueueItem(0);
            }
            
            // Trigger queue change callback to update UI
            if (Player.onQueueChange) {
                Player.onQueueChange(Player.queue.length, Player.currentQueueIndex);
            }
            
            UI.showToast(`${playableFiles.length} file(s) ready to play`);
        }
        
        // Update sidebar in play mode
        UI.renderFileCards(FileHandler.files, Player.currentQueueIndex, 'play');
    },

    /**
     * Handle convert button click
     */
    async handleConvert() {
        const pendingFiles = FileHandler.files.filter(f => f.status === 'pending' || f.status === 'error');
        
        if (pendingFiles.length === 0) {
            // Regenerate for current file
            const activeFile = FileHandler.getActiveFile();
            if (activeFile?.analysisResult) {
                const settings = UI.getSettings();
                FileHandler.regeneratePatterns(FileHandler.activeFileIndex, settings);
                UI.showResults({
                    ...activeFile.analysisResult,
                    lovenseJson: activeFile.lovenseJson
                });
                UI.showToast('Pattern regenerated with new settings');
            } else {
                UI.showToast('No pending files to convert');
            }
            return;
        }
        
        if (UI.elements.convertBtn) {
            UI.elements.convertBtn.disabled = true;
        }
        
        const settings = UI.getSettings();
        await FileHandler.processPendingFiles(settings);
    },

    /**
     * Handle reset button click
     */
    handleReset() {
        const activeFile = FileHandler.getActiveFile();
        if (activeFile) {
            activeFile.status = 'pending';
            activeFile.analysisResult = null;
            activeFile.lovenseJson = null;
            activeFile.script = null;
        }
        UI.hideResults();
        UI.renderFileCards(FileHandler.files, FileHandler.activeFileIndex);
    },

    /**
     * Handle connect button click
     */
    async handleConnect(isReconnect = false) {
        const manualIP = UI.elements.manualIPInput?.value?.trim();
        const savedIP = LovenseApi.getSavedIP();
        
        // Use manual IP, or saved IP for reconnect
        const ipToUse = manualIP || (isReconnect ? savedIP : null);
        
        UI.showConnectingState();
        
        const result = await LovenseApi.discoverDevices(ipToUse);
        
        if (!result.success) {
            UI.updateConnectionUI(false, []);
            if (isReconnect) {
                UI.showReconnectButton();
            }
            UI.showToast(result.error || 'Could not find devices');
        }
    },

    /**
     * Switch to play view with current files
     */
    goToPlayView() {
        const playableFiles = FileHandler.getPlayableFiles();
        if (playableFiles.length === 0) {
            UI.showToast('No converted files to play. Convert files first or upload video+Funscript.');
            return;
        }
        
        Player.loadQueue(playableFiles);
        UI.switchView('play');
        UI.renderFileCards(FileHandler.files, Player.currentQueueIndex, 'play');
        // Show player section (regardless of device connection)
        UI.elements.playerSection?.classList.remove('hidden');
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export for use in console/debugging
window.App = App;
