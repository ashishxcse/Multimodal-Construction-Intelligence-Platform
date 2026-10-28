import React, { useState } from 'react';
import { IndianRupee, TrendingUp, Clock, AlertTriangle, Sparkles, RotateCcw } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { RiskCard, RecommendationList, ErrorStateCard, EmptyAssessmentNotice, SampleDataBadge, LoadingStateBox } from '../components/ResultCards';
import { estimateCost, formatINR, formatINRCompact, formatQuantity } from '../api';
import toast from 'react-hot-toast';

const COLORS = ['#ea580c', '#f97316', '#f59e0b', '#3b82f6', '#10b981', '#06b6d4', '#8b5cf6'];

const CUSTOM_TOOLTIP = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="card" style={{ padding: '8px 12px', minWidth: 150 }}>
        <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.8rem' }}>{payload[0].name}</p>
        <p style={{ color: '#fed7aa', fontSize: '0.875rem', fontWeight: 600 }}>{formatINR(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function CostEstimation() {
  const [form, setForm] = useState({
    project_type: 'Residential',
    location: 'Mumbai, Maharashtra',
    built_up_area_sqft: 1500,
    floors: 2,
    quality_standard: 'Standard',
    special_requirements: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleEstimate = async () => {
    if (!form.built_up_area_sqft || form.built_up_area_sqft < 1) {
      return toast.error('Please enter a valid built-up area.');
    }
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await estimateCost({
        ...form,
        built_up_area_sqft: Number(form.built_up_area_sqft),
        floors: Number(form.floors),
      });
      const data = res.data;
      const hasAssessmentData = data && (
        Array.isArray(data.cost_breakdown) &&
        data.cost_breakdown.length > 0 &&
        data.total_estimated_cost_inr > 0
      );

      setResult(data);
      if (hasAssessmentData) {
        toast.success('Cost estimation ready!');
      } else {
        toast('Estimation returned no itemized line items', { icon: '⚠️' });
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Estimation failed.';
      setError(detail);
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const hasAssessmentData = result && (
    Array.isArray(result.cost_breakdown) &&
    result.cost_breakdown.length > 0 &&
    result.total_estimated_cost_inr > 0
  );

  const pieData = result?.cost_breakdown?.map(item => ({
    name: item.label,
    value: item.amount_inr,
  })) || [];

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-sm mb-sm">
          <IndianRupee size={24} style={{ color: 'var(--color-accent-orange)' }} />
          <h1 className="page-title" style={{ marginBottom: 0 }}>Cost Estimation</h1>
        </div>
        <p className="page-subtitle">AI-generated detailed cost estimation with itemized Bill of Quantities (BOQ) in Indian Rupees (₹ INR).</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Form */}
        <div className="card">
          <div className="flex items-center justify-between mb-sm" style={{ flexWrap: 'wrap', gap: 6 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Project Details</h3>
            <SampleDataBadge label="Sample Project Template" />
          </div>

          <div className="form-group">
            <label htmlFor="project-type-select" className="form-label">Project Type</label>
            <select
              id="project-type-select"
              className="form-control"
              value={form.project_type}
              onChange={e => set('project_type', e.target.value)}
            >
              {['Residential', 'Commercial', 'Industrial', 'Institutional', 'Mixed-Use', 'Infrastructure'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="location-input" className="form-label">Location</label>
            <input
              id="location-input"
              className="form-control"
              placeholder="e.g., Mumbai, Maharashtra"
              value={form.location}
              onChange={e => set('location', e.target.value)}
            />
          </div>

          <div className="grid-2" style={{ gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label htmlFor="area-input" className="form-label">Built-up Area (sq.ft)</label>
              <input
                id="area-input"
                className="form-control"
                type="number"
                min={100}
                value={form.built_up_area_sqft}
                onChange={e => set('built_up_area_sqft', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="floors-input" className="form-label">Number of Floors</label>
              <input
                id="floors-input"
                className="form-control"
                type="number"
                min={1}
                max={50}
                value={form.floors}
                onChange={e => set('floors', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="quality-select" className="form-label">Quality Standard</label>
            <select
              id="quality-select"
              className="form-control"
              value={form.quality_standard}
              onChange={e => set('quality_standard', e.target.value)}
            >
              {['Economy', 'Standard', 'Premium', 'Luxury'].map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="special-requirements-input" className="form-label">Special Requirements (Optional)</label>
            <textarea
              id="special-requirements-input"
              className="form-control"
              rows={3}
              placeholder="e.g., Earthquake resistant design, rainwater harvesting, solar panels..."
              value={form.special_requirements}
              onChange={e => set('special_requirements', e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary w-full"
            onClick={handleEstimate}
            disabled={loading}
            id="estimate-cost-btn"
          >
            {loading ? (
              <>
                <div className="spinner spinner-sm" />
                <span>Estimating in ₹ INR</span>
                <span className="loading-dots" />
              </>
            ) : (
              <>
                <TrendingUp size={16} />
                <span>Generate Estimate</span>
              </>
            )}
          </button>
        </div>

        {/* Results */}
        <div>
          {loading && (
            <LoadingStateBox
              title={`Calculating costs for ${form.location}`}
              subtitle="Analyzing indicative rates and line-item quantities in INR"
            />
          )}

          {error && !loading && (
            <ErrorStateCard
              title="Cost Estimation Failed"
              message={error}
              onRetry={handleEstimate}
            />
          )}

          {result && !loading && !hasAssessmentData && (
            <EmptyAssessmentNotice
              title="Estimation Inconclusive — Empty Breakdown"
              message="Empty data is not presented as a successful assessment. No itemized line items or cost values were produced for the given parameters. Please check your area and parameters, then retry."
              onRetry={handleEstimate}
            />
          )}

          {result && !loading && hasAssessmentData && (
            <div className="result-panel">
              {/* Summary Cards */}
              <div className="stat-grid mb-md" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="stat-card amber">
                  <div className="stat-label">Total Estimated Cost</div>
                  <div className="stat-value" style={{ fontSize: '1.45rem' }}>{formatINRCompact(result.total_estimated_cost_inr)}</div>
                  <div className="stat-sub inr">{formatINR(result.total_estimated_cost_inr)}</div>
                </div>
                <div className="stat-card blue">
                  <div className="stat-label">Rate per Sq.ft</div>
                  <div className="stat-value" style={{ fontSize: '1.45rem' }}>{formatINR(result.cost_per_sqft_inr)}</div>
                  <div className="stat-sub">per sq.ft built-up</div>
                </div>
                <div className="stat-card green">
                  <div className="stat-label">Timeline</div>
                  <div className="stat-value" style={{ fontSize: '1.45rem' }}>{result.timeline_months}</div>
                  <div className="stat-sub">months estimated</div>
                </div>
                <div className="stat-card purple">
                  <div className="stat-label">Confidence</div>
                  <div className="stat-value" style={{ fontSize: '1.45rem' }}>{result.confidence_score}%</div>
                  <div className="stat-sub">Model-reported, uncalibrated</div>
                </div>
              </div>

              {/* Estimate Source & Assumptions */}
              <div className="card mb-md">
                <div className="flex items-center gap-xs mb-xs" style={{ flexWrap: 'wrap' }}>
                  <span className="badge badge-warning">Indicative Estimate</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    {result.estimate_source}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                  Indicative values only. Verify quantities and rates with a qualified quantity surveyor and local suppliers.
                  Line and grand totals are calculated from the quantities and unit rates below.
                </p>
                <RecommendationList items={result.assumptions} title="Estimate assumptions" />
              </div>

              {/* Pie Chart & BOQ Table */}
              {pieData.length > 0 && (
                <div className="card mb-md">
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 16 }}>Cost Breakdown</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CUSTOM_TOOLTIP />} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Unit</th>
                          <th>Rate (₹)</th>
                          <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.cost_breakdown.map((item, i) => (
                          <tr key={i}>
                            <td>
                              <div className="flex items-center gap-sm">
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                                <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{item.label}</span>
                              </div>
                            </td>
                            <td className="inr">{formatQuantity(item.quantity)}</td>
                            <td>
                              <span className="badge badge-info" style={{ textTransform: 'none', fontSize: '0.72rem' }}>
                                {item.unit}
                              </span>
                            </td>
                            <td className="inr">{formatINR(item.unit_rate_inr)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#fed7aa' }} className="inr">
                              {formatINR(item.amount_inr)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Risks & Recs */}
              {result.risks?.length > 0 && (
                <div className="card mb-md">
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Financial Risks</h4>
                  {result.risks.map((r, i) => <RiskCard key={i} risk={r} index={i} />)}
                </div>
              )}
              {result.recommendations?.length > 0 && (
                <div className="card">
                  <RecommendationList items={result.recommendations} title="Cost Optimization Recommendations" />
                </div>
              )}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="card empty-state">
              <IndianRupee size={52} className="empty-state-icon" />
              <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>No estimate yet</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Fill in the project details and click "Generate Estimate" to produce an INR BOQ
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
