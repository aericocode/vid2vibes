/**
 * UI Module
 * Handles DOM manipulation, rendering, and UI state
 */

const UI = {
    // DOM element cache
    elements: {},
    
    // Current view
    currentView: 'convert', // 'convert' or 'play'
    
    // Network log for privacy monitor
    networkLog: [],
    privacyExpanded: false,

    /**
     * Initialize UI and cache DOM elements
     */
    init() {
        // Cache commonly used elements
        this.elements = {
            // Layout
            sidebar: document.getElementById('sidebar'),
            mainContent: document.getElementById('mainContent'),
            
            // Views
            convertView: document.getElementById('convertView'),
            playView: document.getElementById('playView'),
            viewTabConvert: document.getElementById('viewTabConvert'),
            viewTabPlay: document.getElementById('viewTabPlay'),
            
            // Drop zone
            dropZone: document.getElementById('dropZone'),
            playDropZone: document.getElementById('playDropZone'),
            
            // File info
            fileInfo: document.getElementById('fileInfo'),
            fileName: document.getElementById('fileName'),
            fileMeta: document.getElementById('fileMeta'),
            
            // Sidebar
            sidebarFiles: document.getElementById('sidebarFiles'),
            sidebarCount: document.getElementById('sidebarCount'),
            sidebarProgress: document.getElementById('sidebarProgress'),
            sidebarProgressText: document.getElementById('sidebarProgressText'),
            sidebarProgressCount: document.getElementById('sidebarProgressCount'),
            sidebarProgressFill: document.getElementById('sidebarProgressFill'),
            
            // Settings panel
            analysisPanel: document.getElementById('analysisPanel'),
            deviceType: document.getElementById('deviceType'),
            minIntensity: document.getElementById('minIntensity'),
            maxIntensity: document.getElementById('maxIntensity'),
            onBeatBoost: document.getElementById('onBeatBoost'),
            breakIntensity: document.getElementById('breakIntensity'),
            
            // Buttons
            convertBtn: document.getElementById('convertBtn'),
            resetBtn: document.getElementById('resetBtn'),
            addMoreBtn: document.getElementById('addMoreBtn'),
            clearAllBtn: document.getElementById('clearAllBtn'),
            
            // Results
            resultsSection: document.getElementById('resultsSection'),
            waveformCanvas: document.getElementById('waveformCanvas'),
            jsonOutput: document.getElementById('jsonOutput'),
            copyJsonBtn: document.getElementById('copyJsonBtn'),
            downloadJsonBtn: document.getElementById('downloadJsonBtn'),
            
            // Stats
            statDuration: document.getElementById('statDuration'),
            statAvgBpm: document.getElementById('statAvgBpm'),
            statPoints: document.getElementById('statPoints'),
            statPatterns: document.getElementById('statPatterns'),
            
            // Batch
            batchActions: document.getElementById('batchActions'),
            convertAllBtn: document.getElementById('convertAllBtn'),
            downloadAllBtn: document.getElementById('downloadAllBtn'),
            
            // Player view
            connectionPanel: document.getElementById('connectionPanel'),
            connectionStatus: document.getElementById('connectionStatus'),
            playerSection: document.getElementById('playerSection'),
            videoContainer: document.getElementById('videoContainer'),
            videoElement: document.getElementById('videoElement'),
            patternCanvas: document.getElementById('patternCanvas'),
            
            // Player controls
            playerProgress: document.getElementById('playerProgress'),
            playerCurrentTime: document.getElementById('playerCurrentTime'),
            playerDuration: document.getElementById('playerDuration'),
            playPauseBtn: document.getElementById('playPauseBtn'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            playbackModeBtn: document.getElementById('playbackModeBtn'),
            volumeSlider: document.getElementById('volumeSlider'),
            volumeValue: document.getElementById('volumeValue'),
            volumeOverlay: document.getElementById('volumeOverlay'),
            fullscreenBtn: document.getElementById('fullscreenBtn'),
            fullscreenProgress: document.getElementById('fullscreenProgress'),
            fullscreenCurrentTime: document.getElementById('fullscreenCurrentTime'),
            fullscreenDuration: document.getElementById('fullscreenDuration'),
            
            // Connection / Device bar
            deviceBar: document.getElementById('deviceBar'),
            deviceBarDot: document.getElementById('deviceBarDot'),
            deviceBarText: document.getElementById('deviceBarText'),
            manualIPInput: document.getElementById('manualIPInput'),
            connectBtn: document.getElementById('connectBtn'),
            reconnectBtn: document.getElementById('reconnectBtn'),
            disconnectBtn: document.getElementById('disconnectBtn'),
            deviceSelect: document.getElementById('deviceSelect'),
            
            // Privacy
            privacyMonitor: document.getElementById('privacyMonitor'),
            privacyHeader: document.getElementById('privacyHeader'),
            privacyContent: document.getElementById('privacyContent'),
            networkLogContainer: document.getElementById('networkLogContainer'),
            
            // Toast
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toastMessage'),
            
            // Modal
            confirmModal: document.getElementById('confirmModal'),
            confirmMessage: document.getElementById('confirmMessage'),
            confirmYes: document.getElementById('confirmYes'),
            confirmNo: document.getElementById('confirmNo'),
            
            // Changelog
            changelogBtn: document.getElementById('changelogBtn'),
            changelogModal: document.getElementById('changelogModal'),
            changelogContent: document.getElementById('changelogContent'),
            changelogClose: document.getElementById('changelogClose'),
            
            // Info
            infoBtn: document.getElementById('infoBtn'),
            infoModal: document.getElementById('infoModal'),
            infoContent: document.getElementById('infoContent'),
            infoClose: document.getElementById('infoClose')
        };
        
        this.bindEvents();
    },

    /**
     * Bind UI events
     */
    bindEvents() {
        // View tabs
        this.elements.viewTabConvert?.addEventListener('click', () => this.switchView('convert'));
        this.elements.viewTabPlay?.addEventListener('click', () => this.switchView('play'));
        
        // Privacy monitor toggle
        this.elements.privacyHeader?.addEventListener('click', () => {
            this.privacyExpanded = !this.privacyExpanded;
            this.elements.privacyContent?.classList.toggle('visible', this.privacyExpanded);
        });
        
        // Changelog modal
        this.elements.changelogBtn?.addEventListener('click', () => this.openChangelog());
        this.elements.changelogClose?.addEventListener('click', () => this.closeChangelog());
        this.elements.changelogModal?.addEventListener('click', (e) => {
            // Close when clicking overlay (not modal content)
            if (e.target === this.elements.changelogModal) {
                this.closeChangelog();
            }
        });
        
        // Info modal
        this.elements.infoBtn?.addEventListener('click', () => this.openInfo());
        this.elements.infoClose?.addEventListener('click', () => this.closeInfo());
        this.elements.infoModal?.addEventListener('click', (e) => {
            // Close when clicking overlay (not modal content)
            if (e.target === this.elements.infoModal) {
                this.closeInfo();
            }
        });
        
        // Close modals on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.elements.changelogModal?.classList.contains('visible')) {
                    this.closeChangelog();
                }
                if (this.elements.infoModal?.classList.contains('visible')) {
                    this.closeInfo();
                }
            }
        });
    },

    /**
     * Switch between convert and play views
     */
    switchView(view) {
        this.currentView = view;
        
        this.elements.viewTabConvert?.classList.toggle('active', view === 'convert');
        this.elements.viewTabPlay?.classList.toggle('active', view === 'play');
        
        this.elements.convertView?.classList.toggle('hidden', view !== 'convert');
        this.elements.playView?.classList.toggle('hidden', view !== 'play');
        
        // Update sidebar visibility based on view and files
        this.updateSidebarVisibility();
        
        // Re-render sidebar with appropriate mode
        if (view === 'play') {
            const playableFiles = FileHandler.getPlayableFiles();
            if (playableFiles.length > 0) {
                Player.loadQueue(playableFiles);
                this.renderFileCards(FileHandler.files, Player.currentQueueIndex, 'play');
                // Show player section when we have files (regardless of connection)
                this.elements.playerSection?.classList.remove('hidden');
            } else {
                this.renderFileCards(FileHandler.files, FileHandler.activeFileIndex, 'play');
                this.elements.playerSection?.classList.add('hidden');
            }
        } else {
            this.renderFileCards(FileHandler.files, FileHandler.activeFileIndex, 'convert');
        }
    },

    /**
     * Update sidebar visibility
     */
    updateSidebarVisibility() {
        const hasFiles = FileHandler.files.length > 0;
        this.elements.sidebar?.classList.toggle('visible', hasFiles);
        this.elements.mainContent?.classList.toggle('with-sidebar', hasFiles);
    },

    /**
     * Render file cards in sidebar
     */
    renderFileCards(files, activeIndex, currentView = null) {
        if (!this.elements.sidebarFiles) return;
        
        this.elements.sidebarFiles.innerHTML = '';
        this.elements.sidebarCount.textContent = files.length;
        
        // In play mode, find which file corresponds to the current queue item
        let activeFileId = null;
        if (currentView === 'play' && Player.queue.length > 0) {
            const currentQueueItem = Player.queue[Player.currentQueueIndex];
            if (currentQueueItem) {
                activeFileId = currentQueueItem.id;
            }
        }
        
        files.forEach((f, i) => {
            // Determine if this card should be active
            const isActive = currentView === 'play' 
                ? f.id === activeFileId 
                : i === activeIndex;
            
            const card = document.createElement('div');
            card.className = `file-card ${isActive ? 'active' : ''}`;
            
            const statusLabel = {
                'complete': 'Done',
                'processing': 'Processing',
                'error': 'Error',
                'playing': 'Playing',
                'pending': 'Pending'
            }[f.status] || 'Pending';
            
            // Get duration if available
            const duration = f.analysisResult?.duration || f.lovenseJson?.totalDuration || 0;
            const durationStr = duration > 0 ? Utils.formatTime(duration) : '';
            
            card.innerHTML = `
                <div class="file-card-header">
                    <div class="file-card-status ${f.status}"></div>
                    <div class="file-card-info">
                        <div class="file-card-name" title="${f.file.name}">${f.file.name}</div>
                        <div class="file-card-meta">
                            <span>${Utils.formatFileSize(f.file.size)}</span>
                            ${durationStr ? `<span class="file-card-duration">${durationStr}</span>` : ''}
                            <span>${statusLabel}</span>
                        </div>
                    </div>
                </div>
                <button class="file-card-remove" data-index="${i}" title="Remove">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            `;
            
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.file-card-remove')) {
                    // In play view, handle queue selection
                    if (currentView === 'play') {
                        // Find this file's index in the Player queue
                        const file = files[i];
                        const queueIndex = Player.queue.findIndex(q => q.id === file.id);
                        
                        if (queueIndex === -1) {
                            UI.showToast('This file is not ready for playback');
                            return;
                        }
                        
                        if (Player.isPlaying) {
                            UI.showConfirm('Playback is running. Switch to this video?').then(confirmed => {
                                if (confirmed) {
                                    Player.stop();
                                    Player.loadQueueItem(queueIndex);
                                    Player.waitForVideoReady().then(() => Player.play());
                                }
                            });
                        } else {
                            Player.loadQueueItem(queueIndex);
                        }
                    } else {
                        FileHandler.setActiveFile(i);
                    }
                }
            });
            
            card.querySelector('.file-card-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                FileHandler.removeFile(i);
            });
            
            this.elements.sidebarFiles.appendChild(card);
        });
        
        this.updateSidebarVisibility();
    },

    /**
     * Update file info display
     */
    updateFileInfo(file) {
        if (!file) {
            this.elements.fileInfo?.classList.remove('visible');
            return;
        }
        
        this.elements.fileInfo?.classList.add('visible');
        
        if (this.elements.fileName) {
            this.elements.fileName.textContent = file.file.name;
        }
        
        if (this.elements.fileMeta) {
            let statusText = Utils.formatFileSize(file.file.size);
            if (file.status === 'complete') statusText += ' • Converted';
            else if (file.status === 'processing') statusText += ' • Processing...';
            else if (file.status === 'error') statusText += ' • Error: ' + (file.error || 'Unknown');
            else statusText += ' • Pending';
            
            this.elements.fileMeta.textContent = statusText;
        }
    },

    /**
     * Update progress display
     */
    updateProgress(completed, total, text) {
        if (this.elements.sidebarProgress) {
            this.elements.sidebarProgress.classList.add('visible');
        }
        if (this.elements.sidebarProgressText) {
            this.elements.sidebarProgressText.textContent = text;
        }
        if (this.elements.sidebarProgressCount) {
            this.elements.sidebarProgressCount.textContent = `${completed}/${total}`;
        }
        if (this.elements.sidebarProgressFill) {
            this.elements.sidebarProgressFill.style.width = `${(completed / total) * 100}%`;
        }
    },

    /**
     * Hide progress
     */
    hideProgress() {
        this.elements.sidebarProgress?.classList.remove('visible');
    },

    /**
     * Show results section
     */
    showResults(result) {
        this.elements.resultsSection?.classList.add('visible');
        this.elements.analysisPanel?.classList.add('visible');
        
        // Update stats
        if (this.elements.statDuration) {
            this.elements.statDuration.textContent = Utils.formatTime(result.duration);
        }
        if (this.elements.statAvgBpm) {
            this.elements.statAvgBpm.textContent = result.bpm;
        }
        if (this.elements.statPoints) {
            this.elements.statPoints.textContent = result.lovenseJson?.totalPoints || '--';
        }
        if (this.elements.statPatterns) {
            this.elements.statPatterns.textContent = result.lovenseJson?.patternCount || 0;
        }
        
        // Draw waveform
        if (this.elements.waveformCanvas) {
            requestAnimationFrame(() => {
                Visualizer.drawConverterWaveform(this.elements.waveformCanvas, result);
            });
        }
        
        // Show JSON
        if (this.elements.jsonOutput && result.lovenseJson) {
            this.elements.jsonOutput.value = JSON.stringify(result.lovenseJson, null, 2);
        }
    },

    /**
     * Hide results section
     */
    hideResults() {
        this.elements.resultsSection?.classList.remove('visible');
        if (this.elements.jsonOutput) {
            this.elements.jsonOutput.value = '';
        }
    },

    /**
     * Update batch actions visibility
     */
    updateBatchActions(completedCount) {
        this.elements.batchActions?.classList.toggle('visible', completedCount > 1);
    },

    /**
     * Show toast notification
     */
    showToast(message, duration = 2500) {
        if (this.elements.toastMessage) {
            this.elements.toastMessage.textContent = message;
        }
        this.elements.toast?.classList.add('visible');
        
        setTimeout(() => {
            this.elements.toast?.classList.remove('visible');
        }, duration);
    },

    /**
     * Show confirmation modal
     */
    showConfirm(message) {
        return new Promise((resolve) => {
            if (this.elements.confirmMessage) {
                this.elements.confirmMessage.textContent = message;
            }
            this.elements.confirmModal?.classList.add('visible');
            
            const handleYes = () => {
                this.elements.confirmModal?.classList.remove('visible');
                cleanup();
                resolve(true);
            };
            
            const handleNo = () => {
                this.elements.confirmModal?.classList.remove('visible');
                cleanup();
                resolve(false);
            };
            
            const cleanup = () => {
                this.elements.confirmYes?.removeEventListener('click', handleYes);
                this.elements.confirmNo?.removeEventListener('click', handleNo);
            };
            
            this.elements.confirmYes?.addEventListener('click', handleYes);
            this.elements.confirmNo?.addEventListener('click', handleNo);
        });
    },

    /**
     * Update connection UI (device bar style)
     */
    updateConnectionUI(isConnected, devices) {
        const dot = this.elements.deviceBarDot;
        const text = this.elements.deviceBarText;
        const ipInput = this.elements.manualIPInput;
        const connectBtn = this.elements.connectBtn;
        const reconnectBtn = this.elements.reconnectBtn;
        const disconnectBtn = this.elements.disconnectBtn;
        const deviceSelect = this.elements.deviceSelect;
        
        if (isConnected && devices.length > 0) {
            // Connected state
            dot?.classList.remove('disconnected', 'connecting');
            dot?.classList.add('connected');
            
            if (text) {
                const device = devices.find(d => d.id === LovenseApi.activeDeviceId) || devices[0];
                text.textContent = `${device.nickname || device.name} connected`;
            }
            
            ipInput?.classList.add('hidden');
            connectBtn?.classList.add('hidden');
            reconnectBtn?.classList.add('hidden');
            disconnectBtn?.classList.remove('hidden');
            deviceSelect?.classList.remove('hidden');
            
            // Populate device select
            if (deviceSelect) {
                deviceSelect.innerHTML = devices.map(d => 
                    `<option value="${d.id}">${d.nickname} (${d.deviceType})</option>`
                ).join('');
            }
        } else {
            // Disconnected state
            dot?.classList.remove('connected', 'connecting');
            dot?.classList.add('disconnected');
            
            if (text) text.textContent = 'No device connected';
            
            ipInput?.classList.remove('hidden');
            connectBtn?.classList.remove('hidden');
            reconnectBtn?.classList.add('hidden');
            disconnectBtn?.classList.add('hidden');
            deviceSelect?.classList.add('hidden');
        }
        
        // Show saved IP in input placeholder
        const savedIP = LovenseApi.getSavedIP();
        if (savedIP && ipInput && !ipInput.value) {
            ipInput.placeholder = `Last: ${savedIP}`;
        }
    },
    
    /**
     * Show reconnect button (when connection lost)
     */
    showReconnectButton() {
        this.elements.connectBtn?.classList.add('hidden');
        this.elements.reconnectBtn?.classList.remove('hidden');
        this.elements.disconnectBtn?.classList.add('hidden');
        this.elements.deviceSelect?.classList.add('hidden');
        
        if (this.elements.deviceBarDot) {
            this.elements.deviceBarDot.classList.remove('connected');
            this.elements.deviceBarDot.classList.add('disconnected');
        }
        if (this.elements.deviceBarText) {
            this.elements.deviceBarText.textContent = 'Connection lost';
        }
    },
    
    /**
     * Show connecting state
     */
    showConnectingState() {
        if (this.elements.deviceBarDot) {
            this.elements.deviceBarDot.classList.remove('connected', 'disconnected');
            this.elements.deviceBarDot.classList.add('connecting');
        }
        if (this.elements.deviceBarText) {
            this.elements.deviceBarText.textContent = 'Connecting...';
        }
    },

    /**
     * Update player UI
     */
    updatePlayerUI(currentTime, duration, isPlaying, volume) {
        if (this.elements.playerProgress) {
            this.elements.playerProgress.max = duration;
            this.elements.playerProgress.value = currentTime;
        }
        if (this.elements.playerCurrentTime) {
            this.elements.playerCurrentTime.textContent = Utils.formatTime(currentTime);
        }
        if (this.elements.playerDuration) {
            this.elements.playerDuration.textContent = Utils.formatTime(duration);
        }
        if (this.elements.volumeSlider) {
            this.elements.volumeSlider.value = volume;
        }
        if (this.elements.volumeValue) {
            this.elements.volumeValue.textContent = `${Math.round(volume * 100)}%`;
        }
        
        // Update play/pause button icon
        this.updatePlayPauseButton(isPlaying);
    },

    /**
     * Update play/pause button
     */
    updatePlayPauseButton(isPlaying) {
        if (this.elements.playPauseBtn) {
            this.elements.playPauseBtn.innerHTML = isPlaying 
                ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        }
    },

    /**
     * Update playback mode button
     */
    updatePlaybackModeButton(mode) {
        if (this.elements.playbackModeBtn) {
            const isLoop = mode === 'loop';
            this.elements.playbackModeBtn.classList.toggle('active', isLoop);
            this.elements.playbackModeBtn.innerHTML = isLoop
                ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg> Loop'
                : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg> Next';
        }
    },

    /**
     * Update queue display in sidebar (uses renderFileCards with play mode)
     */
    updateQueueInSidebar(queue, currentIndex) {
        // In play view, re-render file cards with queue awareness
        // The currentIndex is the index in the queue, but we pass all files
        // renderFileCards will match by file ID to highlight correctly
        this.renderFileCards(FileHandler.files, currentIndex, 'play');
    },

    /**
     * Add network log entry
     */
    addNetworkLog(entry) {
        this.networkLog.unshift(entry);
        if (this.networkLog.length > 20) {
            this.networkLog.pop();
        }
        this.renderNetworkLog();
    },

    /**
     * Render network log
     */
    renderNetworkLog() {
        if (!this.elements.networkLogContainer) return;
        
        this.elements.networkLogContainer.innerHTML = this.networkLog.map(entry => `
            <div class="log-entry">
                <div class="log-entry-header">
                    <div>
                        <span class="log-type ${entry.type.toLowerCase()}">${entry.type}</span>
                        <span class="log-time">${entry.time}</span>
                    </div>
                    <span class="log-destination">${entry.destination}</span>
                </div>
                <div class="log-notes">${entry.notes}</div>
            </div>
        `).join('');
    },

    /**
     * Get current settings from form
     */
    getSettings() {
        return {
            deviceType: this.elements.deviceType?.value || 'generic-vibe',
            minIntensity: parseInt(this.elements.minIntensity?.value) || 0,
            maxIntensity: parseInt(this.elements.maxIntensity?.value) || 20,
            onBeatBoost: parseFloat(this.elements.onBeatBoost?.value) || 1.2,
            breakIntensity: parseFloat(this.elements.breakIntensity?.value) || 0.1,
            intervalMs: 100
        };
    },
    
    /**
     * Open changelog modal
     */
    openChangelog() {
        this.elements.changelogModal?.classList.add('visible');
    },
    
    /**
     * Close changelog modal
     */
    closeChangelog() {
        this.elements.changelogModal?.classList.remove('visible');
    },
    
    /**
     * Open info modal
     */
    openInfo() {
        this.elements.infoModal?.classList.add('visible');
    },
    
    /**
     * Close info modal
     */
    closeInfo() {
        this.elements.infoModal?.classList.remove('visible');
    }
};

// Export for use in other modules
window.UI = UI;
