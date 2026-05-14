import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
const dest = path.join(__dirname, '../bin/yt-dlp.exe');

console.log('Skidanje yt-dlp.exe...');
const file = fs.createWriteStream(dest);

const download = (downloadUrl) => {
  https.get(downloadUrl, (response) => {
    if (response.statusCode === 302 || response.statusCode === 301) {
      download(response.headers.location);
    } else {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('yt-dlp.exe uspjesno skinut u bin/ folder.');
      });
    }
  }).on('error', (err) => {
    fs.unlink(dest, () => {});
    console.error('Greska pri skidanju:', err.message);
  });
};

download(url);
