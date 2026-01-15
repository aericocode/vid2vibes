/**
 * Visualizer Module
 * Handles canvas-based waveform and pattern visualization
 */

const Visualizer = {
    /**
     * Action type color gradients for pattern visualization (low to high intensity)
     */
    actionColorGradients: {
        'v': { low: '#4c1d95', mid: '#a855f7', high: '#f0abfc' }, // Vibrate - purple
        'o': { low: '#7c2d12', mid: '#f97316', high: '#fed7aa' }, // Oscillate - orange  
        'p': { low: '#1e3a8a', mid: '#3b82f6', high: '#93c5fd' }, // Pump - blue
        'r': { low: '#831843', mid: '#ec4899', high: '#f9a8d4' }, // Rotate - pink
        't': { low: '#064e3b', mid: '#10b981', high: '#6ee7b7' }, // Thrust - green
        'default': { low: '#374151', mid: '#6b7280', high: '#d1d5db' }
    },
    
    /**
     * Get color for intensity level (0-1)
     */
    getIntensityColor(actionType, intensity) {
        const gradient = this.actionColorGradients[actionType] || this.actionColorGradients.default;
        
        // Interpolate between low, mid, high based on intensity
        if (intensity < 0.5) {
            return this.lerpColor(gradient.low, gradient.mid, intensity * 2);
        } else {
            return this.lerpColor(gradient.mid, gradient.high, (intensity - 0.5) * 2);
        }
    },
    
    /**
     * Linear interpolation between two hex colors
     */
    lerpColor(color1, color2, t) {
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);
        
        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);
        
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        
        return `rgb(${r}, ${g}, ${b})`;
    },

    /**
     * Draw waveform for converter results
     */
    drawConverterWaveform(canvas, result) {
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        ctx.scale(dpr, dpr);

        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        const duration = result.duration;
        const xScale = width / duration;
        const beatInterval = result.beatInterval;
        
        // 3/4 on, 1/4 off per beat
        const onDuration = beatInterval * 0.75;

        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);

        // Draw beat zones
        for (let beatTime = 0; beatTime < duration; beatTime += beatInterval) {
            const offStart = beatTime + onDuration;
            
            // On zone (green tint)
            const onStartX = beatTime * xScale;
            const onEndX = Math.min(offStart, duration) * xScale;
            ctx.fillStyle = 'rgba(107, 255, 184, 0.08)';
            ctx.fillRect(onStartX, 0, onEndX - onStartX, height);
            
            // Off zone (pink tint)
            if (offStart < duration) {
                const offStartX = offStart * xScale;
                const offEndX = Math.min(beatTime + beatInterval, duration) * xScale;
                ctx.fillStyle = 'rgba(255, 107, 157, 0.15)';
                ctx.fillRect(offStartX, 0, offEndX - offStartX, height);
            }
        }

        // Draw volume waveform
        const volumeData = result.volumeData;
        
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#ff6b9d');
        gradient.addColorStop(0.5, '#9d6bff');
        gradient.addColorStop(1, '#6bffb8');

        ctx.beginPath();
        ctx.moveTo(0, height);

        volumeData.forEach((v) => {
            const x = v.time * xScale;
            const y = height - v.normalized * height * 0.85;
            ctx.lineTo(x, y);
        });

        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Draw beat markers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        
        for (let t = 0; t < duration; t += beatInterval) {
            const x = t * xScale;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
    },

    /**
     * Draw pattern visualization for player with intensity gradients
     */
    drawPatternVisualization(canvas, script, currentTime, duration) {
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        const width = rect.width;
        const height = rect.height;
        
        const { points, totalDuration } = this.parsePatternData(script, duration);
        const xScale = totalDuration > 0 ? width / totalDuration : 1;
        
        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid lines (every 10 seconds)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let t = 0; t < totalDuration; t += 10) {
            const x = t * xScale;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Draw intensity lines (every 5 levels)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i <= 20; i += 5) {
            const y = height - (i / 20) * height * 0.9 - height * 0.05;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        if (points.length === 0) {
            // No pattern loaded
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '14px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText('No pattern loaded', width / 2, height / 2);
            return;
        }
        
        // Draw bars for each point with intensity-based coloring
        const barWidth = Math.max(1, (width / points.length) - 0.5);
        
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const x = point.time * xScale;
            const barHeight = point.intensity * height * 0.9;
            const y = height - barHeight - height * 0.05;
            
            // Get color based on intensity
            const color = this.getIntensityColor(point.actionType, point.intensity);
            
            // Create vertical gradient for this bar (darker at bottom, color at top)
            const gradient = ctx.createLinearGradient(x, height, x, y);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
            gradient.addColorStop(0.3, this.getIntensityColor(point.actionType, point.intensity * 0.5));
            gradient.addColorStop(1, color);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);
        }
        
        // Draw playhead
        if (currentTime !== undefined && totalDuration > 0) {
            const playheadX = (currentTime / totalDuration) * width;
            
            // Playhead glow
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(playheadX, 0);
            ctx.lineTo(playheadX, height);
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Playhead triangle at top
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(playheadX - 6, 0);
            ctx.lineTo(playheadX + 6, 0);
            ctx.lineTo(playheadX, 8);
            ctx.closePath();
            ctx.fill();
        }
    },

    /**
     * Parse pattern data for visualization
     */
    parsePatternData(script, duration) {
        if (!script?.patterns?.length) {
            return { points: [], totalDuration: duration || 0 };
        }
        
        const points = [];
        let runningTime = 0;
        
        for (const pattern of script.patterns) {
            const startTime = pattern.time !== undefined ? pattern.time : 
                             (pattern.rawCommand?._meta?.startTime !== undefined ? pattern.rawCommand._meta.startTime : runningTime);
            const patternDur = pattern.duration || pattern.rawCommand?.timeSec || pattern.timeSec || 1;
            
            // Determine action type
            let actionType = 'v';
            if (pattern.rawCommand?.rule) {
                const featureMatch = pattern.rawCommand.rule.match(/F:([^;#]+)/i);
                if (featureMatch) {
                    const features = featureMatch[1].split(',');
                    actionType = features[0].trim().toLowerCase();
                }
            } else if (pattern.pattern) {
                if (pattern.pattern.includes('Oscillate')) actionType = 'o';
                else if (pattern.pattern.includes('Pump')) actionType = 'p';
                else if (pattern.pattern.includes('Rotate')) actionType = 'r';
                else if (pattern.pattern.includes('Thrust')) actionType = 't';
            }
            
            // Extract strength values
            let strengths = [];
            if (pattern.rawCommand?.strength) {
                strengths = pattern.rawCommand.strength.split(';').map(s => parseInt(s.trim()) || 0);
            } else if (pattern.avgStrength !== undefined) {
                strengths = [pattern.avgStrength];
            } else if (pattern.pattern) {
                const match = pattern.pattern.match(/:(\d+)/);
                if (match) strengths = [parseInt(match[1])];
            }
            
            if (strengths.length === 0) strengths = [10];
            
            // Get interval from rule
            let intervalMs = 100;
            if (pattern.rawCommand?.rule) {
                const sMatch = pattern.rawCommand.rule.match(/S:(\d+)/);
                if (sMatch) intervalMs = parseInt(sMatch[1]);
            }
            const intervalSec = intervalMs / 1000;
            
            // Generate points
            if (strengths.length === 1) {
                points.push({ time: startTime, intensity: strengths[0] / 20, actionType });
                points.push({ time: startTime + patternDur, intensity: strengths[0] / 20, actionType });
            } else {
                strengths.forEach((s, i) => {
                    const t = startTime + (i * intervalSec);
                    if (t <= startTime + patternDur) {
                        points.push({ time: t, intensity: s / 20, actionType });
                    }
                });
            }
            
            runningTime = startTime + patternDur;
        }
        
        points.sort((a, b) => a.time - b.time);
        
        const totalDur = runningTime || duration || (points.length > 0 ? points[points.length - 1].time : 0);
        
        return { points, totalDuration: totalDur };
    }
};

// Export for use in other modules
window.Visualizer = Visualizer;
