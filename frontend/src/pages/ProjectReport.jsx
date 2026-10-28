import React, { useState } from 'react';
import { FileText, Download, Activity, CheckCircle, Clock, AlertTriangle, RotateCcw } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { RiskCard, RecommendationList, ErrorStateCard, EmptyAssessmentNotice, SampleDataBadge, LoadingStateBox } from '../components/ResultCards';
import { generateReport, formatINR, formatINRCompact } from '../api';
import toast from 'react-hot-toast';

const statusColors = {
  'On Track': '#10b981',
  'Delayed': '#ef4444',
  'At Risk': '#f59e0b',
  'Completed': '#3b82f6',
};

export default function ProjectReport() {
  const [form, setForm] = useState({
    project_name: 'Skyline Commercial Complex',
    project_type: 'Commercial',
    location: 'Hyderabad, Telangana',
    start_date: '2024-01-15',
    planned_end_date: '2025-09-30',
    total_budget_inr: 50000000,
    spent_inr: 28000000,
    current_progress_percent: 55,
    current_phase: 'MEP',
    team_size: 120,
    key_issues: 'Steel price escalation, monsoon delays in foundation phase',
    achievements: 'Structure completed ahead of schedule, zero LTI incidents',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleGenerate = async () => {
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await generateReport({
        ...form,
        total_budget_inr: Number(form.total_budget_inr),
        spent_inr: Number(form.spent_inr),
        current_progress_percent: Number(form.current_progress_percent),
        team_size: Number(form.team_size),
      });
      const data = res.data;
      const hasAssessmentData = data && (
        (data.executive_summary && data.executive_summary.trim().length > 0) ||
        (data.financial_summary && data.financial_summary.total_budget_inr > 0) ||
        (Array.isArray(data.milestones) && data.milestones.length > 0)
      );

      setResult(data);
      if (hasAssessmentData) {
        toast.success('Report generated!');
      } else {
        toast('Report returned no detailed executive metrics', { icon: '⚠️' });
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Report generation failed.';
      setError(detail);
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const hasAssessmentData = result && (
    (result.executive_summary && result.executive_summary.trim().length > 0) ||
    (result.financial_summary && result.financial_summary.total_budget_inr > 0) ||
    (Array.isArray(result.milestones) && result.milestones.length > 0)
  );

  const radarData = result?.kpis ? Object.entries(result.kpis).map(([key, val]) => ({
    subject: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    A: parseInt(val) || 0,
    fullMark: 100,
  })) : [];

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-sm mb-sm">
          <FileText size={24} style={{ color: 'var(--color-accent-orange)' }} />
          <h1 className="page-title" style={{ marginBottom: 0 }}>Project Report</h1>
        </div>
        <p className="page-subtitle">AI-generated executive project status report with KPIs, financial summary, and risk register.</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="flex items-center justify-between mb-sm" style={{ flexWrap: 'wrap', gap: 6 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Report Parameters</h3>
            <SampleDataBadge label="Sample Project Data" />
          </div>

          <div className="form-group">
            <label htmlFor="report-proj-name" className="form-label">Project Name</label>
            <input
              id="report-proj-name"
              className="form-control"
              value={form.project_name}
              onChange={e => set('project_name', e.target.value)}
            />
          </div>

          <div className="grid-2" style={{ gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label htmlFor="report-proj-type" className="form-label">Project Type</label>
              <select
                id="report-proj-type"
                className="form-control"
                value={form.project_type}
                onChange={e => set('project_type', e.target.value)}
              >
                {['Residential', 'Commercial', 'Industrial', 'Infrastructure', 'Mixed-Use'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="report-location" className="form-label">Location</label>
              <input
                id="report-location"
                className="form-control"
                value={form.location}
                onChange={e => set('location', e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label htmlFor="report-start-date" className="form-label">Start Date</label>
              <input
                id="report-start-date"
                className="form-control"
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="report-end-date" className="form-label">Planned End Date</label>
              <input
                id="report-end-date"
                className="form-control"
                type="date"
                value={form.planned_end_date}
                onChange={e => set('planned_end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label htmlFor="report-budget" className="form-label">Total Budget (₹ INR)</label>
              <input
                id="report-budget"
                className="form-control"
                type="number"
                value={form.total_budget_inr}
                onChange={e => set('total_budget_inr', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="report-spent" className="form-label">Spent Till Date (₹ INR)</label>
              <input
                id="report-spent"
                className="form-control"
                type="number"
                value={form.spent_inr}
                onChange={e => set('spent_inr', e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label htmlFor="report-progress-input" className="form-label">Progress (%)</label>
              <input
                id="report-progress-input"
                className="form-control"
                type="number"
                min={0}
                max={100}
                value={form.current_progress_percent}
                onChange={e => set('current_progress_percent', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="report-team-size" className="form-label">Team Size</label>
              <input
                id="report-team-size"
                className="form-control"
                type="number"
                value={form.team_size}
                onChange={e => set('team_size', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="report-phase-select" className="form-label">Current Phase</label>
            <select
              id="report-phase-select"
              className="form-control"
              value={form.current_phase}
              onChange={e => set('current_phase', e.target.value)}
            >
              {['Site Preparation', 'Foundation', 'Structure', 'MEP', 'Finishing', 'External Works'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="report-key-issues" className="form-label">Key Issues</label>
            <textarea
              id="report-key-issues"
              className="form-control"
              rows={2}
              value={form.key_issues}
              onChange={e => set('key_issues', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="report-achievements" className="form-label">Achievements</label>
            <textarea
              id="report-achievements"
              className="form-control"
              rows={2}
              value={form.achievements}
              onChange={e => set('achievements', e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary w-full"
            onClick={handleGenerate}
            disabled={loading}
            id="generate-report-btn"
          >
            {loading ? (
              <>
                <div className="spinner spinner-sm" />
                <span>Generating Executive Report</span>
                <span className="loading-dots" />
              </>
            ) : (
              <>
                <FileText size={16} />
                <span>Generate Report</span>
              </>
            )}
          </button>
        </div>

        <div>
          {loading && (
            <LoadingStateBox
              title="AI generating executive report"
              subtitle="Synthesizing financial metrics, milestones, and risk register"
            />
          )}

          {error && !loading && (
            <ErrorStateCard
              title="Report Generation Failed"
              message={error}
              onRetry={handleGenerate}
            />
          )}

          {result && !loading && !hasAssessmentData && (
            <EmptyAssessmentNotice
              title="Report Inconclusive — Empty Data"
              message="Empty data is not presented as a successful assessment. No executive milestones or financial summary data were generated. Please check your project parameters and retry."
              onRetry={handleGenerate}
            />
          )}

          {result && !loading && hasAssessmentData && (
            <div className="result-panel">
              {/* Header */}
              <div className="card mb-md" style={{
                background: 'linear-gradient(135deg, rgba(15,27,51,0.95) 0%, rgba(249,115,22,0.12) 100%)',
                borderColor: 'rgba(249,115,22,0.3)',
              }}>
                <div className="flex items-center justify-between mb-sm" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{result.project_name}</h3>
                  <span className="badge" style={{
                    background: `${(statusColors[result.overall_health] || '#f97316')}22`,
                    color: statusColors[result.overall_health] || '#fb923c',
                    border: `1px solid ${(statusColors[result.overall_health] || '#f97316')}40`,
                    fontSize: '0.8rem', padding: '4px 12px',
                  }}>
                    {result.overall_health}
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  {result.executive_summary}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
                  Report Date: {result.report_date}
                </p>
              </div>

              {/* KPI Radar */}
              {radarData.length > 0 && (
                <div className="card mb-md">
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>KPI Performance Radar</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Radar name="KPIs" dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.25} />
                      <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, color: '#f0f6ff' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Financial Summary */}
              {result.financial_summary && (
                <div className="card mb-md">
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Financial Summary (₹ INR)</h4>
                  <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    {[
                      { key: 'total_budget_inr', label: 'Total Budget', color: 'blue' },
                      { key: 'spent_inr', label: 'Spent Till Date', color: 'amber' },
                      { key: 'remaining_inr', label: 'Remaining Budget', color: 'green' },
                      { key: 'projected_overrun_inr', label: 'Proj. Overrun', color: 'red' },
                    ].map(({ key, label, color }) => (
                      <div key={key} className={`stat-card ${color}`} style={{ padding: '14px' }}>
                        <div className="stat-label">{label}</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                          {formatINRCompact(result.financial_summary[key] || 0)}
                        </div>
                        <div className="stat-sub inr">{formatINR(result.financial_summary[key] || 0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestones */}
              {result.milestones?.length > 0 && (
                <div className="card mb-md">
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Milestones</h4>
                  {result.milestones.map((m, i) => (
                    <div key={i} className="flex gap-sm mb-sm" style={{ alignItems: 'flex-start' }}>
                      <div style={{ marginTop: 2 }}>
                        {m.status === 'completed'
                          ? <CheckCircle size={16} style={{ color: '#10b981' }} />
                          : m.status === 'delayed'
                          ? <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                          : <Clock size={16} style={{ color: '#94a3b8' }} />}
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{m.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Planned: {m.planned_date} {m.actual_date ? `· Actual: ${m.actual_date}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.risks?.length > 0 && (
                <div className="card mb-md">
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Risk Register</h4>
                  {result.risks.map((r, i) => <RiskCard key={i} risk={r} index={i} />)}
                </div>
              )}

              {result.action_items?.length > 0 && (
                <div className="card">
                  <RecommendationList items={result.action_items} title="Action Items" />
                </div>
              )}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="card empty-state">
              <FileText size={52} className="empty-state-icon" />
              <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>No report yet</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Fill in project details to generate an executive status report
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
