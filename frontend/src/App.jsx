import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Menu, HardHat } from 'lucide-react';

import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SiteAnalysis from './pages/SiteAnalysis';
import SafetyInspection from './pages/SafetyInspection';
import CostEstimation from './pages/CostEstimation';
import ProgressMonitoring from './pages/ProgressMonitoring';
import MaterialAnalysis from './pages/MaterialAnalysis';
import ProjectReport from './pages/ProjectReport';
import AIChat from './pages/AIChat';
import VisualProgress from './pages/VisualProgress';
import { checkHealth } from './api';

export default function App() {
  const [aiOnline, setAiOnline] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkHealth()
      .then(r => setAiOnline(r.data?.ai_available === true))
      .catch(() => setAiOnline(false));
  }, []);

  return (
    <BrowserRouter>
      <div className="app-shell">
        {/* Mobile Header */}
        <header className="mobile-header">
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-xs">
            <div className="sidebar-logo-icon" style={{ width: 28, height: 28 }}>
              <HardHat size={16} color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)' }}>ConstructAI</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className={`status-dot ${aiOnline ? '' : 'offline'}`} title={aiOnline ? 'AI Online' : 'AI Offline'} />
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{aiOnline ? 'AI Online' : 'Offline'}</span>
          </div>
        </header>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <Sidebar
          aiOnline={aiOnline}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/site-analysis" element={<SiteAnalysis />} />
            <Route path="/safety-inspection" element={<SafetyInspection />} />
            <Route path="/cost-estimation" element={<CostEstimation />} />
            <Route path="/progress-monitoring" element={<ProgressMonitoring />} />
            <Route path="/material-analysis" element={<MaterialAnalysis />} />
            <Route path="/project-report" element={<ProjectReport />} />
            <Route path="/chat" element={<AIChat />} />
            <Route path="/visual-progress" element={<VisualProgress />} />
          </Routes>
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0a1628',
            color: '#f0f6ff',
            border: '1px solid rgba(249, 115, 22, 0.3)',
            borderRadius: '10px',
            fontSize: '0.875rem',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  );
}
