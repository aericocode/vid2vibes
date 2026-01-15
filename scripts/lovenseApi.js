/**
 * Lovense API Module
 * Handles device discovery, connection, and command sending
 */

const LovenseApi = {
    domain: null,
    devices: [],
    activeDeviceId: null,
    isConnected: false,
    
    // Event callbacks
    onConnectionChange: null,
    onDevicesUpdate: null,
    onNetworkActivity: null,

    /**
     * Log network activity (for privacy monitor)
     */
    log(type, destination, payload, notes) {
        if (this.onNetworkActivity) {
            this.onNetworkActivity({
                timestamp: new Date().toISOString(),
                time: new Date().toLocaleTimeString(),
                type,
                destination,
                payload: JSON.stringify(payload, null, 2),
                notes,
                id: Date.now()
            });
        }
    },

    /**
     * Get saved IP from localStorage
     */
    getSavedIP() {
        return localStorage.getItem('lovense_remote_ip');
    },

    /**
     * Save IP to localStorage
     */
    saveIP(ip) {
        localStorage.setItem('lovense_remote_ip', ip);
    },

    /**
     * Clear saved IP
     */
    clearSavedIP() {
        localStorage.removeItem('lovense_remote_ip');
        this.log('CLIENT', 'Local Browser', { action: 'cleared_saved_ip' }, 'Saved IP cleared from cache');
    },

    /**
     * Discover devices on the network
     */
    async discoverDevices(manualIP = null) {
        let foundDevices = null;
        let workingEndpoint = null;

        // Try saved IP first
        const savedIP = this.getSavedIP();
        if (savedIP) {
            const result = await this.tryIP(savedIP, 'Trying saved IP');
            if (result) {
                foundDevices = result.devices;
                workingEndpoint = result.endpoint;
            }
        }

        // Try manual IP if provided
        if (!foundDevices && manualIP) {
            const result = await this.tryIP(manualIP, 'Trying manual IP');
            if (result) {
                foundDevices = result.devices;
                workingEndpoint = result.endpoint;
                this.saveIP(manualIP);
            }
        }

        // Scan network if needed
        if (!foundDevices) {
            this.log('CLIENT', 'Local Browser', { action: 'starting_network_scan' }, 
                'No saved IP worked, scanning local network...');

            const ipsToTry = [];
            
            // Common ranges
            for (let i = 100; i < 130; i++) {
                ipsToTry.push(`10.0.0.${i}`);
            }
            for (let i = 100; i < 130; i++) {
                ipsToTry.push(`192.168.1.${i}`);
            }

            for (const ip of ipsToTry) {
                const result = await this.tryIP(ip, null, 500); // Shorter timeout for scanning
                if (result) {
                    foundDevices = result.devices;
                    workingEndpoint = result.endpoint;
                    this.saveIP(ip);
                    break;
                }
            }
        }

        if (foundDevices && workingEndpoint) {
            const deviceArray = Object.entries(foundDevices).map(([id, device]) => ({
                id,
                name: device.name || 'Unknown Device',
                nickname: device.nickName || device.name || 'Unnamed',
                status: device.status === '1',
                battery: device.battery || 0,
                deviceType: device.name,
            }));

            this.devices = deviceArray;
            this.domain = workingEndpoint;
            this.isConnected = true;
            
            if (deviceArray.length > 0) {
                this.activeDeviceId = deviceArray[0].id;
            }

            this.log('CLIENT', 'Local Browser', {
                action: 'devices_connected',
                endpoint: workingEndpoint,
                device_count: deviceArray.length
            }, `Connected! Using: ${workingEndpoint}`);

            if (this.onConnectionChange) {
                this.onConnectionChange(true, deviceArray);
            }

            return { success: true, devices: deviceArray };
        }

        return { success: false, error: 'Could not find devices' };
    },

    /**
     * Try to connect to a specific IP
     */
    async tryIP(ip, logNote = null, timeout = 2000) {
        const testUrl = `http://${ip}:20010`;
        
        if (logNote) {
            this.log('REQUEST', testUrl, { command: 'GetToys' }, `${logNote}: ${ip}`);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(`${testUrl}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'GetToys' }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await response.json();

            if (data.code === 200 && data.data?.toys) {
                const devices = JSON.parse(data.data.toys);
                
                this.log('RESPONSE', testUrl, { 
                    code: data.code, 
                    devices_found: Object.keys(devices).length 
                }, `SUCCESS! Found ${Object.keys(devices).length} device(s)`);

                return { devices, endpoint: testUrl };
            }
        } catch (err) {
            if (logNote) {
                this.log('ERROR', ip, { error: 'Connection failed' }, `${ip} not responding`);
            }
        }

        return null;
    },

    /**
     * Send pattern to device
     */
    async sendPattern(deviceId, pattern, duration, rawCommand = null) {
        if (!this.domain) return false;

        const activeDevice = this.devices.find(d => d.id === deviceId);
        
        let payload;
        
        if (rawCommand) {
            // Use raw command from official format
            payload = { ...rawCommand, toy: deviceId };
            delete payload._meta;
        } else {
            // Build command from simple pattern
            const isGush = activeDevice?.deviceType?.toLowerCase() === 'gush';
            let action = pattern.includes(';') ? pattern.replace(/;/g, ',') : pattern;
            
            if (isGush) {
                action = action.replace(/Vibrate/g, 'Oscillate').replace(/Thrusting/g, 'Oscillate');
            }
            
            payload = {
                command: 'Function',
                action: action,
                timeSec: duration,
                toy: deviceId,
                apiVer: 1
            };
        }

        this.log('REQUEST', this.domain, payload, `Sending ${payload.command} command`);

        try {
            const response = await fetch(`${this.domain}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            this.log('RESPONSE', this.domain, { 
                code: data.code, 
                success: data.code === 200 
            }, data.code === 200 ? 'Command sent successfully' : `Failed: ${data.code}`);
            
            return data.code === 200;
        } catch (err) {
            this.log('ERROR', this.domain, { error: err.message }, 'Command failed');
            return false;
        }
    },

    /**
     * Stop device
     */
    async stopDevice(deviceId) {
        if (!this.domain) return;

        const payload = {
            command: 'Function',
            action: 'Stop',
            timeSec: 0,
            toy: deviceId,
            apiVer: 1
        };

        this.log('REQUEST', this.domain, payload, 'Stopping device');

        try {
            await fetch(`${this.domain}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error('Stop failed:', err);
        }
    },

    /**
     * Disconnect
     */
    disconnect() {
        if (this.activeDeviceId) {
            this.stopDevice(this.activeDeviceId);
        }
        
        this.domain = null;
        this.devices = [];
        this.activeDeviceId = null;
        this.isConnected = false;
        
        if (this.onConnectionChange) {
            this.onConnectionChange(false, []);
        }
    },

    /**
     * Set active device
     */
    setActiveDevice(deviceId) {
        this.activeDeviceId = deviceId;
        if (this.onDevicesUpdate) {
            this.onDevicesUpdate(this.devices, this.activeDeviceId);
        }
    },

    /**
     * Get active device info
     */
    getActiveDevice() {
        return this.devices.find(d => d.id === this.activeDeviceId);
    }
};

// Export for use in other modules
window.LovenseApi = LovenseApi;
