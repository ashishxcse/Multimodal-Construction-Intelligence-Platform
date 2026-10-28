import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, IndianRupee, ShieldAlert, RotateCcw } from 'lucide-react';
import ImageUploader from '../components/ImageUploader';
import ScoreGauge from '../components/ScoreGauge';
import { RecommendationList, ErrorStateCard, EmptyAssessmentNotice, LoadingStateBox } from '../components/ResultCards';
import { inspectSafety, formatINR } from '../api';
import toast from 'react-hot-toast';

const ppeIcons = {
  helmet: '⛑️',
  safety_vest: '🦺',
  gloves: '🧤',
  safety_boots: '👢',
};

export default function SafetyInspection() {
  const [file, setFile] = useState(null);
  const [siteType, setSiteType] = useState('construction');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleInspect = async () => {
    if (!file) return toast.error('Please upload a site image first.');
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await inspectSafety(file, siteType);
      const data = res.data;
      const hasAssessmentData = data && (
        Boolean(data.compliance_status) ||
        (Array.isArray(data.violations) && data.violations.length > 0) ||
        (data.ppe_compliance && Object.keys(data.ppe_compliance).length > 0) ||
        (Array.isArray(data.recommendations) && data.recommendations.length > 0)
      );

      setResult(data);
      if (hasAssessmentData) {
        toast.success('Safety inspection complete!');
      } else {
        toast('Inspection returned no conclusive findings', { icon: '⚠️' });
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Inspection failed.';
      setError(detail);
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const hasAssessmentData = result && (
    Boolean(result.compliance_status) ||
    (Array.isArray(result.violations) && result.violations.length > 0) ||
    (result.ppe_compliance && Object.keys(result.ppe_compliance).length > 0) ||
    (Array.isArray(result.recommendations) && result.recommendations.length > 0)
  );

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-sm mb-sm">
          <Shield size={24} style={{ color: 'var(--color-accent-orange)' }} />
          <h1 className="page-title" style={{ marginBottom: 0 }}>Safety Inspection</h1>
        </div>
        <p className="page-subtitle">AI-powered PPE detection, hazard identification, and regulatory compliance check per IS 4130 & BOCW Act.</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div>
          <div className="card mb-md">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Upload Site Image</h3>
            <ImageUploader onFileSelect={(f) => { setFile(f); setError(null); }} label="Drop inspection image here" />
          </div>
          <div className="card">
            <div className="form-group">
              <label htmlFor="site-type-select" className="form-label">Site Type</label>
              <select
                id="site-type-select"
                className="form-control"
                value={siteType}
                onChange={e => setSiteType(e.target.value)}
              >
                <option value="construction">General Construction</option>
                <option value="excavation">Excavation / Foundation</option>
                <option value="highrise">High-rise Building</option>
                <option value="demolition">Demolition</option>
                <option value="road">Road / Infrastructure</option>
                <option value="tunneling">Tunneling / Underground</option>
              </select>
            </div>
            <button
              className="btn btn-primary w-full"
              onClick={handleInspect}
              disabled={!file || loading}
              id="inspect-safety-btn"
            >
              {loading ? (
                <>
                  <div className="spinner spinner-sm" />
                  <span>Inspecting</span>
                  <span className="loading-dots" />
                </>
              ) : (
                <>
                  <Shield size={16} />
                  <span>Run Safety Inspection</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div>
          {loading && (
            <LoadingStateBox
              title="AI safety inspector analyzing image"
              subtitle="Validating against IS 4130 and BOCW standards"
            />
          )}

          {error && !loading && (
            <ErrorStateCard
              title="Safety Inspection Failed"
              message={error}
              onRetry={handleInspect}
            />
          )}

          {result && !loading && !hasAssessmentData && (
            <EmptyAssessmentNotice
              title="Inspection Inconclusive — Empty Data"
              message="Empty data is not presented as a successful assessment. No PPE equipment, personnel, or site hazards could be detected in the provided image. Please upload a clear site photo showing active workers or site conditions."
              onRetry={handleInspect}
            />
          )}

          {result && !loading && hasAssessmentData && (
            <div className="result-panel">
              {/* Score + Status */}
              <div className="card mb-md">
                <div className="flex items-center gap-lg" style={{ flexWrap: 'wrap' }}>
                  <ScoreGauge score={result.overall_safety_score} label="Safety Score" />
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div className="mb-sm">
                      <span className={`badge ${
                        result.overall_safety_score >= 80 ? 'badge-success' :
                        result.overall_safety_score >= 60 ? 'badge-warning' : 'badge-high'
                      }`} style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                        {result.compliance_status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      Risk level: <strong style={{ textTransform: 'capitalize' }}>{result.risk_level}</strong>
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
                      Model-reported confidence: {result.confidence_score}% (uncalibrated)
                    </p>
                    {result.estimated_penalty_inr > 0 && (
                      <div className="flex items-center gap-xs" style={{ marginTop: 8 }}>
                        <IndianRupee size={15} style={{ color: '#ef4444' }} />
                        <span style={{ fontSize: '0.875rem', color: '#f87171' }}>
                          Estimated Penalty: <strong>{formatINR(result.estimated_penalty_inr)}</strong>
                        </span>
                      </div>
                    )}
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
                      Next inspection: {result.next_inspection_date}
                    </p>
                  </div>
                </div>
              </div>

              {/* Professional Review Warning */}
              <div className="card mb-md" style={{ borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.04)' }}>
                <div className="flex items-center gap-xs mb-xs">
                  <ShieldAlert size={16} style={{ color: '#fbbf24' }} />
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fbbf24', margin: 0 }}>
                    Professional Review Required
                  </h4>
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  {result.professional_review_warning}
                </p>
                {result.uncertainty_notes?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <RecommendationList items={result.uncertainty_notes} title="Uncertainty" />
                  </div>
                )}
              </div>

              {/* PPE Compliance */}
              <div className="card mb-md">
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>PPE Compliance Status</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                  {Object.entries(result.ppe_compliance || {}).map(([key, compliant]) => (
                    <div key={key} className="card-glass flex items-center gap-sm" style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{ppeIcons[key] || '🔒'}</span>
                      <div>
                        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: compliant ? '#10b981' : '#ef4444' }}>
                          {compliant ? '✓ Compliant' : '✗ Non-compliant'}
                        </p>
                      </div>
                      {compliant
                        ? <CheckCircle size={16} style={{ marginLeft: 'auto', color: '#10b981', flexShrink: 0 }} />
                        : <XCircle size={16} style={{ marginLeft: 'auto', color: '#ef4444', flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Violations */}
              {result.violations?.length > 0 && (
                <div className="card mb-md">
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>
                    <AlertTriangle size={14} style={{ marginRight: 6, color: '#f59e0b' }} />
                    Violations ({result.violations.length})
                  </h4>
                  {result.violations.map((v, i) => (
                    <div key={i} className="card-glass mb-sm" style={{
                      borderLeft: `3px solid ${v.severity === 'high' || v.severity === 'critical' ? '#ef4444' : '#f59e0b'}`,
                    }}>
                      <div className="flex items-center justify-between mb-xs">
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {v.violation_type}
                        </span>
                        <span className={`badge badge-${v.severity}`}>{v.severity}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                        📍 {v.location_in_image}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#fed7aa', marginBottom: 4 }}>
                        🔧 {v.corrective_action}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Ref: {v.regulatory_reference}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Immediate Actions */}
              {result.immediate_actions_required?.length > 0 && (
                <div className="card mb-md" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12, color: '#f87171' }}>
                    🚨 Immediate Actions Required
                  </h4>
                  <RecommendationList items={result.immediate_actions_required} title="" />
                </div>
              )}

              {result.recommendations?.length > 0 && (
                <div className="card">
                  <RecommendationList items={result.recommendations} title="Recommendations" />
                </div>
              )}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="card empty-state">
              <Shield size={52} className="empty-state-icon" />
              <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>No inspection yet</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Upload a site image to run AI safety inspection
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
