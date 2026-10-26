import React, { useState } from 'react';
import type { AuditState } from './types';
import { HomePage } from './pages/HomePage';
import { AuditPage } from './pages/AuditPage';
import { ReportPage } from './pages/ReportPage';
import { Navbar } from './components/Navbar';

type ViewMode = 'home' | 'audit' | 'report';

const initialAuditState: AuditState = {
  repositoryUrl: '',
  inspection: null,
  claims: [],
  report: null,
  progress: {
    stage: 'inspecting',
    message: '',
  },
  error: null,
};

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [auditState, setAuditState] = useState<AuditState>(initialAuditState);

  const handleStartAudit = (state: AuditState) => {
    setAuditState(state);
    setCurrentView('audit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCompleteAudit = () => {
    setCurrentView('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetToHome = () => {
    setAuditState(initialAuditState);
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentRepoName = auditState.inspection?.repository?.fullName || null;

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex flex-col font-sans selection:bg-[#58a6ff]/30 selection:text-[#58a6ff]">
      {/* Navigation Header */}
      <Navbar
        currentRepo={currentRepoName}
        onReset={handleResetToHome}
        showReset={currentView !== 'home'}
      />

      {/* Main Page Content */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage onStartAudit={handleStartAudit} />
        )}

        {currentView === 'audit' && (
          <AuditPage
            auditState={auditState}
            setAuditState={setAuditState}
            onComplete={handleCompleteAudit}
            onBack={handleResetToHome}
          />
        )}

        {currentView === 'report' && (
          <ReportPage
            auditState={auditState}
            onBack={handleResetToHome}
          />
        )}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-[#30363d] bg-[#0d1117] py-6 text-center text-xs text-[#8b949e]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#e6edf3]">RepoReality</span>
            <span>&bull;</span>
            <span>Automated Technical Claim Verification</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Powered by Google Gemma</span>
            <span>&bull;</span>
            <span className="text-[#3fb950]">Static Analysis Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
