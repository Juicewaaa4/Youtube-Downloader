import path from 'path';
import { tmpdir } from 'os';
import { writeFile, access, readFile } from 'fs/promises';

const cookiePath = path.join(tmpdir(), 'yt_cookies.txt');
const localCookiePath = path.join(process.cwd(), 'cookies.txt');
let cookiesWritten = false;

/**
 * Extract the Data Sync ID from a Netscape cookie file content.
 * YouTube stores it in the __Secure-YEC cookie.
 */
function extractDataSyncId(cookieText) {
  // Look for __Secure-YEC cookie which contains the Data Sync ID
  const lines = cookieText.split('\n');
  for (const line of lines) {
    if (line.includes('__Secure-YEC')) {
      const parts = line.split('\t');
      if (parts.length >= 7) {
        return parts[6].trim();
      }
    }
  }
  return null;
}

export async function getYtDlpBaseArgs() {
  const args = [
    '--remote-components', 'ejs:github',
  ];

  let cookieText = null;

  // 1. Check if YOUTUBE_COOKIES environment variable is provided (recommended for Render)
  if (process.env.YOUTUBE_COOKIES) {
    try {
      cookieText = process.env.YOUTUBE_COOKIES.trim();
      if (!cookiesWritten) {
        await writeFile(cookiePath, cookieText, 'utf-8');
        cookiesWritten = true;
      }
      args.push('--cookies', cookiePath);
    } catch (e) {
      console.error('Error writing cookies from env:', e);
    }
  } else {
    // 2. Check if a cookies.txt file exists in the project root
    try {
      await access(localCookiePath);
      cookieText = await readFile(localCookiePath, 'utf-8');
      args.push('--cookies', localCookiePath);
    } catch {
      // No local cookies.txt file, proceed without it
    }
  }

  // Build extractor-args with player_client and optional data_sync_id
  let extractorArgs = 'youtube:player_client=web';

  // Try to extract Data Sync ID from cookies
  if (cookieText) {
    const dataSyncId = extractDataSyncId(cookieText);
    if (dataSyncId) {
      extractorArgs += `;data_sync_id=${dataSyncId}`;
    }
  }

  // Also allow explicit DATA_SYNC_ID env var override
  if (process.env.DATA_SYNC_ID) {
    extractorArgs = `youtube:player_client=web;data_sync_id=${process.env.DATA_SYNC_ID}`;
  }

  args.push('--extractor-args', extractorArgs);

  return args;
}
