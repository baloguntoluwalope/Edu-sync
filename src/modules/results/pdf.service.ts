import puppeteer, { Browser } from 'puppeteer';
import { logger } from '../../config/logger';
import fs from 'fs';

/**
 * Find Chrome executable path based on OS
 */
const findChrome = (): string | undefined => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  const platform = process.platform;
  if (platform === 'win32') {
    const windowsPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
    ];
    for (const p of windowsPaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  if (platform === 'linux') {
    const linuxPaths = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser'];
    for (const p of linuxPaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  return platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined;
};

/**
 * Optimized PDF Generator
 * Ensures external assets (passports, signatures, logos) are fully loaded.
 */
export const generatePDF = async (html: string): Promise<Buffer> => {
  let browser: Browser | null = null;
  const executablePath = findChrome();

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });

    const page = await browser.newPage();

    // ─── BROWSER EVENT LOGGING ───
    page.on('console', (msg) => logger.debug(`[Browser Log]: ${msg.text()}`));
    
    page.on('pageerror', (err: any) => {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[Browser Page Error]: ${message}`);
    });

    page.on('requestfailed', (req: any) => {
      const failure = req.failure();
      // This will tell you exactly which image URL failed to load
      logger.warn(`[Asset Load Failed]: ${req.url()} - ${failure?.errorText || 'Unknown error'}`);
    });

    // High-Res Viewport for ID Cards
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

    // Emulate print media so CSS @media print styles apply
    await page.emulateMediaType('print');

    /**
     * LOADING STRATEGY:
     * We use 'networkidle0' which waits until there are NO active network connections.
     * This ensures passports and signatures are fully downloaded before generating the PDF.
     */
    await page.setContent(html, {
      waitUntil: 'networkidle0', 
      timeout: 30000, // 30 seconds max for asset fetching
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '10mm', bottom: '10mm', left: '8mm', right: '8mm' },
    });

    return Buffer.from(pdfBuffer);

  } catch (err: any) {
    logger.error('PDF Generation Error:', {
      message: err?.message,
      stack: err?.stack,
    });

    if (err?.message?.includes('TimeoutError')) {
      throw new Error('PDF Generation timed out. Check if student photos/signatures are reachable URLs.');
    }

    throw new Error('Internal Rendering Error: Failed to generate PDF.');
  } finally {
    if (browser) {
      await browser.close().catch((e: Error) => logger.error('Error closing browser:', e.message));
    }
  }
};

// import puppeteer from 'puppeteer';
// import { logger } from '../../config/logger';

// // ─────────────────────────────────────────────────────────────────────────────
// // Find Chrome executable path
// // Tries multiple locations — system Chrome, env var, puppeteer cache
// // ─────────────────────────────────────────────────────────────────────────────
// const findChrome = (): string | undefined => {
//   // Allow override via environment variable
//   if (process.env.CHROME_PATH) {
//     return process.env.CHROME_PATH;
//   }

//   if (process.platform === 'win32') {
//     const windowsPaths = [
//       'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
//       'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
//       `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
//       'C:\\Program Files\\Google\\Chrome Beta\\Application\\chrome.exe',
//       'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
//     ];

//     const fs = require('fs');
//     for (const p of windowsPaths) {
//       try {
//         if (fs.existsSync(p)) {
//           logger.info(`Found Chrome at: ${p}`);
//           return p;
//         }
//       } catch {
//         // Continue checking
//       }
//     }
//   }

//   if (process.platform === 'linux') {
//     const linuxPaths = [
//       '/usr/bin/google-chrome',
//       '/usr/bin/google-chrome-stable',
//       '/usr/bin/chromium-browser',
//       '/usr/bin/chromium',
//     ];

//     const fs = require('fs');
//     for (const p of linuxPaths) {
//       try {
//         if (fs.existsSync(p)) return p;
//       } catch {
//         // Continue
//       }
//     }
//   }

//   if (process.platform === 'darwin') {
//     return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
//   }

//   return undefined;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Generate PDF from HTML string
// // ─────────────────────────────────────────────────────────────────────────────
// export const generatePDF = async (html: string): Promise<Buffer> => {
//   let browser;

//   const executablePath = findChrome();

//   if (!executablePath) {
//     logger.warn('No system Chrome found. Falling back to puppeteer bundled Chrome.');
//   }

//   try {
//     const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
//       headless: true,
//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-dev-shm-usage',
//         '--disable-gpu',
//         '--disable-extensions',
//         '--disable-background-networking',
//         '--no-first-run',
//         '--no-zygote',
//         '--single-process',
//       ],
//     };

//     // Use system Chrome if found
//     if (executablePath) {
//       launchOptions.executablePath = executablePath;
//     }

//     browser = await puppeteer.launch(launchOptions);

//     const page = await browser.newPage();

//     // Set viewport to A4 size
//     await page.setViewport({
//       width: 1240,
//       height: 1754,
//       deviceScaleFactor: 1,
//     });

//     // Load HTML — waitUntil networkidle2 to let images load
//     await page.setContent(html, {
//       waitUntil: 'networkidle2',
//       timeout: 30000,
//     });

//     // Generate PDF
//     const pdf = await page.pdf({
//       format: 'A4',
//       printBackground: true,
//       margin: {
//         top: '10mm',
//         bottom: '10mm',
//         left: '8mm',
//         right: '8mm',
//       },
//       displayHeaderFooter: false,
//     });

//     return Buffer.from(pdf);
//   } catch (err: any) {
//     logger.error('PDF generation error:', err?.message || err);

//     // Give a helpful error message
//     if (err?.message?.includes('Could not find Chrome')) {
//       throw new Error(
//         'Chrome not found. Run: npx puppeteer browsers install chrome  ' +
//         'or set CHROME_PATH in your .env to your Chrome executable path.'
//       );
//     }

//     throw new Error('Failed to generate PDF. Please try again.');
//   } finally {
//     if (browser) {
//       try {
//         await browser.close();
//       } catch {
//         // Non-blocking
//       }
//     }
//   }
// };