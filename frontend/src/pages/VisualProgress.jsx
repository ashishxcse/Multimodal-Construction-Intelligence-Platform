import React, { useState } from 'react';
import { Camera, Eye, BarChart2, Clock, RotateCcw, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ImageUploader from '../components/ImageUploader';
import ScoreGauge from '../components/ScoreGauge';
import { RecommendationList, ErrorStateCard, EmptyAssessmentNotice, SampleDataBadge, LoadingStateBox } from '../components/ResultCards';
import { visualProgress, formatINR, formatINRCompact } from '../api';
import toast from 'react-hot-toast';

export default function VisualProgress() {
  const [file, setFile] = useState(null);
  const [projectName, setProjectName] = useState('My Construction Project');
  const [budget, setBudget] = useState(10000000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!file) return toast.error('Please upload a site image.');
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await visualProgress(file, projectName, budget);
      const data = res.data;
      const hasAssessmentData = data && (
        (Array.isArray(data.phases) && data.phases.length > 0) ||
        (Array.isArray(data.key_observations) && data.key_observations.length > 0) ||
        (Array.isArray(data.recommendations) && data.recommendations.length > 0)
      );

      setResult(data);
      if (hasAssessmentData) {
        toast.success('Visual progress analysis complete!');
      } else {
        toast('Vision analysis returned no phase progress records', { icon: '⚠️' });
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Analysis failed.';
      setError(detail);
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const hasAssessmentData = result && (
    (Array.isArray(result.phases) && result.phases.length > 0) ||
    (Array.isArray(result.key_observations) && result.key_observations.length > 0) ||
    (Array.isArray(result.recommendations) && result.recommendations.length > 0)
  );

  const chartData = result?.phases?.map(p => ({
    name: p.phase_name.length > 12 ? p.phase_name.substring(0, 12) + '…' : p.phase_name,
    Planned: p.planned_percent,
    Actual: p.actual_percent,
  })) || [];

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-sm mb-sm">
          <Camera size={24} style={{ color: 'var(--color-accent-orange)' }} />
          <h1 className="page-title" style={{ marginBottom: 0 }}>Visual Progress Analysis</h1>
        </div>
        <p className="page-subtitle">Upload a site photo — AI estimates construction progress, phase completion, and resource utilization from the image.</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div>
          <div className="card mb-md">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Upload Site Photo</h3>
            <ImageUploader onFileSelect={(f) => { setFile(f); setError(null); }} label="Drop your site progress photo here" />
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-sm" style={{ flexWrap: 'wrap', gap: 6 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Project Context</h3>
              <SampleDataBadge label="Sample Budget Template" />
            </div>

            <div className="form-group">
              <label htmlFor="vp-project-name" className="form-label">Project Name</label>
              <input
                id="vp-project-name"
                className="form-control"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="vp-budget-input" className="form-label">Total Budget (₹ INR)</label>
              <input
                id="vp-budget-input"
                className="form-control"
                type="number"
                value={budget}
                onChange={e => setBudget(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary w-full"
              onClick={handleAnalyze}
              disabled={!file || loading}
              id="analyze-visual-progress-btn"
            >
              {loading ? (
                <>
                  <div className="spinner spinner-sm" />
                  <span>Analyzing Image</span>
                  <span className="loading-dots" />
                </>
              ) : (
                <>
                  <Camera size={16} />
                  <span>Analyze Progress</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div>
          {loading && (
            <LoadingStateBox
              title="Vision AI analyzing construction progress"
              subtitle="Using Groq Llama-4 Scout multimodal model"
            />
          )}

          {error && !loading && (
            <ErrorStateCard
              title="Visual Progress Analysis Failed"
              message={error}
              onRetry={handleAnalyze}
            />
          )}

          {result && !loading && !hasAssessmentData && (
            <EmptyAssessmentNotice
              title="Visual Progress Inconclusive — Empty Data"
              message="Empty data is not presented as a successful assessment. No construction elements or phase milestones were detected in the provided photo. Please provide a clear, unobstructed site photo."
              onRetry={handleAnalyze}
            />
          )}

          {result && !loading && hasAssessmentData && (
            <div className="result-panel">
              <div className="card mb-md">
                <div className="flex items-center gap-lg" style={{ flexWrap: 'wrap' }}>
                  <ScoreGauge score={result.overall_progress_percent} label="Overall Progress" color="#f97316" />
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div className="stat-grid mb-sm" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      <div>
                        <p className="stat-label">Schedule Variance</p>
                        <p className="stat-value" style={{ fontSize: '1.25rem', color: result.schedule_variance_days > 0 ? '#ef4444' : '#10b981' }}>
                          {result.schedule_variance_days > 0 ? '+' : ''}{result.schedule_variance_days}d
                        </p>
                      </div>
                      <div>
                        <p className="stat-label">Resources Used</p>
                        <p className="stat-value" style={{ fontSize: '1.25rem' }}>{result.resource_utilization_percent?.toFixed(0)}%</p>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      <Clock size={12} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />
                      Projected: {result.projected_completion_date}
                    </p>
                  </div>
                </div>
              </div>

              {chartData.length > 0 && (
                <div className="card mb-md">
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 16 }}>Phase Completion Analysis</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" />
                      <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, color: '#f0f6ff' }} />
                      <Bar dataKey="Planned" fill="rgba(249,115,22,0.35)" radius={[4,4,0,0]} />
                      <Bar dataKey="Actual" fill="#f97316" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Budget estimate in INR */}
              {(result.budget_utilized_inr > 0 || result.budget_remaining_inr > 0) && (
                <div className="card mb-md">
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Budget Estimate from Image (₹ INR)</h4>
                  <div className="grid-2" style={{ gap: 'var(--spacing-md)' }}>
                    <div className="card-glass">
                      <p className="stat-label">Utilized (est.)</p>
                      <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fed7aa' }} className="inr">
                        {formatINRCompact(result.budget_utilized_inr)}
                      </p>
                    </div>
                    <div className="card-glass">
                      <p className="stat-label">Remaining (est.)</p>
                      <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#34d399' }} className="inr">
                        {formatINRCompact(result.budget_remaining_inr)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {result.key_observations?.length > 0 && (
                <div className="card mb-md">
                  <RecommendationList items={result.key_observations} title="👁️ Key Visual Observations" />
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
              <Camera size={52} className="empty-state-icon" />
              <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>No visual analysis yet</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Upload a site photo to detect construction progress with AI
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
