import React, { useEffect, useState } from 'react';
import {
  MapPin, Shield, IndianRupee, BarChart2, Package, FileText,
  MessageCircle, Camera,
  Activity, ArrowRight, Zap, Globe, RotateCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { checkHealth } from '../api';

const features = [
  { to: '/site-analysis', icon: MapPin, label: 'Site Analysis', desc: 'Multimodal AI site condition analysis', color: '#f97316', stat: 'AI-Powered' },
  { to: '/safety-inspection', icon: Shield, label: 'Safety Inspection', desc: 'PPE & compliance detection per IS:4130', color: '#10b981', stat: 'IS: 4130' },
  { to: '/cost-estimation', icon: IndianRupee, label: 'Cost Estimation', desc: 'Detailed BOQ & cost in Indian Rupees (₹)', color: '#f59e0b', stat: '₹ INR' },
  { to: '/progress-monitoring', icon: BarChart2, label: 'Progress Monitor', desc: 'Schedule variance & EVM tracking', color: '#8b5cf6', stat: 'EVM' },
  { to: '/material-analysis', icon: Package, label: 'Material Analysis', desc: 'Bill of Quantities with market rates', color: '#ea580c', stat: 'BOQ' },
  { to: '/project-report', icon: FileText, label: 'Project Report', desc: 'Executive status reports with radar KPIs', color: '#06b6d4', stat: 'KPIs' },
  { to: '/visual-progress', icon: Camera, label: 'Visual Progress', desc: 'Image-based construction phase detection', color: '#ec4899', stat: 'Vision AI' },
  { to: '/chat', icon: MessageCircle, label: 'AI Assistant', desc: 'Indian construction specs & IS codes Q&A', color: '#a78bfa', stat: 'Chat AI' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);

  const loadHealth = () => {
    setChecking(true);
    checkHealth()
      .then(r => setHealth(r.data))
      .catch(() => setHealth({ status: 'error', ai_available: false, version: '1.0.0' }))
      .finally(() => setChecking(false));
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <div>
      {/* Hero Banner */}
      <div className="card mb-xl" style={{
        background: 'linear-gradient(135deg, rgba(15,27,51,0.95) 0%, rgba(234,88,12,0.18) 50%, rgba(10,22,40,0.98) 100%)',
        border: '1px solid rgba(249,115,22,0.35)',
        padding: 'var(--spacing-xl)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div className="flex items-center gap-sm mb-md" style={{ flexWrap: 'wrap' }}>
            <span className="badge" style={{
              background: 'rgba(249,115,22,0.15)',
              color: '#fb923c',
              border: '1px solid rgba(249,115,22,0.35)',
              padding: '4px 12px',
            }}>
              <Zap size={11} />
              Construction Intelligence
            </span>
            {health?.ai_available ? (
              <span className="badge badge-success" style={{ padding: '4px 12px' }}>
                <Activity size={11} />
                Groq AI Engine Online
              </span>
            ) : (
              <span className="badge badge-critical" style={{ padding: '4px 12px' }}>
                <Activity size={11} />
                AI Key Required
              </span>
            )}
          </div>
          <h1 className="page-title" style={{ fontSize: '2.1rem', marginBottom: 12 }}>
            Multimodal Construction<br />
            <span style={{
              background: 'linear-gradient(90deg, #fed7aa, #f97316)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Intelligence Platform
            </span>
          </h1>
          <p style={{ fontSize: '0.975rem', color: 'rgba(248,250,252,0.8)', maxWidth: 620, lineHeight: 1.65, marginBottom: 24 }}>
            Decision-support for site engineers, contractors, and project managers.
            Inspect safety compliance per IS codes, estimate itemized costs in ₹ INR, analyze site images, and track EVM progress.
          </p>
          <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/chat')}>
              <MessageCircle size={16} />
              Open AI Assistant
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/site-analysis')}>
              <MapPin size={16} />
              Analyze Site Photo
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/cost-estimation')}>
              <IndianRupee size={16} />
              Estimate Project Cost
            </button>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="page-header">
        <h2 style={{ fontSize: '1.25rem', marginBottom: 4 }}>Platform Modules</h2>
        <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Select any module to begin AI-powered construction analysis</p>
      </div>

      <div className="grid-auto">
        {features.map(({ to, icon: Icon, label, desc, color, stat }) => (
          <div
            key={to}
            className="card"
            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
            onClick={() => navigate(to)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && navigate(to)}
            aria-label={`Open ${label} module`}
          >
            <div className="flex items-center justify-between mb-md">
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-sm)',
                background: `${color}20`,
                border: `1px solid ${color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={22} style={{ color }} />
              </div>
              <span className="badge" style={{
                background: `${color}18`,
                color: color,
                border: `1px solid ${color}35`,
                fontSize: '0.68rem',
              }}>
                {stat}
              </span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-text-primary)' }}>{label}</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>{desc}</p>
            <div className="flex items-center gap-xs" style={{ color: 'var(--color-accent-orange)', fontSize: '0.8125rem', fontWeight: 600 }}>
              <span>Open module</span>
              <ArrowRight size={14} />
            </div>
          </div>
        ))}
      </div>

      {/* API Status Card */}
      {health && (
        <div className="card mt-xl" style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="flex items-center gap-sm">
              <Globe size={16} className="text-secondary" />
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                System Status:{' '}
                <strong style={{ color: health.status === 'healthy' && health.ai_available ? '#10b981' : '#f59e0b' }}>
                  {health.status === 'healthy' && health.ai_available ? 'All AI Services Operational' : 'API Online · AI Engine Key Pending'}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-md">
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Platform v{health.version || '1.0.0'}
              </span>
              <button
                className="btn btn-secondary btn-icon"
                style={{ width: 28, height: 28 }}
                onClick={loadHealth}
                disabled={checking}
                title="Refresh system status"
                aria-label="Refresh system status"
              >
                <RotateCcw size={13} className={checking ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
