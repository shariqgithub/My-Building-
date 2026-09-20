import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

function drawIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });
  const center = size / 2;
  const radius = isMaskable ? size * 0.42 : size * 0.46;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background gradient (Dark Emerald to Forest Green)
      const gradRatio = (x + y) / (size * 2);
      let r = Math.round(4 + gradRatio * 2);
      let g = Math.round(120 - gradRatio * 42);
      let b = Math.round(87 - gradRatio * 28);
      let a = 255;

      if (!isMaskable) {
        // Rounded corner check for standard icon
        const cornerR = size * 0.22;
        const inLeft = x < cornerR;
        const inRight = x > size - cornerR;
        const inTop = y < cornerR;
        const inBottom = y > size - cornerR;

        if ((inLeft || inRight) && (inTop || inBottom)) {
          const cx = inLeft ? cornerR : size - cornerR;
          const cy = inTop ? cornerR : size - cornerR;
          const cDist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
          if (cDist > cornerR) {
            a = 0;
          }
        }
      }

      if (a > 0) {
        // Inner circle frame (Sub-meter dial)
        const meterRadius = size * 0.30;
        const meterBorder = size * 0.02;

        if (dist <= meterRadius && dist >= meterRadius - meterBorder) {
          // Border of dial
          r = 16;
          g = 185;
          b = 129;
        } else if (dist < meterRadius - meterBorder) {
          // Inside meter dial (Dark Slate / Deep Emerald)
          r = 2;
          g = 44;
          b = 34;

          // Lightning bolt shape in normalized coordinates (-1 to 1)
          const nx = (x - center) / (size * 0.22);
          const ny = (y - center) / (size * 0.22);

          // Approximate bolt polygon:
          // Top point (0.1, -0.8), left elbow (-0.4, -0.05), inner crook (-0.05, -0.05),
          // bottom point (-0.15, 0.8), right elbow (0.45, 0.05), top inner crook (0.1, 0.05)
          let inBolt = false;
          if (ny >= -0.8 && ny <= 0.8) {
            if (ny < 0) {
              const leftEdge = -0.4 + (ny + 0.05) * ((-0.4 - 0.1) / (-0.75));
              const rightEdge = 0.1 + (ny + 0.8) * ((-0.05 - 0.1) / (0.75));
              if (nx >= leftEdge && nx <= rightEdge + 0.15) inBolt = true;
            } else {
              const leftEdge = -0.15 - (0.8 - ny) * ((-0.15 - (-0.05)) / (-0.75));
              const rightEdge = 0.45 - (ny - 0.05) * ((0.45 - (-0.15)) / (0.75));
              if (nx >= leftEdge - 0.15 && nx <= rightEdge) inBolt = true;
            }
          }

          if (inBolt) {
            // Gold / Yellow lightning bolt
            r = 250;
            g = 204;
            b = 21;
          }
        }
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  return PNG.sync.write(png);
}

const publicDir = path.resolve('public');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), drawIcon(192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), drawIcon(512));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), drawIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), drawIcon(180));

// Generate high-resolution screenshots for PWABuilder store compliance
function drawScreenshot(width, height, isMobile = true) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      
      // Top bar header
      if (y < (isMobile ? 80 : 64)) {
        png.data[idx] = 4;
        png.data[idx + 1] = 120;
        png.data[idx + 2] = 87;
        png.data[idx + 3] = 255;
        continue;
      }

      // Slate background
      const grad = y / height;
      png.data[idx] = Math.round(15 + grad * 10);
      png.data[idx + 1] = Math.round(23 + grad * 15);
      png.data[idx + 2] = Math.round(42 + grad * 20);
      png.data[idx + 3] = 255;

      // Card container in center
      const cardMarginX = isMobile ? 32 : 120;
      const cardMarginY = isMobile ? 120 : 100;
      if (x > cardMarginX && x < width - cardMarginX && y > cardMarginY && y < height - (isMobile ? 100 : 80)) {
        png.data[idx] = 30;
        png.data[idx + 1] = 41;
        png.data[idx + 2] = 59;
        png.data[idx + 3] = 255;

        // Inner highlight meter bar
        if (y > cardMarginY + 50 && y < cardMarginY + 110 && x > cardMarginX + 30 && x < width - cardMarginX - 30) {
          png.data[idx] = 16;
          png.data[idx + 1] = 185;
          png.data[idx + 2] = 129;
          png.data[idx + 3] = 255;
        }
      }
    }
  }
  return PNG.sync.write(png);
}

fs.writeFileSync(path.join(publicDir, 'screenshot-mobile.png'), drawScreenshot(540, 960, true));
fs.writeFileSync(path.join(publicDir, 'screenshot-mobile-2.png'), drawScreenshot(540, 960, true));
fs.writeFileSync(path.join(publicDir, 'screenshot-desktop.png'), drawScreenshot(1280, 720, false));
fs.writeFileSync(path.join(publicDir, 'screenshot-desktop-2.png'), drawScreenshot(1280, 720, false));
console.log('Successfully generated all PWA icons and screenshots in /public!');
