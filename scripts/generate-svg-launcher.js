import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const distIndexPath = path.join(distDir, 'index.html');

export function generateSvgLauncher() {
  if (!fs.existsSync(distIndexPath)) {
    console.warn('[svg-launcher] dist/index.html not found, skipping SVG launcher generation.');
    return;
  }

  let html = fs.readFileSync(distIndexPath, 'utf-8');

  // Ensure all asset references are relative (./assets/...)
  html = html.replace(/href="\/assets\//g, 'href="./assets/');
  html = html.replace(/src="\/assets\//g, 'src="./assets/');

  // Also rewrite dist/index.html so it has relative links
  fs.writeFileSync(distIndexPath, html, 'utf-8');

  // Extract head tags (css links, fonts, meta)
  const cssMatches = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*>/g)].map(m => m[0]);
  const scriptMatches = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"[^>]*><\/script>/g)].map(m => m[0]);

  // Extract embedded SVG filter definitions
  const svgFilterMatches = html.match(/<svg style="position:\s*absolute;[\s\S]*?<\/svg>/gi) || [];

  // Generate SVG with XHTML foreignObject wrapping the app
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="100%" height="100%">
  <foreignObject width="100%" height="100%" requiredExtensions="http://www.w3.org/1999/xhtml">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>GlassiumOS</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&amp;family=Comfortaa:wght@500;600;700&amp;family=JetBrains+Mono:wght@400;500;600;700&amp;family=M+PLUS+Rounded+1c:wght@400;500;700;800&amp;family=Noto+Sans+JP:wght@400;500;600;700&amp;family=Orbitron:wght@500;600;700;800&amp;family=Outfit:wght@400;500;600;700&amp;family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Quicksand:wght@500;600;700&amp;family=Zen+Maru+Gothic:wght@400;500;700&amp;display=swap" rel="stylesheet" />
        ${cssMatches.join('\n        ')}
        <style>
          html, body, #root {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #020617;
          }
        </style>
      </head>
      <body>
        ${svgFilterMatches.join('\n        ')}
        <div id="root"></div>
        ${scriptMatches.join('\n        ')}
      </body>
    </html>
  </foreignObject>
</svg>
`;

  // Write to dist/site.svg, dist/index.svg, and public/site.svg
  fs.writeFileSync(path.join(distDir, 'site.svg'), svgContent, 'utf-8');
  fs.writeFileSync(path.join(distDir, 'index.svg'), svgContent, 'utf-8');
  console.log('[svg-launcher] Successfully created dist/site.svg and dist/index.svg');

  const publicDir = path.join(rootDir, 'public');
  if (fs.existsSync(publicDir)) {
    fs.writeFileSync(path.join(publicDir, 'site.svg'), svgContent, 'utf-8');
    fs.writeFileSync(path.join(publicDir, 'index.svg'), svgContent, 'utf-8');
    console.log('[svg-launcher] Successfully created public/site.svg and public/index.svg');
  }
}

// Auto-run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateSvgLauncher();
}
