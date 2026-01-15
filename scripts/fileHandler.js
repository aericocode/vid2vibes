/**
 * File Handler Module
 * Manages file uploads, drag/drop, and batch processing queue
 */

const FileHandler = {
    files: [],
    activeFileIndex: 0,
    isProcessing: false,
    
    // Event callbacks
    onFilesChange: null,
    onActiveFileChange: null,
    onProcessingProgress: null,
    onProcessingComplete: null,

    /**
     * Initialize drag/drop for an element
     */
    initDropZone(element, options = {}) {
        const { acceptVideo = true, acceptJson = false, onDrop } = options;
        
        element.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            
            const accepts = [];
            if (acceptVideo) accepts.push('video/*');
            if (acceptJson) accepts.push('.json');
            if (acceptJson) accepts.push('.funscript');
            input.accept = accepts.join(',');
            
            input.onchange = (e) => {
                if (e.target.files.length) {
                    this.handleFiles(Array.from(e.target.files), onDrop);
                }
            };
            input.click();
        });

        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add('dragover');
        });

        element.addEventListener('dragleave', () => {
            element.classList.remove('dragover');
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                this.handleFiles(Array.from(e.dataTransfer.files), onDrop);
            }
        });
    },

    /**
     * Handle incoming files
     */
    handleFiles(newFiles, callback) {
        const videoFiles = newFiles.filter(f => f.type.startsWith('video/') || f.name.match(/\.(mp4|webm|mov|mkv)$/i));
        const jsonFiles = newFiles.filter(f => f.type === 'application/json' || f.name.endsWith('.json') || f.name.endsWith('.funscript'));
        
        if (videoFiles.length === 0) {
            UI.showToast('Please select video files');
            return;
        }

        // Match JSON files to videos by similar name
        const matchJsonToVideo = (videoName) => {
            const baseName = videoName.replace(/\.[^/.]+$/, '');
            return jsonFiles.find(j => {
                const jsonBase = j.name.replace(/\.[^/.]+$/, '');
                return jsonBase === baseName || 
                       jsonBase === baseName + '_lovense' ||
                       jsonBase.startsWith(baseName);
            });
        };

        videoFiles.forEach(videoFile => {
            // Check for duplicates
            if (this.files.some(f => f.file.name === videoFile.name && f.file.size === videoFile.size)) {
                return;
            }
            
            const matchedJson = matchJsonToVideo(videoFile.name);
            
            this.files.push({
                id: Utils.generateId(),
                file: videoFile,
                jsonFile: matchedJson || null,
                audioBuffer: null,
                analysisResult: null,
                lovenseJson: null,
                script: null,
                status: 'pending', // pending, processing, complete, error, playing
                error: null,
                videoUrl: null
            });
        });
        
        if (this.onFilesChange) {
            this.onFilesChange(this.files);
        }
        
        if (callback) {
            callback(this.files);
        }
        
        // Set active file if none
        if (this.files.length > 0 && this.activeFileIndex >= this.files.length) {
            this.setActiveFile(0);
        }
    },

    /**
     * Add JSON file to existing video
     */
    attachJsonToFile(fileId, jsonFile) {
        const file = this.files.find(f => f.id === fileId);
        if (file) {
            file.jsonFile = jsonFile;
            if (this.onFilesChange) {
                this.onFilesChange(this.files);
            }
        }
    },

    /**
     * Set active file
     */
    setActiveFile(index) {
        if (index < 0 || index >= this.files.length) return;
        this.activeFileIndex = index;
        
        if (this.onActiveFileChange) {
            this.onActiveFileChange(this.files[index], index);
        }
    },

    /**
     * Get active file
     */
    getActiveFile() {
        return this.files[this.activeFileIndex] || null;
    },

    /**
     * Remove file
     */
    removeFile(index) {
        const file = this.files[index];
        if (file?.videoUrl) {
            URL.revokeObjectURL(file.videoUrl);
        }
        
        this.files.splice(index, 1);
        
        if (this.files.length === 0) {
            this.activeFileIndex = 0;
        } else if (this.activeFileIndex >= this.files.length) {
            this.activeFileIndex = this.files.length - 1;
        }
        
        if (this.onFilesChange) {
            this.onFilesChange(this.files);
        }
        
        if (this.onActiveFileChange && this.files.length > 0) {
            this.onActiveFileChange(this.files[this.activeFileIndex], this.activeFileIndex);
        }
    },

    /**
     * Clear all files
     */
    clearAll() {
        this.files.forEach(f => {
            if (f.videoUrl) URL.revokeObjectURL(f.videoUrl);
        });
        
        this.files = [];
        this.activeFileIndex = 0;
        this.isProcessing = false;
        
        if (this.onFilesChange) {
            this.onFilesChange(this.files);
        }
    },

    /**
     * Process pending files (convert to patterns)
     */
    async processPendingFiles(settings) {
        if (this.isProcessing) return;
        
        const pendingIndices = this.files
            .map((f, i) => (f.status === 'pending' || f.status === 'error') ? i : -1)
            .filter(i => i >= 0);
        
        if (pendingIndices.length === 0) return;
        
        this.isProcessing = true;
        const total = pendingIndices.length;
        let completed = 0;
        
        if (this.onProcessingProgress) {
            this.onProcessingProgress(0, total, 'Preparing...');
        }
        
        AudioAnalyzer.init();
        
        for (const fileIndex of pendingIndices) {
            const fileData = this.files[fileIndex];
            fileData.status = 'processing';
            
            if (this.onFilesChange) {
                this.onFilesChange(this.files);
            }
            
            try {
                if (this.onProcessingProgress) {
                    this.onProcessingProgress(completed, total, `Decoding ${fileData.file.name}...`);
                }
                
                // Extract and decode audio
                const audioBuffer = await AudioAnalyzer.extractAudio(fileData.file);
                fileData.audioBuffer = audioBuffer;
                
                if (this.onProcessingProgress) {
                    this.onProcessingProgress(completed, total, `Analyzing ${fileData.file.name}...`);
                }
                
                // Analyze audio
                const analysisResult = await AudioAnalyzer.analyze(audioBuffer, settings, fileIndex);
                fileData.analysisResult = analysisResult;
                
                // Generate patterns
                fileData.lovenseJson = PatternGenerator.generate(analysisResult, settings);
                
                // Create script for playback
                fileData.script = {
                    type: 'scripted',
                    loaded: true,
                    patterns: PatternGenerator.convertOfficialFormat(fileData.lovenseJson),
                    originalFormat: 'official',
                    deviceType: settings.deviceType || 'generic'
                };
                
                fileData.status = 'complete';
                completed++;
                
                if (this.onProcessingProgress) {
                    this.onProcessingProgress(completed, total, `Completed ${fileData.file.name}`);
                }
                
            } catch (err) {
                console.error(`Error processing ${fileData.file.name}:`, err);
                fileData.status = 'error';
                fileData.error = err.message;
                completed++;
            }
            
            if (this.onFilesChange) {
                this.onFilesChange(this.files);
            }
        }
        
        this.isProcessing = false;
        
        if (this.onProcessingComplete) {
            const errorCount = this.files.filter(f => f.status === 'error').length;
            this.onProcessingComplete(total, errorCount);
        }
    },

    /**
     * Regenerate patterns for a file with new settings
     */
    regeneratePatterns(fileIndex, settings) {
        const fileData = this.files[fileIndex];
        if (!fileData || !fileData.analysisResult) return false;
        
        fileData.lovenseJson = PatternGenerator.generate(fileData.analysisResult, settings);
        fileData.script = {
            type: 'scripted',
            loaded: true,
            patterns: PatternGenerator.convertOfficialFormat(fileData.lovenseJson),
            originalFormat: 'official',
            deviceType: settings.deviceType || 'generic'
        };
        
        if (this.onFilesChange) {
            this.onFilesChange(this.files);
        }
        
        return true;
    },

    /**
     * Load script from JSON file
     */
    async loadScriptFromJson(fileData) {
        if (!fileData.jsonFile) return null;
        
        try {
            const content = await Utils.readFileAsText(fileData.jsonFile);
            const scriptData = JSON.parse(content);
            
            // Detect format
            const isOfficialFormat = scriptData.device && scriptData.format === 'official';
            
            let patterns;
            if (isOfficialFormat) {
                patterns = PatternGenerator.convertOfficialFormat(scriptData);
            } else {
                // Simple format
                patterns = scriptData.patterns.map(p => ({
                    time: p.time,
                    patternName: PatternGenerator.patternLibrary[p.pattern] ? p.pattern : null,
                    pattern: PatternGenerator.patternLibrary[p.pattern] ? null : p.pattern,
                    duration: p.duration
                }));
            }
            
            fileData.script = {
                type: 'scripted',
                loaded: true,
                patterns: patterns,
                originalFormat: isOfficialFormat ? 'official' : 'simple',
                deviceType: scriptData.device || 'generic'
            };
            fileData.lovenseJson = isOfficialFormat ? scriptData : null;
            
            return fileData.script;
        } catch (err) {
            console.error('Failed to parse script:', err);
            return null;
        }
    },

    /**
     * Create video URL for playback
     */
    createVideoUrl(fileData) {
        if (!fileData.videoUrl) {
            fileData.videoUrl = URL.createObjectURL(fileData.file);
        }
        return fileData.videoUrl;
    },

    /**
     * Get files ready for playback (complete status with scripts)
     */
    getPlayableFiles() {
        return this.files.filter(f => f.status === 'complete' && f.script);
    },

    /**
     * Get completed files count
     */
    getCompletedCount() {
        return this.files.filter(f => f.status === 'complete').length;
    },

    /**
     * Navigate to next/previous file
     */
    navigateFile(direction) {
        const newIndex = this.activeFileIndex + direction;
        if (newIndex >= 0 && newIndex < this.files.length) {
            this.setActiveFile(newIndex);
            return true;
        }
        return false;
    }
};

// Export for use in other modules
window.FileHandler = FileHandler;
