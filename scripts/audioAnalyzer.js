/**
 * Audio Analysis Module
 * Handles audio decoding, beat detection, and BPM estimation
 */

const AudioAnalyzer = {
    workerUrl: null,

    /**
     * Initialize the Web Worker
     */
    init() {
        const workerCode = `
            self.onmessage = function(e) {
                const { channelData, sampleRate, settings, fileIndex } = e.data;
                
                try {
                    const duration = channelData.length / sampleRate;
                    const intervalSec = settings.intervalMs / 1000;
                    
                    // Step 1: Calculate volume at fine intervals (every 10ms)
                    const analysisStep = 0.01; // 10ms
                    const windowSize = Math.floor(sampleRate * 0.02); // 20ms window for RMS
                    const volumeData = [];
                    
                    for (let t = 0; t < duration; t += analysisStep) {
                        const startSample = Math.floor(t * sampleRate);
                        const endSample = Math.min(startSample + windowSize, channelData.length);
                        
                        let sum = 0;
                        for (let i = startSample; i < endSample; i++) {
                            sum += channelData[i] ** 2;
                        }
                        const rms = Math.sqrt(sum / (endSample - startSample));
                        volumeData.push({ time: t, volume: rms });
                    }
                    
                    // Normalize volume to 0-1
                    const maxVolume = Math.max(...volumeData.map(v => v.volume));
                    if (maxVolume > 0) {
                        volumeData.forEach(v => { v.normalized = v.volume / maxVolume; });
                    } else {
                        volumeData.forEach(v => { v.normalized = 0; });
                    }
                    
                    // Step 2: Detect beats using onset detection
                    const onsets = detectOnsets(channelData, sampleRate);
                    
                    // Step 3: Estimate BPM from onset intervals
                    const { bpm, beatInterval } = estimateBPM(onsets, duration);
                    
                    // Step 4: Generate beat grid based on detected tempo
                    const beatGrid = generateBeatGrid(onsets, beatInterval, duration);
                    
                    // Step 5: Generate pattern data at the requested interval
                    const patternData = [];
                    for (let t = 0; t < duration; t += intervalSec) {
                        const volIdx = Math.floor(t / analysisStep);
                        const vol = volIdx < volumeData.length ? volumeData[volIdx].normalized : 0;
                        
                        let minBeatDist = Infinity;
                        for (const beat of beatGrid) {
                            const dist = Math.abs(t - beat);
                            if (dist < minBeatDist) minBeatDist = dist;
                        }
                        
                        const beatProximity = Math.max(0, 1 - (minBeatDist / (beatInterval * 0.5)));
                        
                        patternData.push({
                            time: t,
                            volume: vol,
                            beatProximity: beatProximity,
                            nearBeat: minBeatDist < (beatInterval * 0.15)
                        });
                    }
                    
                    self.postMessage({
                        fileIndex,
                        success: true,
                        result: {
                            duration,
                            sampleRate,
                            bpm,
                            beatInterval,
                            beatCount: beatGrid.length,
                            patternData,
                            volumeData
                        }
                    });
                    
                } catch (err) {
                    self.postMessage({ fileIndex, success: false, error: err.message });
                }
            };
            
            function detectOnsets(channelData, sampleRate) {
                const onsets = [];
                const frameSize = Math.floor(sampleRate * 0.01);
                const hopSize = Math.floor(frameSize / 2);
                
                let prevEnergy = 0;
                const energyHistory = [];
                const historySize = 10;
                
                for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
                    let energy = 0;
                    for (let j = 0; j < frameSize; j++) {
                        energy += channelData[i + j] ** 2;
                    }
                    energy = Math.sqrt(energy / frameSize);
                    
                    energyHistory.push(energy);
                    if (energyHistory.length > historySize) energyHistory.shift();
                    
                    const avgEnergy = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;
                    
                    if (energy > avgEnergy * 1.5 && energy > prevEnergy * 1.3) {
                        const time = i / sampleRate;
                        if (onsets.length === 0 || time - onsets[onsets.length - 1] > 0.05) {
                            onsets.push(time);
                        }
                    }
                    
                    prevEnergy = energy;
                }
                
                return onsets;
            }
            
            function estimateBPM(onsets, duration) {
                if (onsets.length < 4) {
                    return { bpm: 120, beatInterval: 0.5 };
                }
                
                const intervals = [];
                for (let i = 1; i < onsets.length; i++) {
                    intervals.push(onsets[i] - onsets[i - 1]);
                }
                
                const binSize = 0.02;
                const histogram = {};
                
                intervals.forEach(interval => {
                    if (interval >= 0.25 && interval <= 1.0) {
                        const bin = Math.round(interval / binSize) * binSize;
                        histogram[bin] = (histogram[bin] || 0) + 1;
                    }
                });
                
                let maxCount = 0;
                let bestInterval = 0.5;
                
                for (const [interval, count] of Object.entries(histogram)) {
                    if (count > maxCount) {
                        maxCount = count;
                        bestInterval = parseFloat(interval);
                    }
                }
                
                let bpm = 60 / bestInterval;
                
                while (bpm < 80 && bpm > 0) bpm *= 2;
                while (bpm > 180) bpm /= 2;
                
                const beatInterval = 60 / bpm;
                
                return { bpm: Math.round(bpm), beatInterval };
            }
            
            function generateBeatGrid(onsets, beatInterval, duration) {
                if (onsets.length === 0) {
                    const beats = [];
                    for (let t = 0; t < duration; t += beatInterval) {
                        beats.push(t);
                    }
                    return beats;
                }
                
                const beats = [];
                const firstOnset = onsets[0];
                
                for (let t = firstOnset; t >= 0; t -= beatInterval) {
                    beats.unshift(t);
                }
                
                for (let t = firstOnset + beatInterval; t < duration; t += beatInterval) {
                    beats.push(t);
                }
                
                const snapThreshold = beatInterval * 0.15;
                const snappedBeats = beats.map(beat => {
                    let closest = beat;
                    let minDist = Infinity;
                    
                    for (const onset of onsets) {
                        const dist = Math.abs(onset - beat);
                        if (dist < minDist && dist < snapThreshold) {
                            minDist = dist;
                            closest = onset;
                        }
                    }
                    
                    return closest;
                });
                
                return snappedBeats;
            }
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.workerUrl = URL.createObjectURL(blob);
    },

    /**
     * Extract audio from video file
     */
    async extractAudio(videoFile) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await Utils.readFileAsArrayBuffer(videoFile);
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioContext.close();
        return audioBuffer;
    },

    /**
     * Analyze audio buffer in Web Worker
     */
    analyze(audioBuffer, settings, fileIndex) {
        return new Promise((resolve, reject) => {
            if (!this.workerUrl) {
                this.init();
            }
            
            const worker = new Worker(this.workerUrl);
            const channelData = audioBuffer.getChannelData(0);
            const channelDataCopy = new Float32Array(channelData);
            
            worker.onmessage = (e) => {
                worker.terminate();
                if (e.data.success) {
                    resolve(e.data.result);
                } else {
                    reject(new Error(e.data.error));
                }
            };
            
            worker.onerror = (err) => {
                worker.terminate();
                reject(err);
            };
            
            worker.postMessage({
                channelData: channelDataCopy,
                sampleRate: audioBuffer.sampleRate,
                settings: { intervalMs: settings.intervalMs || 100 },
                fileIndex
            }, [channelDataCopy.buffer]);
        });
    },

    /**
     * Clean up resources
     */
    destroy() {
        if (this.workerUrl) {
            URL.revokeObjectURL(this.workerUrl);
            this.workerUrl = null;
        }
    }
};

// Export for use in other modules
window.AudioAnalyzer = AudioAnalyzer;
