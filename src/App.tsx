/**
 * SmartCare - Hospital, Diagnostic Service & Blood Requirement Management System
 * Comprehensive Digital Healthcare Management Application
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Department,
  Doctor,
  DiagnosticService,
  Appointment,
  QueueState,
  DoctorQueueState,
  FeedbackItem,
  UserSession,
  BloodRequest,
  BloodStockItem,
} from './types';
import {
  initLocalStorage,
  getDepartments,
  getDoctors,
  getDiagnostics,
  getAppointments,
  getQueues,
  getDoctorQueues,
  getFeedbacks,
  getSession,
  setSession,
  syncFromServer,
  subscribeToQueueEvents,
} from './services/storageService';
import {
  getBloodStock,
  getMyBloodRequests,
  getAllBloodRequestsForAdmin,
  syncBloodBankFromServer,
} from './services/bloodRequestService';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { DepartmentsPage } from './components/DepartmentsPage';
import { DoctorsPage } from './components/DoctorsPage';
import { DoctorProfilePage } from './components/DoctorProfilePage';
import { DiagnosticsPage } from './components/DiagnosticsPage';
import { BloodBankPage } from './components/BloodBankPage';
import { QueueStatusPage } from './components/QueueStatusPage';
import { FeedbackPage } from './components/FeedbackPage';
import { EmergencyPage } from './components/EmergencyPage';
import { PatientDashboard } from './components/PatientDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AppointmentBookingModal } from './components/AppointmentBookingModal';
import { AuthModal } from './components/AuthModal';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { pageTransitionVariants } from './components/MotionPrimitives';

export default function App() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | undefined>(undefined);
  const [queueSearchToken, setQueueSearchToken] = useState<string | undefined>(undefined);
  const [queueTargetId, setQueueTargetId] = useState<string | undefined>(undefined);
  const [realtimeNotice, setRealtimeNotice] = useState<{ tokenNumber: number } | null>(null);

  // Data state loaded from Server + LocalStorage cache
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticService[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queues, setQueues] = useState<Record<string, QueueState>>({});
  const [doctorQueues, setDoctorQueues] = useState<Record<string, DoctorQueueState>>({});
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [session, setSessionState] = useState<UserSession | null>(null);
  const [bloodStock, setBloodStock] = useState<BloodStockItem[]>([]);
  const [myBloodRequests, setMyBloodRequests] = useState<BloodRequest[]>([]);
  const [adminBloodRequests, setAdminBloodRequests] = useState<BloodRequest[]>([]);

  // Modals state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Preselected booking options
  const [preselectedDoctor, setPreselectedDoctor] = useState<Doctor | null>(null);
  const [preselectedDiagnostic, setPreselectedDiagnostic] = useState<DiagnosticService | null>(null);
  const [preselectedDeptName, setPreselectedDeptName] = useState<string | undefined>(undefined);

  // Load all data from cache
  const refreshData = () => {
    initLocalStorage();
    const currentSession = getSession();
    setDepartments(getDepartments());
    setDoctors(getDoctors());
    setDiagnostics(getDiagnostics());
    setAppointments(getAppointments());
    setQueues(getQueues());
    setDoctorQueues(getDoctorQueues());
    setFeedbacks(getFeedbacks());
    setSessionState(currentSession);
    setBloodStock(getBloodStock());
    setMyBloodRequests(getMyBloodRequests(currentSession));
    setAdminBloodRequests(getAllBloodRequestsForAdmin(currentSession));
  };

  useEffect(() => {
    refreshData();
    void syncFromServer().then((snap) => {
      if (snap) refreshData();
    });
    void syncBloodBankFromServer(getSession()).then((res) => {
      if (res) refreshData();
    });

    const unsubscribe = subscribeToQueueEvents((evt) => {
      if (evt.type?.startsWith('blood:')) {
        void syncBloodBankFromServer(getSession()).then(() => refreshData());
      } else {
        refreshData();
      }
      if (evt.type === 'token:called') {
        const currentSession = getSession();
        const isCalledForMe =
          currentSession &&
          currentSession.role === 'patient' &&
          ((evt.phone && evt.phone === currentSession.phone) ||
            (evt.patientName &&
              evt.patientName.toLowerCase() === currentSession.name.toLowerCase()));
        if (isCalledForMe) {
          setRealtimeNotice({ tokenNumber: Number(evt.tokenNumber) });
          setTimeout(() => setRealtimeNotice(null), 8000);
        }
      }
    });

    // Check hash route on mount
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    if (hash) {
      if (hash.startsWith('doctor/')) {
        const docId = hash.replace('doctor/', '');
        setSelectedDoctorId(docId);
        setActiveTab('doctor-profile');
      } else if (
        [
          'home',
          'departments',
          'doctors',
          'diagnostics',
          'blood-bank',
          'appointments',
          'queue',
          'feedback',
          'emergency',
          'dashboard',
          'admin',
        ].includes(hash)
      ) {
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
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      unsubscribe();
    };
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
    if (state?.targetId) {
      setQueueTargetId(state.targetId);
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

  const handleTrackQueueFromBooking = (token: number, targetId?: string) => {
    setQueueSearchToken(String(token));
    if (targetId) setQueueTargetId(targetId);
    handleNavigate('queue', { searchToken: String(token), targetId });
  };

  const handleDoctorProfileSelect = (doctorId: string) => {
    setSelectedDoctorId(doctorId);
    handleNavigate('doctor-profile');
  };

  const handleLogout = () => {
    setSession(null);
    refreshData();
    if (activeTab === 'dashboard' || activeTab === 'admin') {
      handleNavigate('home');
    }
  };

  const handleGiveFeedback = (apptId: string) => {
    handleNavigate('feedback');
  };

  const currentProfileDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  const viewKey = activeTab === 'doctor-profile' ? `doctor-profile-${selectedDoctorId || 'default'}` : activeTab;

  return (
    <MotionConfig reducedMotion="user">
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

        {/* Real-Time Global Patient Token-Called Toast */}
        <AnimatePresence>
          {realtimeNotice && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="fixed top-20 right-4 sm:right-6 z-50 max-w-md bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-400 flex items-center justify-between gap-4 text-xs font-bold"
            >
              <span>{t('app.tokenCalledToast', { token: realtimeNotice.tokenNumber })}</span>
              <button
                onClick={() => setRealtimeNotice(null)}
                className="text-emerald-100 hover:text-white underline cursor-pointer shrink-0"
              >
                {t('common.dismiss')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main View Container with Smooth Apple-Inspired Page Transition */}
        <main className="flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={viewKey}
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
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

        {activeTab === 'blood-bank' && (
          <BloodBankPage
            bloodStock={bloodStock}
            mySubmittedRequests={myBloodRequests}
            adminRequests={adminBloodRequests}
            session={session}
            onRefreshBloodData={refreshData}
          />
        )}

        {activeTab === 'appointments' && (
          <div className="py-10 animate-page-enter">
            <div className="max-w-4xl mx-auto px-4 text-center space-y-4 mb-8">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
                {t('app.apptEyebrow')}
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {t('app.apptTitle')}
              </h1>
              <p className="text-sm text-slate-600 max-w-xl mx-auto">
                {t('app.apptSubtitle')}
              </p>
              <button
                onClick={handleQuickBook}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                {t('app.openBookingForm')}
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
            doctors={doctors}
            appointments={appointments}
            doctorQueues={doctorQueues}
            session={session}
            initialSearchToken={queueSearchToken}
            initialTargetId={queueTargetId}
            onNavigateBooking={handleQuickBook}
            onQueueUpdated={refreshData}
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
            doctorQueues={doctorQueues}
            onTrackQueue={(token, targetId) => {
              setQueueSearchToken(String(token));
              if (targetId) setQueueTargetId(targetId);
              handleNavigate('queue', { searchToken: String(token), targetId });
            }}
            onBookNew={handleQuickBook}
            onGiveFeedback={handleGiveFeedback}
            onRefreshData={refreshData}
          />
        )}

        {activeTab === 'admin' && (
          session?.role === 'admin' ? (
            <AdminDashboard
              session={session}
              departments={departments}
              doctors={doctors}
              diagnostics={diagnostics}
              appointments={appointments}
              queues={queues}
              doctorQueues={doctorQueues}
              feedbacks={feedbacks}
              bloodStock={bloodStock}
              bloodRequests={adminBloodRequests}
              onOpenAuth={() => setIsAuthOpen(true)}
              onRefreshAll={refreshData}
            />
          ) : (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-page-enter">
              <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-10 text-center space-y-5 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-50 text-rose-700 text-[11px] font-bold uppercase tracking-wider">
                    <Lock className="w-3 h-3" />
                    {t('app.accessDeniedBadge')}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {t('app.adminRestrictedTitle')}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                    {session?.role === 'patient'
                      ? t('app.adminDeniedPatient', { name: session.name })
                      : t('app.adminDeniedGuest')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => handleNavigate(session?.role === 'patient' ? 'dashboard' : 'home')}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>
                      {session?.role === 'patient' ? t('app.backToPatientDash') : t('app.returnHome')}
                    </span>
                  </button>

                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {t('app.signInAsAdmin')}
                  </button>
                </div>
              </div>
            </div>
          )
        )}
            </motion.div>
          </AnimatePresence>
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
          refreshData();
          if (activeTab === 'blood-bank') {
            return;
          }
          if (newSession.role === 'admin') {
            handleNavigate('admin');
          } else {
            handleNavigate('dashboard');
          }
        }}
      />
      </div>
    </MotionConfig>
  );
}
