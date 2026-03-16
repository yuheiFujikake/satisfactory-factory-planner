import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Read the favicon SVG
const faviconSvg = readFileSync(resolve(projectRoot, 'public/favicon.svg'), 'utf-8');

// Extract just the inner content and adjust viewBox for embedding
const W = 1200;
const H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#16213e"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Subtle grid pattern -->
  <g opacity="0.06">
    ${Array.from({ length: 30 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="${H}" stroke="#fff" stroke-width="0.5"/>`).join('\n    ')}
    ${Array.from({ length: 16 }, (_, i) => `<line x1="0" y1="${i * 40}" x2="${W}" y2="${i * 40}" stroke="#fff" stroke-width="0.5"/>`).join('\n    ')}
  </g>

  <!-- Accent line at top -->
  <rect x="0" y="0" width="${W}" height="4" fill="#f5a623"/>

  <!-- Icon (scaled favicon) -->
  <g transform="translate(100, 175) scale(5.8)">
    <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
  </g>

  <!-- Title -->
  <text x="420" y="260" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700" fill="#f5a623">
    SF Factory
  </text>
  <text x="420" y="330" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700" fill="#e0e0e0">
    Planner
  </text>

  <!-- Description -->
  <text x="420" y="400" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#a0a0b0">
    工場の生産計画を自動計算するツール
  </text>

  <!-- Feature pills -->
  <g transform="translate(420, 440)">
    <rect x="0" y="0" width="120" height="36" rx="18" fill="rgba(245,166,35,0.15)" stroke="#f5a623" stroke-width="1"/>
    <text x="60" y="24" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#f5a623" text-anchor="middle">素材計算</text>

    <rect x="140" y="0" width="120" height="36" rx="18" fill="rgba(134,59,255,0.15)" stroke="#863bff" stroke-width="1"/>
    <text x="200" y="24" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#b388ff" text-anchor="middle">依存グラフ</text>

    <rect x="280" y="0" width="120" height="36" rx="18" fill="rgba(71,191,255,0.15)" stroke="#47bfff" stroke-width="1"/>
    <text x="340" y="24" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#47bfff" text-anchor="middle">電力計算</text>
  </g>

  <!-- Bottom bar -->
  <rect x="0" y="${H - 60}" width="${W}" height="60" fill="rgba(0,0,0,0.3)"/>
  <text x="40" y="${H - 25}" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#606080">
    Satisfactory Factory Planner
  </text>
</svg>`;

await sharp(Buffer.from(svg))
  .png()
  .toFile(resolve(projectRoot, 'public/og-image.png'));

console.log('Generated public/og-image.png (1200x630)');
