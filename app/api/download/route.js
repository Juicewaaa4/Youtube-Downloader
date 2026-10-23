import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink, mkdtemp, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

export const runtime = 'nodejs';
const run = promisify(execFile);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const type = searchParams.get('type') === 'audio' ? 'audio' : 'video';
  const quality = parseInt(searchParams.get('quality') || '1080', 10);

  if (!url || !/^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(url)) {
    return new Response('Invalid YouTube URL', { status: 400 });
  }

  const dir = await mkdtemp(path.join(tmpdir(), 'ytdl-'));

  const args =
    type === 'audio'
      ? ['-x', '--audio-format', 'mp3', '-o', path.join(dir, '%(title)s.%(ext)s')]
      : ['-f', `bv*[height<=${quality}]+ba/b`, '--merge-output-format', 'mp4',
         '-o', path.join(dir, '%(title)s.%(ext)s')];

  try {
    await run('yt-dlp', [...args, '--no-playlist', url], { timeout: 300000 });

    const [file] = await readdir(dir);
    const filePath = path.join(dir, file);
    const data = await readFile(filePath);

    // Cleanup temp dir (file + directory)
    await rm(dir, { recursive: true, force: true });

    return new Response(data, {
      headers: {
        'Content-Type': type === 'audio' ? 'audio/mpeg' : 'video/mp4',
        'Content-Length': String(data.length),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file)}`,
      },
    });
  } catch (error) {
    // Cleanup on error too
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    return new Response(`Download error: ${error.stderr || error.message}`, { status: 502 });
  }
}