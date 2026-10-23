import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

export const runtime = 'nodejs';
const run = promisify(execFile);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || !/^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(url)) {
    return NextResponse.json({ error: 'Invalid YouTube URL provided.' }, { status: 400 });
  }

  try {
    const { stdout } = await run(
      'yt-dlp',
      ['--print', '%(title)s\n%(thumbnail)s\n%(formats_table)s', '--no-playlist', url],
      { timeout: 30000 }
    );

    const lines = stdout.trim().split('\n');
    const title = lines[0] || 'Unknown Title';
    const thumbnail = lines[1] || null;

    // Extract available heights from formats table
    const formatsText = lines.slice(2).join('\n');
    const heights = [...new Set(
      [...formatsText.matchAll(/\s(\d{3,4})p/g)].map(m => parseInt(m[1]))
    )].sort((a, b) => a - b);

    const tiers = [360, 720, 1080];
    const qualities = tiers.filter(t => heights.some(h => h >= t));

    return NextResponse.json({ title, thumbnail, qualities: qualities.length ? qualities : [1080] });
  } catch (error) {
    return NextResponse.json(
      { error: `Extraction Error: ${error.stderr || error.message}` },
      { status: 502 }
    );
  }
}
