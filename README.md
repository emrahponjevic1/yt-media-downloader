# YT Media Downloader v2.1.0

> **The Ultimate Media Management Suite** - Download, Authenticate, Organize, and Burn YouTube media directly to your car's USB drive.

![YT Media Downloader](https://img.shields.io/badge/Status-Active-brightgreen) ![License](https://img.shields.io/badge/License-Free-blue) ![Windows Support](https://img.shields.io/badge/Windows-10%20%7C%2011-blueviolet)

YT Media Downloader is a professional, high-performance desktop application built with **React**, **Vite**, and **Electron**. Powered by the industry-standard `yt-dlp` engine, it offers a complete workflow from fetching high-quality 4K videos and MP3s to organizing tracks with random numbering and native USB burning.

---

## ⚠️ System Requirements

**IMPORTANT**: This application uses the latest Electron framework (v34+) and therefore **officially supports only Windows 10 and Windows 11**. 

*Windows 7 and Windows 8 are completely deprecated and unsupported by the modern Electron architecture due to security reasons.*

### 🎬 Media Player Compatibility

Downloaded files in **MP4 (up to 4K)** and **MP3** formats are optimized for modern players. For the best experience across **all formats and resolutions** (including MKV and WEBM), we recommend using **[VLC Media Player](https://www.videolan.org/)**.

---

## ✨ Pro Features

- **🔐 YouTube Authentication**: Integrated login system (WebView/OAuth2) to bypass download limits, avoid bot detection, and access age-restricted content.
- **📺 4K & High-Res Support**: Intelligent browser detection unlocks premium resolutions including **2160p (4K)** and **1440p (2K)**.
- **🛡️ Crash-Proof Logic**: Safe temporary file management (`temp_` prefix) and automatic cleanup of interrupted downloads to prevent file corruption.
- **👯 Smart Duplicate Prevention**: Automatic collision detection and numerical suffixing (e.g., `Song(1).mp3`) to keep your library organized.
- **🔄 Self-Healing Updates**: Robust internal update system that downloads the latest `yt-dlp` engine directly from GitHub, ensuring you are always up to date.
- **🚗 Car Player Specialist**: Advanced random numbering logic to shuffle tracks for car players that don't support native shuffle mode.
- **🔥 Direct USB Burning**: Native formatting and structured copying directly to your USB devices.
- **🌍 Multilingual**: Fully localized in English, Bosnian (BiH/HR/SRB), and German.

---

## 🚀 Quick Start Guide

1. **Download**: Grab the latest portable version from the [Releases](https://github.com/emrahponjevic1/yt-media-downloader/releases) page.
2. **Launch**: Run the `.exe` file. No installation required.
3. **Login**: We recommend logging in via the startup prompt to unlock maximum download speeds and quality.
4. **Download**: Paste a link, select quality, and hit download.
5. **Organize & Burn**: Use the **Randomize** and **USB** tabs to prepare your media for your car or portable device.

---

## 🛠️ Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Deno](https://deno.land/) (Required for some YouTube extraction logic - the app will offer to install it for you)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/emrahponjevic1/yt-media-downloader.git
   cd yt-media-downloader
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in Development Mode:
   ```bash
   npm run electron:dev
   ```

### Building (Portable EXE)
```bash
npm run build:exe
```

---

## 👨‍💻 Developer Info

**System Architecture & Lead Developer:** [Emrah Ponjevic](https://www.emrah-dev.net/)

- 💼 [LinkedIn](https://www.linkedin.com/in/emrah-ponjevic/)
- 🐱 [GitHub](https://github.com/emrahponjevic1)

---

## ❤️ Support the Project

This tool is 100% free and open-source. Your support helps maintain it and keep it ad-free!
[Donate via PayPal](https://paypal.me/emrahponjevic)

---
*Disclaimer: This tool is for personal use only. Please respect YouTube's Terms of Service and only download content you have the right to access.*
