import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, readdir, rm, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { getYtDlpBaseArgs } from '@/lib/ytdlp';

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
    const baseArgs = await getYtDlpBaseArgs();
    await run('yt-dlp', [...baseArgs, ...args, '--no-playlist', url], { timeout: 300000 });

    const [file] = await readdir(dir);
    if (!file) {
      throw new Error('No downloaded file found.');
    }

    const filePath = path.join(dir, file);
    const fileStat = await stat(filePath);

    const nodeStream = createReadStream(filePath);
    let cleanedUp = false;

    const cleanup = async () => {
      if (!cleanedUp) {
        cleanedUp = true;
        await rm(dir, { recursive: true, force: true }).catch(() => {});
      }
    };

    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        nodeStream.on('end', () => {
          controller.close();
          cleanup();
        });
        nodeStream.on('error', (err) => {
          controller.error(err);
          cleanup();
        });
      },
      cancel() {
        nodeStream.destroy();
        cleanup();
      },
    });

    return new Response(webStream, {
      headers: {
        'Content-Type': type === 'audio' ? 'audio/mpeg' : 'video/mp4',
        'Content-Length': String(fileStat.size),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file)}`,
      },
    });
  } catch (error) {
    // Cleanup on error too
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    return new Response(`Download error: ${error.stderr || error.message}`, { status: 502 });
  }
}