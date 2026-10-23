'use client';

import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaInfo, setMediaInfo] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState(1080);
  const [dl, setDl] = useState(null);
  const [error, setError] = useState(null);

  const fetchVideoInfo = async () => {
    setLoading(true);
    setMediaInfo(null);
    setError(null);
    try {
      const res = await fetch(`/api/get-link?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMediaInfo(data);
        if (data.qualities?.length) {
          setSelectedQuality(data.qualities[data.qualities.length - 1]);
        }
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && url && !loading) fetchVideoInfo();
  };

  const startDownload = async (type) => {
    if (dl) return;
    setError(null);
    setDl({ type, phase: 'preparing', progress: 0 });

    const timer = setInterval(() => {
      setDl((d) =>
        d && d.phase === 'preparing'
          ? { ...d, progress: d.progress + (48 - d.progress) * 0.03 }
          : d
      );
    }, 300);

    try {
      const qualityParam = type === 'video' ? `&quality=${selectedQuality}` : '';
      const res = await fetch(
        `/api/download?type=${type}&url=${encodeURIComponent(url)}${qualityParam}`
      );
      if (!res.ok) throw new Error(await res.text());

      clearInterval(timer);
      const total = Number(res.headers.get('Content-Length')) || 0;
      const reader = res.body.getReader();
      const chunks = [];
      let received = 0;

      setDl({ type, phase: 'downloading', progress: 50 });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total) setDl({ type, phase: 'downloading', progress: 50 + (received / total) * 50 });
      }

      const blob = new Blob(chunks, { type: res.headers.get('Content-Type') || '' });
      const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename\*=UTF-8''(.+)$/);
      const filename = match ? decodeURIComponent(match[1]) : type === 'audio' ? 'audio.mp3' : 'video.mp4';

      const a = document.createElement('a');
      const dlUrl = URL.createObjectURL(blob);
      a.href = dlUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(dlUrl), 10000);

      setDl({ type, phase: 'done', progress: 100 });
      setTimeout(() => setDl(null), 2500);
    } catch (err) {
      setError(err.message || 'Download failed.');
      setDl(null);
    } finally {
      clearInterval(timer);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0d0d; font-family: 'Inter', sans-serif; }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        .page {
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem;
          gap: 2rem;
        }

        /* ─── Header ─── */
        .header { text-align: center; }
        .logo {
          width: 40px; height: 40px;
          background: #161616;
          border: 1px solid #222;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #e0e0e0;
          margin: 0 auto 1rem;
        }
        .title {
          font-size: clamp(1.6rem, 5vw, 2.2rem);
          font-weight: 700;
          color: #f5f5f5;
          letter-spacing: -0.03em;
          line-height: 1.15;
        }
        .subtitle {
          font-size: 0.8rem;
          color: #555;
          margin-top: 0.35rem;
          font-weight: 400;
          letter-spacing: 0.02em;
        }

        /* ─── Input row ─── */
        .input-row {
          width: 100%;
          max-width: 480px;
          display: flex;
          gap: 0.5rem;
        }
        .url-input {
          flex: 1;
          background: #111;
          border: 1px solid #222;
          border-radius: 10px;
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          color: #e0e0e0;
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
          min-width: 0;
        }
        .url-input::placeholder { color: #3a3a3a; }
        .url-input:focus { border-color: #333; }

        .scan-btn {
          background: #f5f5f5;
          color: #0d0d0d;
          border: none;
          border-radius: 10px;
          padding: 0.75rem 1.25rem;
          font-size: 0.85rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, transform 0.1s;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .scan-btn:hover:not(:disabled) { background: #ddd; }
        .scan-btn:active:not(:disabled) { transform: scale(0.97); }
        .scan-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* ─── Error ─── */
        .error-msg {
          width: 100%;
          max-width: 480px;
          font-size: 0.8rem;
          color: #888;
          padding: 0.65rem 0.9rem;
          background: #111;
          border: 1px solid #1e1e1e;
          border-radius: 8px;
          animation: fadeUp 0.25s ease;
        }

        /* ─── Result card ─── */
        .card {
          width: 100%;
          max-width: 480px;
          background: #111;
          border: 1px solid #1e1e1e;
          border-radius: 14px;
          overflow: hidden;
          animation: fadeUp 0.3s ease;
        }

        .thumb-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          overflow: hidden;
          background: #0a0a0a;
        }
        .thumb-wrap img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
          opacity: 0.85;
        }
        .thumb-fade {
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, transparent 40%, #111 100%);
        }

        .card-body { padding: 1rem 1.1rem 1.1rem; }

        .video-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #e8e8e8;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 0.9rem;
        }

        /* ─── Buttons ─── */
        .btn-row {
          display: flex;
          gap: 0.5rem;
        }
        .btn {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          gap: 0.45rem;
          padding: 0.7rem 0.75rem;
          border-radius: 9px;
          font-size: 0.82rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          border: none;
          transition: opacity 0.15s, transform 0.1s;
        }
        .btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
        .btn:active:not(:disabled) { transform: translateY(0); }
        .btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .btn-audio {
          background: #181818;
          color: #c0c0c0;
          border: 1px solid #272727;
        }
        .btn-video {
          background: #f0f0f0;
          color: #0d0d0d;
        }

        /* ─── Quality chips ─── */
        .quality-label {
          font-size: 0.68rem;
          color: #3a3a3a;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 500;
          margin-bottom: 0.45rem;
        }
        .quality-row {
          display: flex;
          gap: 0.4rem;
        }
        .q-chip {
          flex: 1;
          padding: 0.45rem 0;
          border-radius: 7px;
          font-size: 0.75rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          border: 1px solid #252525;
          background: #141414;
          color: #484848;
          transition: all .15s ease;
          text-align: center;
        }
        .q-chip:hover:not(:disabled) { border-color: #383838; color: #999; }
        .q-chip.on { background: #1c1c1c; border-color: #3d3d3d; color: #e0e0e0; }
        .q-chip:disabled { opacity: 0.3; cursor: not-allowed; }

        /* ─── Progress ─── */
        .progress-wrap { margin-top: 0.85rem; }
        .progress-label {
          display: flex; justify-content: space-between;
          font-size: 0.75rem;
          color: #555;
          margin-bottom: 0.45rem;
        }
        .progress-track {
          width: 100%; height: 2px;
          background: #1e1e1e;
          border-radius: 99px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.3s ease;
        }
        .progress-fill.done { background: #4ade80; }
        .progress-fill.active {
          background: linear-gradient(90deg, #666 0%, #aaa 40%, #fff 50%, #aaa 60%, #666 100%);
          background-size: 200% auto;
          animation: shimmer 1.5s linear infinite;
        }

        /* ─── Footer ─── */
        .footer {
          font-size: 0.7rem;
          color: #2a2a2a;
          letter-spacing: 0.05em;
        }

        /* ─── Spinner ─── */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>

      <main className="page">

        {/* Header */}
        <div className="header">
          <div className="logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.163c-.272-.98-1.04-1.748-2.02-2.02C19.716 3.75 12 3.75 12 3.75s-7.716 0-9.478.393c-.98.272-1.748 1.04-2.02 2.02C.1 7.925.1 12 .1 12s0 4.075.393 5.837c.272.98 1.04 1.748 2.02 2.02 1.762.393 9.478.393 9.478.393s7.716 0 9.478-.393c.98-.272 1.748-1.04 2.02-2.02.393-1.762.393-5.837.393-5.837zm-14.16 8.44V9.396l5.7 3.107-5.7 3.1z" />
            </svg>
          </div>
          <h1 className="title">Youtube Downloader</h1>
          <p className="subtitle">Paste a link. Pick a format. Done.</p>
        </div>

        {/* Input */}
        <div className="input-row">
          <input
            className="url-input"
            type="text"
            placeholder="https://youtube.com/watch?v=..."
            value={url}
            onChange={(e) => { setUrl(e.target.value); setMediaInfo(null); setError(null); }}
            onKeyDown={handleKeyDown}
          />
          <button
            className="scan-btn"
            onClick={fetchVideoInfo}
            disabled={loading || !url}
          >
            {loading ? (
              <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            )}
            {loading ? 'Scanning' : 'Scan'}
          </button>
        </div>

        {/* Error */}
        {error && <p className="error-msg">{error}</p>}

        {/* Result */}
        {mediaInfo && (
          <div className="card">
            {mediaInfo.thumbnail && (
              <div className="thumb-wrap">
                <img src={mediaInfo.thumbnail} alt="" />
                <div className="thumb-fade" />
              </div>
            )}
            <div className="card-body">
              <p className="video-title">{mediaInfo.title}</p>

              {/* Quality selector */}
              {mediaInfo.qualities?.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p className="quality-label">Quality</p>
                  <div className="quality-row">
                    {mediaInfo.qualities.map((q) => (
                      <button
                        key={q}
                        className={`q-chip${selectedQuality === q ? ' on' : ''}`}
                        onClick={() => setSelectedQuality(q)}
                        disabled={!!dl}
                      >
                        {q}p
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="btn-row">
                <button className="btn btn-audio" onClick={() => startDownload('audio')} disabled={!!dl}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                  </svg>
                  MP3
                </button>
                <button className="btn btn-video" onClick={() => startDownload('video')} disabled={!!dl}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
                  </svg>
                  {selectedQuality}p MP4
                </button>
              </div>

              {dl && (
                <div className="progress-wrap">
                  <div className="progress-label">
                    <span>
                      {dl.phase === 'preparing'   && 'Preparing...'}
                      {dl.phase === 'downloading' && 'Downloading...'}
                      {dl.phase === 'done'        && 'Done ✓'}
                    </span>
                    <span>{Math.round(dl.progress)}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${dl.phase === 'done' ? 'done' : 'active'}`}
                      style={{ width: `${dl.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="footer">ytdownloader © 2026</p>
      </main>
    </>
  );
}
