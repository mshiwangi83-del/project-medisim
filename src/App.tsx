/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { PatientDashboard } from './components/PatientPortal/PatientDashboard';
import { JuniorDoctorDashboard } from './components/JuniorDoctorPortal/JuniorDoctorDashboard';
import { DoctorDashboard } from './components/DoctorPortal/DoctorDashboard';
import { IntegrationsModal } from './components/Config/IntegrationsModal';
import { DashvidhaConfigModal } from './components/Config/DashvidhaConfigModal';
import { UserRole } from './types';
import { Activity } from 'lucide-react';

function MainApp() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  const [selectedRoleForAuth, setSelectedRoleForAuth] = useState<UserRole | null>(null);
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false);
  const [showDashvidhaConfigModal, setShowDashvidhaConfigModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center mx-auto shadow-md animate-pulse">
            <Activity className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-700">
            Initializing Hospital System...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900 flex flex-col justify-between">
      {/* Top Navigation */}
      <Header
        onOpenIntegrations={() => setShowIntegrationsModal(true)}
        onOpenDashvidhaConfig={() => setShowDashvidhaConfigModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {!user ? (
          <LandingPage
            onSelectRole={(role) => setSelectedRoleForAuth(role)}
            onOpenIntegrations={() => setShowIntegrationsModal(true)}
          />
        ) : user.role === 'patient' ? (
          <PatientDashboard />
        ) : user.role === 'junior_doctor' ? (
          <JuniorDoctorDashboard />
        ) : user.role === 'doctor' ? (
          <DoctorDashboard />
        ) : (
          <div className="p-8 text-center text-rose-600">Unrecognized user role</div>
        )}
      </main>

      {/* Auth Modal */}
      {selectedRoleForAuth && (
        <AuthModal
          role={selectedRoleForAuth}
          onClose={() => setSelectedRoleForAuth(null)}
        />
      )}

      {/* Integrations Modal */}
      {showIntegrationsModal && (
        <IntegrationsModal onClose={() => setShowIntegrationsModal(false)} />
      )}

      {/* Dashvidha Config Modal */}
      {showDashvidhaConfigModal && (
        <DashvidhaConfigModal onClose={() => setShowDashvidhaConfigModal(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </LanguageProvider>
  );
}
