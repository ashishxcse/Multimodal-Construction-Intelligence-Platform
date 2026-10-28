import React, { useState } from 'react';
import { Package, RotateCcw, AlertTriangle, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RecommendationList, ErrorStateCard, EmptyAssessmentNotice, SampleDataBadge, LoadingStateBox } from '../components/ResultCards';
import { analyzeMaterials, formatINR, formatINRCompact, formatQuantity } from '../api';
import toast from 'react-hot-toast';

export default function MaterialAnalysis() {
  const [form, setForm] = useState({
    project_type: 'Residential',
    built_up_area_sqft: 1500,
    location: 'Bengaluru, Karnataka',
    quality_grade: 'Standard',
    construction_type: 'RCC Frame Structure',
    special_materials: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleAnalyze = async () => {
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await analyzeMaterials({
        ...form,
        built_up_area_sqft: Number(form.built_up_area_sqft),
      });
      const data = res.data;
      const hasAssessmentData = data && (
        Array.isArray(data.materials) &&
        data.materials.length > 0 &&
        data.total_material_cost_inr > 0
      );

      setResult(data);
      if (hasAssessmentData) {
        toast.success('Material analysis ready!');
      } else {
        toast('BOQ returned no itemized materials', { icon: '⚠️' });
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
    Array.isArray(result.materials) &&
    result.materials.length > 0 &&
    result.total_material_cost_inr > 0
  );

  const chartData = result?.materials?.slice(0, 8).map(m => ({
    name: m.name.length > 14 ? m.name.substring(0, 14) + '…' : m.name,
    cost: m.total_cost_inr,
  })) || [];

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-sm mb-sm">
          <Package size={24} style={{ color: 'var(--color-accent-orange)' }} />
          <h1 className="page-title" style={{ marginBottom: 0 }}>Material Analysis</h1>
        </div>
        <p className="page-subtitle">AI-generated Bill of Quantities (BOQ) with current Indian market prices in ₹ INR.</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="flex items-center justify-between mb-sm" style={{ flexWrap: 'wrap', gap: 6 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Project Parameters</h3>
            <SampleDataBadge label="Sample BOQ Parameters" />
          </div>

          <div className="form-group">
            <label htmlFor="mat-project-type" className="form-label">Project Type</label>
            <select
              id="mat-project-type"
              className="form-control"
              value={form.project_type}
              onChange={e => set('project_type', e.target.value)}
            >
              {['Residential', 'Commercial', 'Industrial', 'Institutional'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="mat-area-input" className="form-label">Built-up Area (sq.ft)</label>
            <input
              id="mat-area-input"
              className="form-control"
              type="number"
              value={form.built_up_area_sqft}
              onChange={e => set('built_up_area_sqft', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="mat-location-input" className="form-label">Location</label>
            <input
              id="mat-location-input"
              className="form-control"
              placeholder="e.g., Bengaluru, Karnataka"
              value={form.location}
              onChange={e => set('location', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="mat-construction-type" className="form-label">Construction Type</label>
            <select
              id="mat-construction-type"
              className="form-control"
              value={form.construction_type}
              onChange={e => set('construction_type', e.target.value)}
            >
              {['RCC Frame Structure', 'Load Bearing Structure', 'Steel Frame', 'Prefabricated', 'Green Building'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="mat-quality-grade" className="form-label">Quality Grade</label>
            <select
              id="mat-quality-grade"
              className="form-control"
              value={form.quality_grade}
              onChange={e => set('quality_grade', e.target.value)}
            >
              {['Economy', 'Standard', 'Premium', 'Luxury'].map(q => <option key={q}>{q}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="mat-special-materials" className="form-label">Special Materials (Optional)</label>
            <textarea
              id="mat-special-materials"
              className="form-control"
              rows={2}
              placeholder="e.g., AAC blocks, fly ash bricks, UPVC windows..."
              value={form.special_materials}
              onChange={e => set('special_materials', e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary w-full"
            onClick={handleAnalyze}
            disabled={loading}
            id="analyze-material-btn"
          >
            {loading ? (
              <>
                <div className="spinner spinner-sm" />
                <span>Generating BOQ</span>
                <span className="loading-dots" />
              </>
            ) : (
              <>
                <Package size={16} />
                <span>Generate BOQ</span>
              </>
            )}
          </button>
        </div>

        <div>
          {loading && (
            <LoadingStateBox
              title="Generating Bill of Quantities"
              subtitle={`Preparing indicative estimates for ${form.location} in ₹ INR`}
            />
          )}

          {error && !loading && (
            <ErrorStateCard
              title="Material Analysis Failed"
              message={error}
              onRetry={handleAnalyze}
            />
          )}

          {result && !loading && !hasAssessmentData && (
            <EmptyAssessmentNotice
              title="BOQ Generation Inconclusive — Empty Data"
              message="Empty data is not presented as a successful assessment. No itemized materials or cost breakdown were produced for these parameters. Please check your specifications and retry."
              onRetry={handleAnalyze}
            />
          )}

          {result && !loading && hasAssessmentData && (
            <div className="result-panel">
              {/* Summary */}
              <div className="stat-grid mb-md" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="stat-card amber">
                  <div className="stat-label">Total Material Cost</div>
                  <div className="stat-value" style={{ fontSize: '1.45rem' }}>{formatINRCompact(result.total_material_cost_inr)}</div>
                  <div className="stat-sub inr">{formatINR(result.total_material_cost_inr)}</div>
                </div>
                <div className="stat-card blue">
                  <div className="stat-label">Wastage Factor</div>
                  <div className="stat-value" style={{ fontSize: '1.45rem' }}>{result.wastage_factor_percent}%</div>
                  <div className="stat-sub">included in estimate</div>
                </div>
                <div className="stat-card green">
                  <div className="stat-label">Materials Listed</div>
                  <div className="stat-value" style={{ fontSize: '1.45rem' }}>{result.materials?.length || 0}</div>
                  <div className="stat-sub">line items in BOQ</div>
                </div>
                <div className="stat-card purple">
                  <div className="stat-label">Procurement Timeline</div>
                  <div className="stat-value" style={{ fontSize: '1.45rem' }}>{result.procurement_timeline_days}</div>
                  <div className="stat-sub">days estimated</div>
                </div>
              </div>

              <div className="card mb-md">
                <div className="flex items-center gap-xs mb-xs" style={{ flexWrap: 'wrap' }}>
                  <span className="badge badge-warning">Indicative BOQ</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    {result.estimate_source}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 10 }}>
                  Indicative values only. Confirm quantities with project drawings and rates with local suppliers.
                  Line and grand totals are calculated from quantity and unit rate; no live price feed is connected.
                </p>
                <RecommendationList items={result.assumptions} title="BOQ assumptions" />
              </div>

              {/* Bar Chart */}
              {chartData.length > 0 && (
                <div className="card mb-md">
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 16 }}>Top Materials by Cost (₹ INR)</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => formatINRCompact(v)} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={105} />
                      <Tooltip formatter={v => formatINR(v)} contentStyle={{ background: '#0a1628', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, color: '#f0f6ff' }} />
                      <Bar dataKey="cost" fill="#f97316" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Materials Table */}
              <div className="card mb-md">
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Bill of Quantities</h4>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th>Grade</th>
                        <th>Rate (₹)</th>
                        <th style={{ textAlign: 'right' }}>Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.materials?.map((m, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{m.name}</td>
                          <td className="inr">{formatQuantity(m.quantity_required)}</td>
                          <td>
                            <span className="badge badge-info" style={{ textTransform: 'none', fontSize: '0.72rem' }}>
                              {m.unit}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-medium" style={{ fontSize: '0.65rem' }}>{m.quality_grade}</span>
                          </td>
                          <td className="inr">{formatINR(m.unit_cost_inr)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#fed7aa' }} className="inr">
                            {formatINR(m.total_cost_inr)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {result.cost_optimization_tips?.length > 0 && (
                <div className="card mb-md">
                  <RecommendationList items={result.cost_optimization_tips} title="💡 Cost Optimization Tips" />
                </div>
              )}
              {result.recommendations?.length > 0 && (
                <div className="card">
                  <RecommendationList items={result.recommendations} title="Procurement Recommendations" />
                </div>
              )}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="card empty-state">
              <Package size={52} className="empty-state-icon" />
              <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>No BOQ yet</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Fill in parameters and generate your Bill of Quantities in ₹ INR
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
