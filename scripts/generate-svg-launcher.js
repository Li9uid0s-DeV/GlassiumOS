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

  // Ensure all asset references in dist/index.html are relative (./assets/...)
  html = html.replace(/href="\/assets\//g, 'href="./assets/');
  html = html.replace(/src="\/assets\//g, 'src="./assets/');
  fs.writeFileSync(distIndexPath, html, 'utf-8');

  // Helper to ensure strict XML compliance for SVG foreignObject
  const sanitizeXmlTag = (tag) => {
    let clean = tag
      .replace(/\bcrossorigin\b(?!\s*=)/g, 'crossorigin="anonymous"')
      .replace(/\bdefer\b(?!\s*=)/g, 'defer="defer"')
      .replace(/\basync\b(?!\s*=)/g, 'async="async"');
    if (clean.startsWith('<link') && !clean.endsWith('/>')) {
      clean = clean.replace(/>$/, ' />');
    }
    return clean;
  };

  // Extract head tags (css links, fonts, meta)
  const cssMatches = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*>/g)].map(m => sanitizeXmlTag(m[0]));
  const scriptMatches = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"[^>]*><\/script>/g)].map(m => sanitizeXmlTag(m[0]));

  // Extract embedded SVG filter definitions
  const svgFilterMatches = html.match(/<svg style="position:\s*absolute;[\s\S]*?<\/svg>/gi) || [];

  // 1. Template for dist/ (relative path: ./assets/...)
  const svgContentDist = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="100%" height="100%">
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

  // 2. Template for root/ (relative path: ./dist/assets/...)
  const cssMatchesRoot = cssMatches.map(tag => tag.replace('./assets/', './dist/assets/'));
  const scriptMatchesRoot = scriptMatches.map(tag => tag.replace('./assets/', './dist/assets/'));
  const svgContentRoot = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="100%" height="100%">
  <foreignObject width="100%" height="100%" requiredExtensions="http://www.w3.org/1999/xhtml">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>GlassiumOS</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&amp;family=Comfortaa:wght@500;600;700&amp;family=JetBrains+Mono:wght@400;500;600;700&amp;family=M+PLUS+Rounded+1c:wght@400;500;700;800&amp;family=Noto+Sans+JP:wght@400;500;600;700&amp;family=Orbitron:wght@500;600;700;800&amp;family=Outfit:wght@400;500;600;700&amp;family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Quicksand:wght@500;600;700&amp;family=Zen+Maru+Gothic:wght@400;500;700&amp;display=swap" rel="stylesheet" />
        ${cssMatchesRoot.join('\n        ')}
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
        ${scriptMatchesRoot.join('\n        ')}
      </body>
    </html>
  </foreignObject>
</svg>
`;

  // Write files in dist/
  fs.writeFileSync(path.join(distDir, 'site.svg'), svgContentDist, 'utf-8');
  fs.writeFileSync(path.join(distDir, 'index.svg'), svgContentDist, 'utf-8');
  fs.writeFileSync(path.join(distDir, 'して.svg'), svgContentDist, 'utf-8');

  // Write files in repository root
  fs.writeFileSync(path.join(rootDir, 'site.svg'), svgContentRoot, 'utf-8');
  fs.writeFileSync(path.join(rootDir, 'index.svg'), svgContentRoot, 'utf-8');
  fs.writeFileSync(path.join(rootDir, 'して.svg'), svgContentRoot, 'utf-8');

  // Write files in public/ and sync assets so SVG launchers work directly on server
  const publicDir = path.join(rootDir, 'public');
  if (fs.existsSync(publicDir)) {
    fs.writeFileSync(path.join(publicDir, 'site.svg'), svgContentDist, 'utf-8');
    fs.writeFileSync(path.join(publicDir, 'index.svg'), svgContentDist, 'utf-8');
    fs.writeFileSync(path.join(publicDir, 'して.svg'), svgContentDist, 'utf-8');

    const publicAssetsDir = path.join(publicDir, 'assets');
    const distAssetsDir = path.join(distDir, 'assets');
    if (fs.existsSync(distAssetsDir)) {
      fs.cpSync(distAssetsDir, publicAssetsDir, { recursive: true, force: true });
    }
    // Generate single-file standalone.html & standalone.txt for Google Apps Script
    try {
      let standalone = fs.readFileSync(distIndexPath, 'utf-8');
      const assetsDir = path.join(distDir, 'assets');
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        let cssContent = '';
        let jsContent = '';
        for (const file of files) {
          if (file.endsWith('.css')) {
            cssContent += fs.readFileSync(path.join(assetsDir, file), 'utf-8') + '\n';
            standalone = standalone.replace(new RegExp(`<link[^>]+href="[^"]*${file}"[^>]*>`, 'g'), '');
          } else if (file.endsWith('.js')) {
            jsContent += fs.readFileSync(path.join(assetsDir, file), 'utf-8') + '\n';
            standalone = standalone.replace(new RegExp(`<script[^>]+src="[^"]*${file}"[^>]*><\\/script>`, 'g'), '');
          }
        }
        if (cssContent) {
          standalone = standalone.replace('</head>', `<style>\n${cssContent}\n</style>\n</head>`);
        }
        const rootDivTag = '<div id="root"></div>';
        if (standalone.includes(rootDivTag)) {
          standalone = standalone.replace(rootDivTag, `${rootDivTag}\n<script>\n${jsContent}\n</script>`);
        }
        fs.writeFileSync(path.join(publicDir, 'standalone.html'), standalone, 'utf-8');
        fs.writeFileSync(path.join(publicDir, 'standalone.txt'), standalone, 'utf-8');
      }
    } catch (err) {
      console.warn('[svg-launcher] Standalone HTML generation warning:', err);
    }
  }

  console.log('[svg-launcher] Successfully created site.svg, index.svg, standalone.html, and standalone.txt!');
}

// Auto-run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateSvgLauncher();
}
