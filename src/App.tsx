/**
 * CarePlus Hospital - Doctor & Diagnostic Service Management System
 * Comprehensive Digital Hospital Management Application
 */

import React, { useState, useEffect } from 'react';
import {
  Department,
  Doctor,
  DiagnosticService,
  Appointment,
  QueueState,
  FeedbackItem,
  UserSession,
} from './types';
import {
  initLocalStorage,
  getDepartments,
  getDoctors,
  getDiagnostics,
  getAppointments,
  getQueues,
  getFeedbacks,
  getSession,
  setSession,
} from './services/storageService';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { DepartmentsPage } from './components/DepartmentsPage';
import { DoctorsPage } from './components/DoctorsPage';
import { DoctorProfilePage } from './components/DoctorProfilePage';
import { DiagnosticsPage } from './components/DiagnosticsPage';
import { QueueStatusPage } from './components/QueueStatusPage';
import { FeedbackPage } from './components/FeedbackPage';
import { EmergencyPage } from './components/EmergencyPage';
import { PatientDashboard } from './components/PatientDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AppointmentBookingModal } from './components/AppointmentBookingModal';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | undefined>(undefined);
  const [queueSearchToken, setQueueSearchToken] = useState<string | undefined>(undefined);

  // Data state loaded from LocalStorage
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticService[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queues, setQueues] = useState<Record<string, QueueState>>({});
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [session, setSessionState] = useState<UserSession | null>(null);

  // Modals state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Preselected booking options
  const [preselectedDoctor, setPreselectedDoctor] = useState<Doctor | null>(null);
  const [preselectedDiagnostic, setPreselectedDiagnostic] = useState<DiagnosticService | null>(null);
  const [preselectedDeptName, setPreselectedDeptName] = useState<string | undefined>(undefined);

  // Load all data on mount
  const refreshData = () => {
    initLocalStorage();
    setDepartments(getDepartments());
    setDoctors(getDoctors());
    setDiagnostics(getDiagnostics());
    setAppointments(getAppointments());
    setQueues(getQueues());
    setFeedbacks(getFeedbacks());
    setSessionState(getSession());
  };

  useEffect(() => {
    refreshData();

    // Check hash route on mount
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    if (hash) {
      if (hash.startsWith('doctor/')) {
        const docId = hash.replace('doctor/', '');
        setSelectedDoctorId(docId);
        setActiveTab('doctor-profile');
      } else if (['home', 'departments', 'doctors', 'diagnostics', 'appointments', 'queue', 'feedback', 'emergency', 'dashboard', 'admin'].includes(hash)) {
        setActiveTab(hash);
      }
    }

    const handleHashChange = () => {
      const currentHash = window.location.hash.replace('#/', '').replace('#', '');
      if (currentHash.startsWith('doctor/')) {
        const docId = currentHash.replace('doctor/', '');
        setSelectedDoctorId(docId);
        setActiveTab('doctor-profile');
      } else if (currentHash) {
        setActiveTab(currentHash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (tab: string, state?: any) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (state?.departmentId) {
      setSelectedDepartmentId(state.departmentId);
    }
    if (state?.searchToken) {
      setQueueSearchToken(state.searchToken);
    }
    if (state?.doctorId) {
      setSelectedDoctorId(state.doctorId);
    }
  };

  const handleBookDoctor = (doc: Doctor) => {
    setPreselectedDoctor(doc);
    setPreselectedDiagnostic(null);
    setPreselectedDeptName(doc.departmentName);
    setIsBookingOpen(true);
  };

  const handleBookDiagnostic = (service: DiagnosticService) => {
    setPreselectedDiagnostic(service);
    setPreselectedDoctor(null);
    setPreselectedDeptName(service.category);
    setIsBookingOpen(true);
  };

  const handleQuickBook = () => {
    setPreselectedDoctor(null);
    setPreselectedDiagnostic(null);
    setPreselectedDeptName(undefined);
    setIsBookingOpen(true);
  };

  const handleTrackQueueFromBooking = (token: number) => {
    setQueueSearchToken(String(token));
    handleNavigate('queue');
  };

  const handleDoctorProfileSelect = (doctorId: string) => {
    setSelectedDoctorId(doctorId);
    handleNavigate('doctor-profile');
  };

  const handleLogout = () => {
    setSession(null);
    setSessionState(null);
    if (activeTab === 'dashboard' || activeTab === 'admin') {
      handleNavigate('home');
    }
  };

  const handleGiveFeedback = (apptId: string) => {
    handleNavigate('feedback');
  };

  const currentProfileDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Sticky Glass Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        session={session}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onQuickBook={handleQuickBook}
      />

      {/* Main View Container with Smooth Transition */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <HomePage
            departments={departments}
            doctors={doctors}
            diagnostics={diagnostics}
            queues={queues}
            onNavigate={handleNavigate}
            onBookDoctor={handleBookDoctor}
            onBookDiagnostic={handleBookDiagnostic}
          />
        )}

        {activeTab === 'departments' && (
          <DepartmentsPage
            departments={departments}
            doctors={doctors}
            queues={queues}
            onSelectDepartment={(deptId) => {
              setSelectedDepartmentId(deptId);
              handleNavigate('doctors', { departmentId: deptId });
            }}
            onBookAppointment={(deptName) => {
              setPreselectedDeptName(deptName);
              setPreselectedDoctor(null);
              setPreselectedDiagnostic(null);
              setIsBookingOpen(true);
            }}
          />
        )}

        {activeTab === 'doctors' && (
          <DoctorsPage
            departments={departments}
            doctors={doctors}
            selectedDepartmentId={selectedDepartmentId}
            onSelectDoctor={handleDoctorProfileSelect}
            onBookDoctor={handleBookDoctor}
          />
        )}

        {activeTab === 'doctor-profile' && currentProfileDoctor && (
          <DoctorProfilePage
            doctor={currentProfileDoctor}
            onBack={() => handleNavigate('doctors')}
            onBookAppointment={handleBookDoctor}
          />
        )}

        {activeTab === 'diagnostics' && (
          <DiagnosticsPage
            diagnostics={diagnostics}
            onBookService={handleBookDiagnostic}
          />
        )}

        {activeTab === 'appointments' && (
          <div className="py-10 animate-page-enter">
            <div className="max-w-4xl mx-auto px-4 text-center space-y-4 mb-8">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
                Direct OPD &amp; Lab Reservation
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Book a Consultation or Diagnostic Test
              </h1>
              <p className="text-sm text-slate-600 max-w-xl mx-auto">
                Select your preferred doctor, slot, and department. Instant token generation with live queue integration.
              </p>
              <button
                onClick={handleQuickBook}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                Open Booking Form &rarr;
              </button>
            </div>

            <DoctorsPage
              departments={departments}
              doctors={doctors}
              onSelectDoctor={handleDoctorProfileSelect}
              onBookDoctor={handleBookDoctor}
            />
          </div>
        )}

        {activeTab === 'queue' && (
          <QueueStatusPage
            departments={departments}
            initialSearchToken={queueSearchToken}
            onNavigateBooking={handleQuickBook}
          />
        )}

        {activeTab === 'feedback' && (
          <FeedbackPage departments={departments} />
        )}

        {activeTab === 'emergency' && (
          <EmergencyPage />
        )}

        {activeTab === 'dashboard' && (
          <PatientDashboard
            session={
              session || {
                id: 'demo-guest',
                name: 'Devendra Sharma',
                phone: '9876543210',
                role: 'patient',
              }
            }
            appointments={appointments}
            queues={queues}
            onTrackQueue={(token) => {
              setQueueSearchToken(String(token));
              handleNavigate('queue');
            }}
            onBookNew={handleQuickBook}
            onGiveFeedback={handleGiveFeedback}
            onRefreshData={refreshData}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            departments={departments}
            doctors={doctors}
            diagnostics={diagnostics}
            appointments={appointments}
            queues={queues}
            feedbacks={feedbacks}
            onRefreshAll={refreshData}
          />
        )}
      </main>

      {/* Modern Hospital Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Appointment Booking Modal */}
      <AppointmentBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        departments={departments}
        doctors={doctors}
        diagnostics={diagnostics}
        preselectedDoctor={preselectedDoctor}
        preselectedDiagnostic={preselectedDiagnostic}
        preselectedDepartmentName={preselectedDeptName}
        onBookingSuccess={() => {
          refreshData();
        }}
        onTrackQueue={handleTrackQueueFromBooking}
      />

      {/* Sign In / Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(newSession) => {
          setSessionState(newSession);
          if (newSession.role === 'admin') {
            handleNavigate('admin');
          } else {
            handleNavigate('dashboard');
          }
        }}
      />
    </div>
  );
}
