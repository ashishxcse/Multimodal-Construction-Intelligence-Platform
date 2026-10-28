import React, { useState } from 'react';
import { MapPin, Eye, AlertTriangle, ShieldCheck, RotateCcw } from 'lucide-react';
import ImageUploader from '../components/ImageUploader';
import ScoreGauge from '../components/ScoreGauge';
import { RiskCard, RecommendationList, TagList, ErrorStateCard, EmptyAssessmentNotice, LoadingStateBox } from '../components/ResultCards';
import { analyzeSite } from '../api';
import toast from 'react-hot-toast';

export default function SiteAnalysis() {
  const [file, setFile] = useState(null);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!file) return toast.error('Please upload a site image first.');
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await analyzeSite(file, context);
      const data = res.data;
      const hasAssessmentData = data && (
        (data.summary && data.summary.trim().length > 0) ||
        (Array.isArray(data.detected_elements) && data.detected_elements.length > 0) ||
        (Array.isArray(data.structural_findings) && data.structural_findings.length > 0) ||
        (Array.isArray(data.risks) && data.risks.length > 0)
      );

      setResult(data);
      if (hasAssessmentData) {
        toast.success('Site analysis complete!');
      } else {
        toast('Analysis returned no conclusive findings', { icon: '⚠️' });
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Analysis failed. Check if the backend is running.';
      setError(detail);
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const hasAssessmentData = result && (
    (result.summary && result.summary.trim().length > 0) ||
    (Array.isArray(result.detected_elements) && result.detected_elements.length > 0) ||
    (Array.isArray(result.structural_findings) && result.structural_findings.length > 0) ||
    (Array.isArray(result.risks) && result.risks.length > 0)
  );

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-sm mb-sm">
          <MapPin size={24} style={{ color: 'var(--color-accent-orange)' }} />
          <h1 className="page-title" style={{ marginBottom: 0 }}>Site Analysis</h1>
        </div>
        <p className="page-subtitle">Upload a construction site image for AI-powered condition assessment, risk identification, and actionable recommendations.</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Input Panel */}
        <div>
          <div className="card mb-md">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Upload Site Image</h3>
            <ImageUploader onFileSelect={(f) => { setFile(f); setError(null); }} label="Drop your site image here" />
          </div>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Additional Context</h3>
            <div className="form-group">
              <label htmlFor="site-notes-input" className="form-label">
                Site Description / Notes (Optional)
              </label>
              <textarea
                id="site-notes-input"
                className="form-control chat-input"
                rows={4}
                placeholder="e.g., 5-storey RCC building under construction in Mumbai. Currently at plinth level. 50 workers on site..."
                value={context}
                onChange={e => setContext(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary w-full"
              onClick={handleAnalyze}
              disabled={!file || loading}
              id="analyze-site-btn"
            >
              {loading ? (
                <>
                  <div className="spinner spinner-sm" />
                  <span>Analyzing with AI</span>
                  <span className="loading-dots" />
                </>
              ) : (
                <>
                  <Eye size={16} />
                  <span>Analyze Site</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div>
          {loading && (
            <LoadingStateBox
              title="AI is analyzing your site image"
              subtitle="Using Groq Llama-4 Scout multimodal model"
            />
          )}

          {error && !loading && (
            <ErrorStateCard
              title="Site Analysis Failed"
              message={error}
              onRetry={handleAnalyze}
            />
          )}

          {result && !loading && !hasAssessmentData && (
            <EmptyAssessmentNotice
              title="Assessment Inconclusive — Empty Data"
              message="Empty data is not presented as a successful assessment. No construction elements, distress indicators, or valid items were detected in the provided image. Please upload a clearer site image or provide additional context."
              onRetry={handleAnalyze}
            />
          )}

          {result && !loading && hasAssessmentData && (
            <div className="result-panel">
              {/* Score + Summary */}
              <div className="card mb-md">
                <div className="flex items-center gap-lg" style={{ flexWrap: 'wrap' }}>
                  <ScoreGauge score={result.infrastructure_readiness_score} label="Readiness Score" />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div className="flex items-center gap-sm mb-sm" style={{ flexWrap: 'wrap' }}>
                      <span className={`badge ${
                        result.risk_level === 'low' ? 'badge-low' :
                        result.risk_level === 'high' ? 'badge-high' :
                        result.risk_level === 'critical' ? 'badge-critical' : 'badge-medium'
                      }`}>
                        {result.risk_level} risk
                      </span>
                      <span className="badge badge-info">{result.site_condition}</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                      {result.summary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Professional Review Warning */}
              <div className="card mb-md" style={{ borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.04)' }}>
                <div className="flex items-center gap-xs mb-xs">
                  <ShieldCheck size={16} style={{ color: '#fbbf24' }} />
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fbbf24', margin: 0 }}>
                    Professional Review Required
                  </h4>
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  {result.professional_review_warning}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
                  Model-reported confidence: {result.confidence_score}% (uncalibrated)
                </p>
                {result.uncertainty_notes?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <RecommendationList items={result.uncertainty_notes} title="Uncertainty Notes" />
                  </div>
                )}
              </div>

              {/* Structural Findings */}
              {result.structural_findings?.length > 0 && (
                <div className="card mb-md">
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Visible Structural Findings</h4>
                  {result.structural_findings.map((finding, index) => (
                    <div key={index} className="card-glass mb-sm">
                      <div className="flex items-center justify-between mb-sm">
                        <span className={`badge badge-${finding.risk_level}`}>{finding.risk_level} risk</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Model confidence: {finding.confidence_score}% (uncalibrated)
                        </span>
                      </div>
                      <p style={{ fontSize: '0.875rem', marginBottom: 6, fontWeight: 500 }}>{finding.finding}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                        <strong>Location:</strong> {finding.location}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                        <strong>Corrective action:</strong> {finding.recommended_action}
                      </p>
                      {finding.uncertainty_notes?.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <RecommendationList items={finding.uncertainty_notes} title="Uncertainty" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {result.structural_findings?.length === 0 && (
                <div className="card mb-md" style={{ borderColor: 'rgba(245,158,11,0.35)' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    No visible structural findings were returned. This image-based screening can miss defects and does not establish that the structure is crack-free.
                  </p>
                </div>
              )}

              {/* Detected Elements */}
              <div className="card mb-md">
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>
                  <Eye size={14} style={{ marginRight: 6, color: 'var(--color-accent-orange)' }} />
                  Detected Elements
                </h4>
                <TagList items={result.detected_elements} />

                {result.safety_concerns?.length > 0 && (
                  <>
                    <div className="divider" />
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>
                      <AlertTriangle size={14} style={{ marginRight: 6, color: '#f59e0b' }} />
                      Safety Concerns
                    </h4>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {result.safety_concerns.map((c, i) => (
                        <li key={i} className="flex gap-sm" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                          <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 3 }} />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* Risks */}
              {result.risks?.length > 0 && (
                <div className="card mb-md">
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Risk Register</h4>
                  {result.risks.map((r, i) => <RiskCard key={i} risk={r} index={i} />)}
                </div>
              )}

              {/* Recommendations */}
              {result.recommended_actions?.length > 0 && (
                <div className="card">
                  <RecommendationList items={result.recommended_actions} title="Recommended Actions" />
                </div>
              )}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="card empty-state">
              <MapPin size={52} className="empty-state-icon" />
              <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>No analysis yet</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Upload a site image and click "Analyze Site" to begin AI inspection
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
