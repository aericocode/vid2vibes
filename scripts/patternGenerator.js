/**
 * Pattern Generator Module
 * Generates Lovense-compatible pattern JSON from audio analysis
 */

const PatternGenerator = {
    /**
     * Device feature mappings
     */
    deviceFeatures: {
        'generic-vibe': 'v',
        'max2': 'v,p',
        'nora': 'v,r',
        'gush2': 'o',
        'solace': 't'
    },

    /**
     * Built-in pattern library for simple patterns
     */
    patternLibrary: {
        wave: 'v:1;v:5;v:10;v:15;v:20;v:15;v:10;v:5',
        pulse: 'v:20;v:0;v:20;v:0;v:20;v:0',
        escalate: 'v:5;v:10;v:15;v:20;v:20;v:20',
        earthquake: 'v:3;v:20;v:8;v:18;v:5;v:15',
        heartbeat: 'v:12;v:16;v:4;v:12;v:16;v:4',
        fireworks: 'v:2;v:6;v:20;v:10;v:4;v:1',
        gentle: 'v:3;v:5;v:7;v:5;v:3;v:1',
        intense: 'v:15;v:18;v:20;v:20;v:18;v:15',
        teasing: 'v:8;v:12;v:8;v:4;v:8;v:12;v:8;v:4',
        steady: 'v:10;v:10;v:10;v:10;v:10;v:10'
    },

    /**
     * Generate Lovense patterns from audio analysis result
     */
    generate(analysisResult, settings) {
        const { duration, bpm, beatInterval, volumeData } = analysisResult;
        const intervalMs = 100; // Always 100ms for finest resolution
        const intervalSec = 0.1;
        
        const {
            deviceType = 'generic-vibe',
            minIntensity = 0,
            maxIntensity = 20,
            onBeatBoost = 1.2,
            breakIntensity = 0.1
        } = settings;
        
        // Get feature string for device
        const featureStr = this.deviceFeatures[deviceType] || 'v';
        
        // Calculate steps per beat
        const stepsPerBeat = Math.round(beatInterval / intervalSec);
        const onSteps = Math.max(1, Math.round(stepsPerBeat * 0.75));
        const offSteps = Math.max(1, stepsPerBeat - onSteps);
        
        // Build beat grid
        const beats = [];
        for (let t = 0; t < duration; t += beatInterval) {
            beats.push(t);
        }
        
        // Generate all strength values at 100ms intervals
        const allStrengths = [];
        const totalSteps = Math.ceil(duration / intervalSec);
        
        for (let step = 0; step < totalSteps; step++) {
            const t = step * intervalSec;
            
            // Find which beat we're in
            let beatIndex = 0;
            for (let b = 0; b < beats.length; b++) {
                if (t >= beats[b]) beatIndex = b;
                else break;
            }
            
            const beatStartTime = beats[beatIndex];
            const timeIntoBeat = t - beatStartTime;
            const stepIntoBeat = Math.round(timeIntoBeat / intervalSec);
            
            // Determine if we're in "on" zone or "off" zone
            const isOnBeat = stepIntoBeat < onSteps;
            
            // Get volume at this time for intensity scaling
            const volIdx = volumeData.findIndex(v => v.time >= t);
            const vol = volIdx >= 0 ? volumeData[Math.max(0, volIdx - 1)]?.normalized || 0.5 : 0.5;
            
            let intensity;
            if (isOnBeat) {
                const boostedVol = Math.min(1.0, vol * onBeatBoost);
                intensity = boostedVol;
            } else {
                intensity = breakIntensity;
            }
            
            // Map to Lovense range (0-20)
            const range = maxIntensity - minIntensity;
            const mappedIntensity = Math.round(minIntensity + intensity * range);
            allStrengths.push(Utils.clamp(mappedIntensity, minIntensity, maxIntensity));
        }
        
        // Split into patterns of max 50 values each (5 seconds at 100ms)
        // Smart resume will calculate remaining commands from current playhead position
        const patterns = [];
        let idx = 0;
        
        while (idx < allStrengths.length) {
            const remaining = allStrengths.length - idx;
            const chunkSize = Math.min(50, remaining);
            const chunk = allStrengths.slice(idx, idx + chunkSize);
            
            const patternStartTime = idx * intervalSec;
            const patternDuration = Math.round(chunk.length * intervalSec * 1000) / 1000;
            
            patterns.push({
                command: "Pattern",
                rule: `V:1;F:${featureStr};S:${intervalMs}#`,
                strength: chunk.join(';'),
                timeSec: patternDuration,
                apiVer: 1,
                _meta: {
                    startTime: Math.round(patternStartTime * 100) / 100,
                    endTime: Math.round((patternStartTime + patternDuration) * 100) / 100,
                    points: chunk.length,
                    intervalMs: intervalMs
                }
            });
            
            idx += chunkSize;
        }
        
        return {
            device: deviceType,
            format: "official",
            totalDuration: duration,
            bpm: bpm,
            beatInterval: Math.round(beatInterval * 1000) / 1000,
            intervalMs: intervalMs,
            stepsPerBeat: stepsPerBeat,
            beatTiming: `${onSteps} on / ${offSteps} off per beat`,
            patternCount: patterns.length,
            totalPoints: allStrengths.length,
            settings: {
                minIntensity,
                maxIntensity,
                onBeatBoost,
                breakIntensity
            },
            patterns
        };
    },

    /**
     * Create a sliced pattern for resuming mid-chunk
     * Takes a pattern and a time offset, returns a new pattern with only remaining commands
     */
    createResumePattern(pattern, currentTime) {
        if (!pattern._meta) return pattern;
        
        const { startTime, intervalMs, points } = pattern._meta;
        const intervalSec = intervalMs / 1000;
        
        // Calculate how far into this pattern we are
        const timeIntoPattern = currentTime - startTime;
        if (timeIntoPattern <= 0) return pattern; // Haven't reached this pattern yet
        
        // Calculate which command index we should start from
        const skipCommands = Math.floor(timeIntoPattern / intervalSec);
        if (skipCommands >= points) return null; // Pattern already finished
        
        // Split the strength values and take remaining
        const strengths = pattern.strength.split(';');
        const remainingStrengths = strengths.slice(skipCommands);
        
        if (remainingStrengths.length === 0) return null;
        
        // Calculate new duration
        const newDuration = Math.round(remainingStrengths.length * intervalSec * 1000) / 1000;
        
        return {
            ...pattern,
            strength: remainingStrengths.join(';'),
            timeSec: newDuration,
            _meta: {
                ...pattern._meta,
                startTime: currentTime,
                points: remainingStrengths.length,
                isResumeSlice: true
            }
        };
    },

    /**
     * Get pattern for device from library
     */
    getLibraryPattern(patternName, deviceType) {
        const pattern = this.patternLibrary[patternName];
        if (!pattern) return null;
        
        // Convert to oscillation for Gush
        if (deviceType && deviceType.toLowerCase().includes('gush')) {
            return pattern.replace(/v:/g, 'o:');
        }
        
        return pattern;
    },

    /**
     * Convert official format patterns to playable format
     */
    convertOfficialFormat(officialData) {
        const patterns = [];
        
        for (const pattern of officialData.patterns) {
            const startTime = pattern._meta?.startTime || 0;
            const duration = pattern.timeSec || 1;
            const endTime = pattern._meta?.endTime || (startTime + duration);
            
            // Handle Function commands (Gush2 style)
            if (pattern.command === 'Function') {
                const actionMatch = pattern.action?.match(/(\w+):(\d+)/);
                const strength = actionMatch ? parseInt(actionMatch[2]) : 10;
                
                patterns.push({
                    time: startTime,
                    pattern: pattern.action,
                    duration: duration,
                    rawCommand: pattern,
                    commandType: 'Function',
                    avgStrength: strength
                });
                continue;
            }
            
            // Handle Pattern commands
            const strengths = pattern.strength.split(';').map(s => parseInt(s.trim()));
            const avgStrength = Math.round(
                strengths.reduce((a, b) => a + b, 0) / strengths.length
            );
            
            // Parse features for display
            let displayFunctions = [];
            const featureMatch = pattern.rule?.match(/F:([^;#]+)/i);
            if (featureMatch) {
                const features = featureMatch[1].split(',');
                features.forEach(f => {
                    switch (f.trim().toLowerCase()) {
                        case 'v': displayFunctions.push('Vibrate'); break;
                        case 'r': displayFunctions.push('Rotate'); break;
                        case 'p': displayFunctions.push('Pump'); break;
                        case 'o': displayFunctions.push('Oscillate'); break;
                        case 't': displayFunctions.push('Thrust'); break;
                    }
                });
            }
            
            if (displayFunctions.length === 0) displayFunctions.push('Vibrate');
            
            const actionString = displayFunctions.map(fn => `${fn}:${avgStrength}`).join(';');
            
            patterns.push({
                time: startTime,
                pattern: actionString,
                duration: duration,
                rawCommand: { ...pattern, _meta: { ...pattern._meta, endTime } },
                commandType: 'Pattern',
                pointCount: strengths.length,
                avgStrength: avgStrength
            });
        }
        
        return patterns;
    }
};

// Export for use in other modules
window.PatternGenerator = PatternGenerator;
