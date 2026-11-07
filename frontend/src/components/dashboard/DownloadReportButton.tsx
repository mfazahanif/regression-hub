'use client';

import { useRef, useState } from 'react';

type ReportFormat = 'pdf' | 'xlsx';

export function DownloadReportButton({
  sessionId,
  sessionName,
  compact = false,
}: {
  sessionId: string;
  sessionName: string;
  compact?: boolean;
}) {
  const [downloading, setDownloading] = useState<ReportFormat | null>(null);
  const [error, setError] = useState('');
  const menuRef = useRef<HTMLDetailsElement>(null);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const download = async (format: ReportFormat) => {
    setDownloading(format);
    setError('');
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      const response = await fetch(`${baseUrl}/sessions/${sessionId}/report?format=${format}`, {
        headers: { Authorization: `Bearer ${auth.access_token || ''}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Report tidak dapat diunduh. Coba lagi.');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition') || '';
      const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
      const safeName = sessionName
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'session';
      const filename = filenameMatch?.[1] || `${safeName}_report.${format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      menuRef.current?.removeAttribute('open');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report tidak dapat diunduh. Coba lagi.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="relative inline-flex" onClick={event => event.stopPropagation()}>
      <details ref={menuRef} onKeyDown={event => {
        if (event.key === 'Escape') menuRef.current?.removeAttribute('open');
      }}>
        <summary
          aria-label={`Download report for ${sessionName}`}
          className={`${compact ? 'min-h-11 min-w-11 px-3' : 'min-h-11 px-4'} list-none rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 active:bg-emerald-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 flex items-center justify-center gap-2 text-sm font-bold select-none`}
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v12m0 0l-4-4m4 4l4-4M5 17v3h14v-3" />
          </svg>
          {compact ? <span className="sr-only">Report</span> : 'Download Report'}
        </summary>
        <div className="absolute right-0 z-30 mt-2 min-w-40 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl">
          <button
            type="button"
            onClick={() => download('pdf')}
            disabled={downloading !== null}
            className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-semibold text-white hover:bg-slate-800 active:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading === 'pdf' ? 'Downloading PDF…' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={() => download('xlsx')}
            disabled={downloading !== null}
            className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-semibold text-white hover:bg-slate-800 active:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading === 'xlsx' ? 'Downloading Excel…' : 'Download Excel'}
          </button>
        </div>
      </details>
      {error && (
        <span role="alert" className="absolute right-0 top-full z-40 mt-2 w-60 rounded-lg border border-rose-500/40 bg-slate-900 p-3 text-xs text-rose-200 shadow-lg">
          {error}
        </span>
      )}
    </div>
  );
}
