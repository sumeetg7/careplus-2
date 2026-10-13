import React, { useState } from 'react';
import {
  Department,
  Doctor,
  DiagnosticService,
  Appointment,
  QueueState,
  FeedbackItem,
} from '../types';
import {
  toggleDoctorAvailability,
  updateAppointmentStatus,
  advanceQueue,
  setServingToken,
  updateDiagnosticFee,
  toggleDiagnosticAvailability,
  addDoctor,
  resetDemoDatabase,
} from '../services/storageService';
import {
  Users,
  Calendar,
  Clock,
  Activity,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Edit2,
  DollarSign,
  MessageSquare,
  ShieldAlert,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface AdminDashboardProps {
  departments: Department[];
  doctors: Doctor[];
  diagnostics: DiagnosticService[];
  appointments: Appointment[];
  queues: Record<string, QueueState>;
  feedbacks: FeedbackItem[];
  onRefreshAll: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  departments,
  doctors,
  diagnostics,
  appointments,
  queues,
  feedbacks,
  onRefreshAll,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'appointments' | 'doctors' | 'diagnostics' | 'feedback'>('queue');

  // Add doctor modal state
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocQual, setNewDocQual] = useState('');
  const [newDocSpec, setNewDocSpec] = useState('');
  const [newDocDeptId, setNewDocDeptId] = useState(departments[0]?.id || 'dept-cardio');
  const [newDocFee, setNewDocFee] = useState('500');
  const [newDocExp, setNewDocExp] = useState('10');
  const [newDocTime, setNewDocTime] = useState('09:00 AM - 01:00 PM');
  const [newDocBio, setNewDocBio] = useState('');

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleToggleDoctor = (id: string) => {
    toggleDoctorAvailability(id);
    onRefreshAll();
    showToast('Doctor OPD availability updated.');
  };

  const handleAdvanceToken = (deptId: string) => {
    const updated = advanceQueue(deptId);
    onRefreshAll();
    showToast(`Token for ${updated.departmentName} advanced to #${updated.currentServingToken}.`);
  };

  const handleManualTokenChange = (deptId: string, current: number, delta: number) => {
    const nextVal = Math.max(1, current + delta);
    setServingToken(deptId, nextVal);
    onRefreshAll();
  };

  const handleStatusChange = (apptId: string, newStatus: Appointment['status']) => {
    updateAppointmentStatus(apptId, newStatus);
    onRefreshAll();
    showToast(`Appointment ${apptId} marked as ${newStatus}.`);
  };

  const handleEditFee = (diagId: string, currentFee: number) => {
    const input = prompt('Enter new approximate demo fee (₹):', String(currentFee));
    if (input && !isNaN(Number(input))) {
      updateDiagnosticFee(diagId, Number(input));
      onRefreshAll();
      showToast('Diagnostic fee updated.');
    }
  };

  const handleToggleDiagnostic = (id: string) => {
    toggleDiagnosticAvailability(id);
    onRefreshAll();
    showToast('Diagnostic service availability toggled.');
  };

  const handleCreateDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocSpec.trim()) return;

    const dept = departments.find((d) => d.id === newDocDeptId);

    addDoctor({
      name: newDocName.trim(),
      qualification: newDocQual.trim() || 'MBBS, MD',
      specialization: newDocSpec.trim(),
      departmentId: newDocDeptId,
      departmentName: dept?.name || 'General Medicine',
      experienceYears: Number(newDocExp) || 5,
      consultationFee: Number(newDocFee) || 500,
      availableDays: ['Monday', 'Wednesday', 'Friday'],
      availableTime: newDocTime,
      roomNumber: 'OPD Room 205',
      bio: newDocBio.trim() || 'Clinical specialist providing consultation at CarePlus Hospital.',
      photoUrl: '',
      isAvailableToday: true,
    });

    onRefreshAll();
    setShowAddDocModal(false);
    setNewDocName('');
    setNewDocSpec('');
    showToast('New doctor added to hospital directory.');
  };

  const handleResetDatabase = () => {
    if (window.confirm('Reset all demo data (appointments, queues, doctors, feedback) back to pristine factory demo state?')) {
      resetDemoDatabase();
      onRefreshAll();
      showToast('Hospital database reset to default records.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-page-enter">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header and Reset Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-mono uppercase tracking-wider font-bold">
              Hospital Admin Console
            </span>
            <span className="text-xs text-slate-500">CarePlus Operations Hub</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Central Administrative &amp; Queue Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage live OPD counters, appointments, consulting doctors, and diagnostic test rates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDatabase}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title="Reset database to default demo data for demonstration"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Demo DB</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-xs card-hover-effect">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Total Bookings
          </span>
          <div className="text-3xl font-extrabold font-mono text-slate-900">
            {appointments.length}
          </div>
          <span className="text-[11px] text-teal-600 font-semibold">Across all OPD &amp; Lab</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-xs card-hover-effect">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Active Doctors
          </span>
          <div className="text-3xl font-extrabold font-mono text-slate-900">
            {doctors.filter((d) => d.isAvailableToday).length} / {doctors.length}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">On duty in OPD today</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-xs card-hover-effect">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Live OPD Counters
          </span>
          <div className="text-3xl font-extrabold font-mono text-teal-700">
            {Object.keys(queues).length}
          </div>
          <span className="text-[11px] text-slate-500">Active counter queues</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-xs card-hover-effect">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Patient Feedback
          </span>
          <div className="text-3xl font-extrabold font-mono text-amber-600">
            {feedbacks.length}
          </div>
          <span className="text-[11px] text-slate-500">Verified visits logged</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'queue', label: 'Live Queue Manager' },
          { id: 'appointments', label: `Appointments (${appointments.length})` },
          { id: 'doctors', label: `Doctors Directory (${doctors.length})` },
          { id: 'diagnostics', label: `Diagnostics & Pricing (${diagnostics.length})` },
          { id: 'feedback', label: `Patient Feedback (${feedbacks.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: LIVE QUEUE MANAGER */}
      {activeTab === 'queue' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>
              <strong>OPD Counter Controller:</strong> Click <em>"Call Next Token"</em> to advance the patient queue for that OPD room. This immediately syncs with the patient queue tracking page.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => {
              const q = queues[dept.id] || {
                departmentId: dept.id,
                departmentName: dept.name,
                currentServingToken: 1,
                totalTokensToday: 10,
                estimatedMinutesPerPatient: 8,
                lastUpdated: 'Just now',
              };

              return (
                <div
                  key={dept.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs card-hover-effect"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{dept.name}</h3>
                      <p className="text-xs text-slate-500">{dept.roomNumber}</p>
                    </div>
                    <span className="text-xs font-mono bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-bold">
                      Total: {q.totalTokensToday}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center space-y-1">
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-bold">
                      Currently Calling
                    </span>
                    <div className="text-4xl font-extrabold font-mono text-teal-800">
                      #{q.currentServingToken}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Pace: ~{q.estimatedMinutesPerPatient} min/consult
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleManualTokenChange(dept.id, q.currentServingToken, -1)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                      title="Step back 1 token"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => handleAdvanceToken(dept.id)}
                      className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer text-center"
                    >
                      Call Next Token (#{q.currentServingToken + 1}) &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: APPOINTMENTS MANAGER */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs animate-in fade-in duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 font-bold">ID &amp; Token</th>
                  <th className="py-3.5 px-4 font-bold">Patient Details</th>
                  <th className="py-3.5 px-4 font-bold">Doctor / Service</th>
                  <th className="py-3.5 px-4 font-bold">Date &amp; Slot</th>
                  <th className="py-3.5 px-4 font-bold">Reason</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900">{a.id}</div>
                      <div className="text-teal-700 font-mono font-extrabold text-xs mt-0.5">
                        Token #{a.tokenNumber}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{a.patientName}</div>
                      <div className="text-[11px] text-slate-400">
                        {a.age}y, {a.gender} · {a.phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{a.targetTitle}</div>
                      <div className="text-[11px] text-slate-400">{a.departmentName}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{a.date}</div>
                      <div className="text-[11px] text-slate-400">{a.timeSlot}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-[180px] truncate" title={a.reason}>
                      {a.reason}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          a.status === 'Confirmed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : a.status === 'In Consultation'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : a.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <select
                        value={a.status}
                        onChange={(e) => handleStatusChange(a.id, e.target.value as any)}
                        className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-semibold focus:outline-none"
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="In Consultation">In Consultation</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DOCTORS MANAGER */}
      {activeTab === 'doctors' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900">
              Manage Consulting Faculty &amp; OPD Duty
            </h2>
            <button
              onClick={() => setShowAddDocModal(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Doctor</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs card-hover-effect"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{doc.name}</h3>
                    <p className="text-xs text-teal-700 font-semibold">{doc.specialization}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{doc.departmentName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Fee</span>
                    <span className="text-sm font-mono font-bold text-slate-900">
                      ₹{doc.consultationFee}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>Timings: {doc.availableTime}</div>
                  <div>Room: {doc.roomNumber}</div>
                  <div>Experience: {doc.experienceYears} Years</div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    OPD Duty: <strong>{doc.isAvailableToday ? 'Active' : 'Off-duty'}</strong>
                  </span>
                  <button
                    onClick={() => handleToggleDoctor(doc.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      doc.isAvailableToday
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {doc.isAvailableToday ? 'Set Off-duty' : 'Set Active Today'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DIAGNOSTICS MANAGER */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900">
              Diagnostic Services, Fees &amp; Lab Status
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {diagnostics.map((diag) => (
              <div
                key={diag.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs card-hover-effect"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded">
                      {diag.category}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{diag.name}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Fee</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      ₹{diag.approxFee}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>Duration: {diag.duration}</div>
                  <div>Report Turnaround: {diag.reportDeliveryTime}</div>
                  <div>Room: {diag.roomNumber}</div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleEditFee(diag.id, diag.approxFee)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Change Fee</span>
                  </button>

                  <button
                    onClick={() => handleToggleDiagnostic(diag.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      diag.isAvailableToday
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {diag.isAvailableToday ? 'Mark Maintenance' : 'Mark Available'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PATIENT FEEDBACK LIST */}
      {activeTab === 'feedback' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h2 className="text-base font-bold text-slate-900">
            Patient Feedback Logs
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedbacks.map((fb) => (
              <div
                key={fb.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-900">{fb.patientName}</strong>
                    <span className="text-slate-400 ml-1">· Token {fb.appointmentId}</span>
                  </div>
                  <span className="text-amber-500 font-bold">{fb.rating} / 5 ★</span>
                </div>
                <div className="text-[11px] text-teal-700 font-semibold">{fb.departmentName}</div>
                <p className="text-xs text-slate-700 italic">"{fb.comments}"</p>
                <div className="text-[10px] text-slate-400 text-right">{fb.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD DOCTOR MODAL */}
      {showAddDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Add New Consulting Doctor</h3>

            <form onSubmit={handleCreateDoctor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Siddharth Verma"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Department</label>
                <select
                  value={newDocDeptId}
                  onChange={(e) => setNewDocDeptId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qualification</label>
                  <input
                    type="text"
                    placeholder="e.g. MBBS, MD, DM"
                    value={newDocQual}
                    onChange={(e) => setNewDocQual(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pediatric Cardiology"
                    value={newDocSpec}
                    onChange={(e) => setNewDocSpec(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fee (₹)</label>
                  <input
                    type="number"
                    value={newDocFee}
                    onChange={(e) => setNewDocFee(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Exp (Years)</label>
                  <input
                    type="number"
                    value={newDocExp}
                    onChange={(e) => setNewDocExp(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hours</label>
                  <input
                    type="text"
                    value={newDocTime}
                    onChange={(e) => setNewDocTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Bio</label>
                <textarea
                  rows={2}
                  placeholder="Short clinical summary..."
                  value={newDocBio}
                  onChange={(e) => setNewDocBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 cursor-pointer shadow-xs"
                >
                  Save Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
