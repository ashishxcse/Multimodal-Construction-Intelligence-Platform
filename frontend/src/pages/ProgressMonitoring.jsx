import React, { useState } from 'react';
import { BarChart2, Calendar, TrendingUp, IndianRupee, RotateCcw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { RecommendationList, ErrorStateCard, EmptyAssessmentNotice, SampleDataBadge, LoadingStateBox } from '../components/ResultCards';
import { monitorProgress, formatINR, formatINRCompact } from '../api';
import toast from 'react-hot-toast';

export default function ProgressMonitoring() {
  const [form, setForm] = useState({
    project_name: 'Shree Residency Tower A',
    start_date: '2024-03-01',
    planned_end_date: '2025-06-30',
    total_budget_inr: 25000000,
    spent_so_far_inr: 12000000,
    current_phase: 'Structure',
    completed_phases: ['Site Preparation', 'Foundation'],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const togglePhase = (phase) => {
    set('completed_phases', form.completed_phases.includes(phase)
      ? form.completed_phases.filter(p => p !== phase)
      : [...form.completed_phases, phase]);
  };

  const phases = ['Site Preparation', 'Foundation', 'Structure', 'MEP', 'Finishing', 'External Works'];

  const handleMonitor = async () => {
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await monitorProgress({
        ...form,
        total_budget_inr: Number(form.total_budget_inr),
        spent_so_far_inr: Number(form.spent_so_far_inr),
      });
      const data = res.data;
      const hasAssessmentData = data && (
        Array.isArray(data.phases) &&
        data.phases.length > 0 &&
        typeof data.overall_progress_percent === 'number'
      );

      setResult(data);
      if (hasAssessmentData) {
        toast.success('Progress analysis complete!');
      } else {
        toast('Analysis returned no phase progress records', { icon: '⚠️' });
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
    Array.isArray(result.phases) &&
    result.phases.length > 0 &&
    typeof result.overall_progress_percent === 'number'
  );

  const chartData = result?.phases?.map(p => ({
    name: p.phase_name.length > 12 ? p.phase_name.substring(0, 12) + '…' : p.phase_name,
    Planned: p.planned_percent,
    Actual: p.actual_percent,
    status: p.status,
  })) || [];

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-sm mb-sm">
          <BarChart2 size={24} style={{ color: 'var(--color-accent-orange)' }} />
          <h1 className="page-title" style={{ marginBottom: 0 }}>Progress Monitoring</h1>
        </div>
        <p className="page-subtitle">AI-powered schedule variance analysis, Earned Value Management (EVM), and phase-by-phase progress evaluation.</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="flex items-center justify-between mb-sm" style={{ flexWrap: 'wrap', gap: 6 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Project Information</h3>
            <SampleDataBadge label="Sample Project Data" />
          </div>

          <div className="form-group">
            <label htmlFor="proj-name-input" className="form-label">Project Name</label>
            <input
              id="proj-name-input"
              className="form-control"
              value={form.project_name}
              onChange={e => set('project_name', e.target.value)}
            />
          </div>

          <div className="grid-2" style={{ gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label htmlFor="start-date-input" className="form-label">Start Date</label>
              <input
                id="start-date-input"
                className="form-control"
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="end-date-input" className="form-label">Planned End Date</label>
              <input
                id="end-date-input"
                className="form-control"
                type="date"
                value={form.planned_end_date}
                onChange={e => set('planned_end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label htmlFor="budget-input" className="form-label">Total Budget (₹ INR)</label>
              <input
                id="budget-input"
                className="form-control"
                type="number"
                value={form.total_budget_inr}
                onChange={e => set('total_budget_inr', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="spent-input" className="form-label">Spent So Far (₹ INR)</label>
              <input
                id="spent-input"
                className="form-control"
                type="number"
                value={form.spent_so_far_inr}
                onChange={e => set('spent_so_far_inr', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phase-select" className="form-label">Current Phase</label>
            <select
              id="phase-select"
              className="form-control"
              value={form.current_phase}
              onChange={e => set('current_phase', e.target.value)}
            >
              {phases.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Completed Phases</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {phases.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePhase(p)}
                  className={`badge ${form.completed_phases.includes(p) ? 'badge-success' : 'badge-info'}`}
                  style={{ cursor: 'pointer', padding: '6px 12px', border: 'none' }}
                  aria-pressed={form.completed_phases.includes(p)}
                >
                  {form.completed_phases.includes(p) ? '✓ ' : ''}{p}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="progress-notes-input" className="form-label">Notes / Issues</label>
            <textarea
              id="progress-notes-input"
              className="form-control"
              rows={3}
              placeholder="Any key issues, delays, or observations..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary w-full"
            onClick={handleMonitor}
            disabled={loading}
            id="analyze-progress-btn"
          >
            {loading ? (
              <>
                <div className="spinner spinner-sm" />
                <span>Analyzing EVM</span>
                <span className="loading-dots" />
              </>
            ) : (
              <>
                <BarChart2 size={16} />
                <span>Analyze Progress</span>
              </>
            )}
          </button>
        </div>

        <div>
          {loading && (
            <LoadingStateBox
              title="AI analyzing project progress"
              subtitle="Calculating schedule variance and Earned Value Management"
            />
          )}

          {error && !loading && (
            <ErrorStateCard
              title="Progress Analysis Failed"
              message={error}
              onRetry={handleMonitor}
            />
          )}

          {result && !loading && !hasAssessmentData && (
            <EmptyAssessmentNotice
              title="Progress Analysis Inconclusive — Empty Data"
              message="Empty data is not presented as a successful assessment. No phase timeline or variance measurements were produced. Please review project milestones and dates, then retry."
              onRetry={handleMonitor}
            />
          )}

          {result && !loading && hasAssessmentData && (
            <div className="result-panel">
              {/* KPI Cards */}
              <div className="stat-grid mb-md" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="stat-card amber">
                  <div className="stat-label">Overall Progress</div>
                  <div className="stat-value">{result.overall_progress_percent?.toFixed(0)}%</div>
                  <div style={{ marginTop: 6 }}>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.max(0, result.overall_progress_percent))}%` }} />
                    </div>
                  </div>
                </div>
                <div className={`stat-card ${result.schedule_variance_days > 0 ? 'red' : 'green'}`}>
                  <div className="stat-label">Schedule Variance</div>
                  <div className="stat-value">{result.schedule_variance_days > 0 ? '+' : ''}{result.schedule_variance_days}</div>
                  <div className="stat-sub">days {result.schedule_variance_days > 0 ? 'delayed' : 'ahead'}</div>
                </div>
                <div className="stat-card blue">
                  <div className="stat-label">Budget Utilized</div>
                  <div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatINRCompact(result.budget_utilized_inr)}</div>
                  <div className="stat-sub">Remaining: {formatINRCompact(result.budget_remaining_inr)}</div>
                </div>
                <div className="stat-card green">
                  <div className="stat-label">Resource Utilization</div>
                  <div className="stat-value">{result.resource_utilization_percent?.toFixed(0)}%</div>
                  <div className="stat-sub">Projected: {result.projected_completion_date}</div>
                </div>
              </div>

              {/* Chart */}
              {chartData.length > 0 && (
                <div className="card mb-md">
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 16 }}>Phase Progress (Planned vs Actual)</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" />
                      <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, color: '#f0f6ff' }} />
                      <Legend />
                      <Bar dataKey="Planned" fill="rgba(249,115,22,0.35)" radius={[4,4,0,0]} />
                      <Bar dataKey="Actual" fill="#f97316" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Phase Table */}
              <div className="card mb-md">
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Phase Status Breakdown</h4>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Phase</th>
                        <th>Status</th>
                        <th>Planned</th>
                        <th>Actual</th>
                        <th>Delay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.phases?.map((p, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{p.phase_name}</td>
                          <td>
                            <span className={`badge badge-${p.status === 'completed' ? 'success' : p.status === 'in_progress' ? 'info' : p.status === 'delayed' ? 'critical' : 'medium'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="inr">{p.planned_percent}%</td>
                          <td style={{ color: p.actual_percent >= p.planned_percent ? '#10b981' : '#f59e0b', fontWeight: 600 }} className="inr">
                            {p.actual_percent}%
                          </td>
                          <td style={{ color: p.delay_days > 0 ? '#ef4444' : '#10b981' }} className="inr">
                            {p.delay_days > 0 ? `+${p.delay_days}d` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {result.recommendations?.length > 0 && (
                <div className="card">
                  <RecommendationList items={result.recommendations} title="AI Progress Recommendations" />
                </div>
              )}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="card empty-state">
              <BarChart2 size={52} className="empty-state-icon" />
              <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>No analysis yet</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Fill in project milestone data and analyze progress
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
