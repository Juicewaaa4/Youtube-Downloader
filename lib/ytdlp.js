import path from 'path';
import { tmpdir } from 'os';
import { writeFile, access } from 'fs/promises';

const cookiePath = path.join(tmpdir(), 'yt_cookies.txt');
const localCookiePath = path.join(process.cwd(), 'cookies.txt');
let cookiesWritten = false;

export async function getYtDlpBaseArgs() {
  const args = [
    '--js-runtimes', 'node',
    '--extractor-args', 'youtube:player_client=android,web',
  ];

  // 1. Check if YOUTUBE_COOKIES environment variable is provided (recommended for Render)
  if (process.env.YOUTUBE_COOKIES) {
    try {
      if (!cookiesWritten) {
        await writeFile(cookiePath, process.env.YOUTUBE_COOKIES.trim(), 'utf-8');
        cookiesWritten = true;
      }
      args.push('--cookies', cookiePath);
      return args;
    } catch (e) {
      console.error('Error writing cookies from env:', e);
    }
  }

  // 2. Check if a cookies.txt file exists in the project root
  try {
    await access(localCookiePath);
    args.push('--cookies', localCookiePath);
  } catch {
    // No local cookies.txt file, proceed without it
  }

  return args;
}
