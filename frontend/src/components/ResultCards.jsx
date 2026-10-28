import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, RotateCcw, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';

export function RiskCard({ risk, index }) {
  const severityConfig = {
    low: { cls: 'badge-low', icon: CheckCircle, color: '#10b981' },
    medium: { cls: 'badge-medium', icon: AlertTriangle, color: '#f59e0b' },
    high: { cls: 'badge-high', icon: AlertTriangle, color: '#f97316' },
    critical: { cls: 'badge-critical', icon: XCircle, color: '#ef4444' },
  };
  const cfg = severityConfig[risk.severity?.toLowerCase()] || severityConfig.medium;
  const Icon = cfg.icon;

  return (
    <div className="card-glass" style={{ marginBottom: 10, borderLeft: `3px solid ${cfg.color}` }}>
      <div className="flex items-center justify-between mb-sm" style={{ flexWrap: 'wrap', gap: 6 }}>
        <div className="flex items-center gap-sm">
          <Icon size={16} style={{ color: cfg.color }} />
          <span className={`badge ${cfg.cls}`}>{risk.severity}</span>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Risk #{index + 1}</span>
      </div>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', marginBottom: 6, lineHeight: 1.5 }}>
        {risk.description}
      </p>
      {risk.mitigation && (
        <div className="flex items-start gap-xs" style={{ marginTop: 6 }}>
          <Info size={14} style={{ color: 'var(--color-accent-orange)', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{risk.mitigation}</p>
        </div>
      )}
    </div>
  );
}

export function RecommendationList({ items, title = 'Recommendations' }) {
  if (!items?.length) return null;
  return (
    <div>
      {title && (
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 10, color: 'var(--color-text-primary)' }}>
          {title}
        </h4>
      )}
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <li key={i} className="flex gap-sm" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.65rem', fontWeight: 700, color: '#fb923c', flexShrink: 0, marginTop: 2,
            }}>{i + 1}</span>
            <span style={{ lineHeight: 1.5 }}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TagList({ items, label }) {
  if (!items?.length) return null;
  return (
    <div className="mb-md">
      {label && <p className="form-label">{label}</p>}
      <div className="flex" style={{ flexWrap: 'wrap', gap: 8 }}>
        {items.map((item, i) => (
          <span key={i} className="badge badge-info" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>{item}</span>
        ))}
      </div>
    </div>
  );
}

export function ErrorStateCard({ title = 'Analysis Error', message, onRetry }) {
  return (
    <div className="card error-card" role="alert">
      <div className="flex items-start gap-md">
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--radius-sm)',
          background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ShieldAlert size={20} style={{ color: '#ef4444' }} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f87171', marginBottom: 4 }}>
            {title}
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: onRetry ? 12 : 0 }}>
            {message || 'An error occurred while communicating with the service.'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="btn btn-outline-orange"
              style={{ fontSize: '0.8125rem', padding: '6px 14px' }}
            >
              <RotateCcw size={14} />
              Retry Action
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyAssessmentNotice({
  title = 'Assessment Inconclusive — No Data Found',
  message = 'Empty data is not presented as a successful assessment. No construction elements, distress indicators, or valid items were detected in the provided input.',
  onRetry,
}) {
  return (
    <div className="card warning-card" role="status">
      <div className="flex items-start gap-md">
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--radius-sm)',
          background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <AlertCircle size={20} style={{ color: '#f59e0b' }} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fbbf24', marginBottom: 4 }}>
            {title}
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: onRetry ? 12 : 0 }}>
            {message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="btn btn-primary"
              style={{ fontSize: '0.8125rem', padding: '6px 14px' }}
            >
              <RotateCcw size={14} />
              Try Again With Another Input
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SampleDataBadge({ label = 'Sample Data Template' }) {
  return (
    <div className="sample-badge mb-md" title="Pre-filled with sample construction parameters">
      <Sparkles size={13} style={{ color: '#fb923c' }} />
      <span>{label}</span>
    </div>
  );
}

export function LoadingStateBox({ title = 'Analyzing...', subtitle = 'Multimodal AI processing in progress' }) {
  return (
    <div className="card loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="construction-loader">
        <div className="construction-loader-ring" />
        <div className="construction-loader-core" />
      </div>
      <p className="loading-text" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {title}<span className="loading-dots" />
      </p>
      <div className="scanner-line" />
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{subtitle}</p>
    </div>
  );
}
