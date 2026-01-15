# vid2vibes

**Convert MP4 videos(<2GB) into synchronized Lovense patterns using audio analysis.**

A browser-based tool that extracts audio from videos, detects beats and energy levels, and generates real-time haptic patterns for Lovense devices.

---

## Quick Info

| | |
|---|---|
| **Solution Type** | Standard Solution (Local LAN API) |
| **Category** | Media Sync / Pattern Generator |
| **For** | End users who want to sync Lovense toys to locally saved MP4 content |
| **Status** | ✅ Functional - Active Development |

---

## Features

- 🎵 **Audio Analysis** - Beat detection and volume tracking using Web Audio API
- 🔄 **Pattern Generation** - Converts audio energy into 0-20 intensity patterns
- ▶️ **Video Playback** - Built-in player with synchronized pattern execution
- 📱 **Multi-Device** - Supports all Lovense devices via Connect app(features may be limited per device)
- 🔒 **100% Local** - No uploads, no servers, runs entirely in your browser + commands over LAN
- 📦 **Batch Processing** - Convert multiple videos at once
- 💾 **Export** - Download patterns as Funscript files for future playback

---

## Setup

### Requirements

- Modern browser (Chrome, Firefox, Edge, Safari)
- Lovense device paired with **Lovense Connect** app (iOS/Android/PC)
- Device and browser on the same local network (LAN)
- "Game Mode" enabled in Lovense Connect

### Installation

**Option 1: Use Online** (Recommended)
1. Visit the hosted version at [aericocode.github.io/vid2vibes](https://aericocode.github.io/vid2vibes/)
2. That's it!

**Option 2: Run Locally**
1. Download or clone this repository
2. Open `index.html` in your browser
3. Works offline (LAN connection to device still required)

```bash
git clone https://github.com/[YOUR_USERNAME]/vid2vibes.git
cd vid2vibes
# Open index.html in your browser
```

---

## Usage

### Converting Videos to Patterns

1. **Drop video files** onto the Convert tab
2. **Adjust settings** (optional):
   - Device Type - Match your Lovense device
   - Min/Max Intensity - Limit the intensity range (0-20)
   - Beat Boost - How much to emphasize beats
   - Break Intensity - Intensity between beats
3. **Click "Convert"** - Audio is analyzed and patterns are generated
4. **Download Funscript** - Export patterns for later use

### Playing with Device Sync

1. **Switch to Play tab**
2. **Connect your device**:
   - Open Lovense Connect app
   - Enable Game Mode / Local API
   - Enter IP address if auto-discovery fails
3. **Press Play** - Video and device sync automatically

### Example Workflow

```
1. Drop "music_video.mp4" onto the page
2. Click "Convert All"
3. Switch to "Play" tab
4. Click "Connect" (auto-discovers device)
5. Press Play - device responds to the music!
6. To change video, click the video in the sidebar
```

---

## How It Works

```
Video File
    ↓
[Audio Extraction] → Web Audio API decodes audio track
    ↓
[Beat Detection] → Onset detection + BPM estimation
    ↓
[Pattern Generation] → Maps volume/beats to 0-20 intensity
    ↓
[Chunked Playback] → Sends patterns via Local LAN API
    ↓
Lovense Device
```

**Pattern Format:** Uses the official Lovense Pattern command with 100ms intervals, chunked into 50-value segments (5 seconds each).

---

## Privacy & Security

- ✅ **No uploads** - Videos never leave your device
- ✅ **No external servers** - All processing happens in-browser
- ✅ **No tracking** - Zero analytics or telemetry
- ✅ **LAN only** - Device communication stays on your local network
- ✅ **Works offline** - Load the page once, disconnect from internet

The only network traffic is between your browser and Lovense Connect on your LAN (e.g., `http://192.168.x.x:20010`). Verify this yourself using the built-in Privacy Monitor.

---

## Supported Devices

Works with any device supported by Lovense Connect's Local API(supported features vary):

- Lush (1/2/3)
- Hush (1/2)
- Max (1/2)
- Nora
- Osci (1/2)
- Domi (1/2)
- Gush (1/2)
- Ferri
- Edge (1/2)
- Diamo
- Dolce
- Solace / Solace Pro
- And more...

---

## Tech Stack

- Vanilla JavaScript (no framework dependencies)
- Web Audio API for audio decoding and analysis
- Web Workers for background processing
- Lovense Local LAN API for device control

---

## License

MIT License - See [LICENSE](LICENSE) file

---

<p align="center">
  <b>Made for the Lovense developer community</b><br>
  If you find this useful, consider <a href="https://ko-fi.com/aericode">supporting development</a>
</p>
