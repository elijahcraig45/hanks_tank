import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../services/api';
import { buildExportUrl } from '../../utils/unifiedPredictions';

/**
 * Download what the page shows. The files come straight from the API (`?format=csv|json`),
 * so the export is the same data the page was built from — never a re-serialisation of
 * whatever happens to be on screen. Copy link copies the page URL, filters included.
 */
export default function ExportToolbar({ sport, kind, params, what, children, copyLink = true }) {
  const [copied, setCopied] = useState(null);
  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(null), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const csv = buildExportUrl(API_BASE_URL, sport, kind, params, 'csv');
  const json = buildExportUrl(API_BASE_URL, sport, kind, params, 'json');

  const copy = async () => {
    const href = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.clipboard.writeText(href);
      setCopied('Link copied');
    } catch {
      // Clipboard blocked (http, old browser): show the link so it can be copied by hand.
      window.prompt('Copy this link', href); // eslint-disable-line no-alert
      setCopied('Link shown');
    }
  };

  return (
    <div className="up-export" role="toolbar" aria-label={`Export ${what}`}>
      <span className="up-export-label">Export {what}</span>
      <a className="up-btn" href={csv} download data-testid={`export-${kind}-csv`}>
        <span aria-hidden="true">⤓</span> Download CSV
      </a>
      <a className="up-btn" href={json} download data-testid={`export-${kind}-json`}>
        <span aria-hidden="true">⤓</span> Download JSON
      </a>
      {copyLink && (
        <button type="button" className="up-btn" onClick={copy}>
          <span aria-hidden="true">🔗</span> {copied || 'Copy link'}
        </button>
      )}
      {children}
      <span className="visually-hidden" aria-live="polite">{copied || ''}</span>
    </div>
  );
}
