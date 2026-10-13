import React from 'react';
import { Appointment, UserSession, QueueState } from '../types';
import { updateAppointmentStatus } from '../services/storageService';
import {
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Hourglass,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  XCircle,
  MessageSquare,
  Activity,
  Layers,
} from 'lucide-react';

interface PatientDashboardProps {
  session: UserSession;
  appointments: Appointment[];
  queues: Record<string, QueueState>;
  onTrackQueue: (token: number) => void;
  onBookNew: () => void;
  onGiveFeedback: (apptId: string) => void;
  onRefreshData: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  session,
  appointments,
  queues,
  onTrackQueue,
  onBookNew,
  onGiveFeedback,
  onRefreshData,
}) => {
  const patientAppts = appointments.filter(
    (a) =>
      a.phone === session.phone ||
      a.patientName.toLowerCase().includes(session.name.toLowerCase().split(' ')[0]) ||
      session.role === 'patient'
  );

  const upcoming = patientAppts.filter((a) => a.status === 'Confirmed' || a.status === 'In Consultation');
  const past = patientAppts.filter((a) => a.status === 'Completed' || a.status === 'Cancelled');
  const diagnosticBookings = patientAppts.filter((a) => a.serviceType === 'diagnostic');

  const handleCancelAppointment = (id: string) => {
    if (window.confirm('Are you sure you want to cancel this appointment slot?')) {
      updateAppointmentStatus(id, 'Cancelled');
      onRefreshData();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-page-enter">
      {/* Patient Welcome Hero Card */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg border border-teal-400/30">
            {session.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block">
              Patient Care Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
              Welcome, {session.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Registered Phone: <span className="font-mono text-slate-300">{session.phone}</span> · CarePlus Health Record
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBookNew}
            className="px-5 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md hover:shadow-teal-400/20 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Book New Appointment</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-xs card-hover-effect">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Upcoming Consultations
          </span>
          <div className="text-3xl font-extrabold font-mono text-teal-700">
            {upcoming.length}
          </div>
          <p className="text-[11px] text-slate-500">Confirmed outpatient appointments</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-xs card-hover-effect">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Active Digital Token
          </span>
          <div className="text-3xl font-extrabold font-mono text-slate-900">
            {upcoming.length > 0 ? `#${upcoming[0].tokenNumber}` : 'None'}
          </div>
          <p className="text-[11px] text-slate-500">
            {upcoming.length > 0 ? `${upcoming[0].departmentName}` : 'No active queue token'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-xs card-hover-effect">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Diagnostic Investigations
          </span>
          <div className="text-3xl font-extrabold font-mono text-cyan-700">
            {diagnosticBookings.length}
          </div>
          <p className="text-[11px] text-slate-500">Pathology &amp; Radiology bookings</p>
        </div>
      </div>

      {/* Active Token Callout Banner if patient has upcoming appointment */}
      {upcoming.length > 0 && (
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl p-5 border border-teal-700 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-800/90 flex items-center justify-center font-mono font-extrabold text-2xl text-teal-200 border border-teal-600/50 shadow-sm">
              #{upcoming[0].tokenNumber}
            </div>
            <div>
              <span className="text-[11px] text-teal-300 font-bold uppercase tracking-wider block">
                Today's Primary Active Token
              </span>
              <div className="text-base font-bold text-white">
                {upcoming[0].targetTitle} ({upcoming[0].departmentName})
              </div>
              <div className="text-xs text-teal-200">
                Window: {upcoming[0].timeSlot} · Date: {upcoming[0].date}
              </div>
            </div>
          </div>

          <button
            onClick={() => onTrackQueue(upcoming[0].tokenNumber)}
            className="px-5 py-2.5 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span>Open Waiting Lounge Display</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upcoming Appointments Timeline Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Upcoming Scheduled Appointments ({upcoming.length})
          </h2>
          <span className="text-xs text-slate-500">Live Hospital OPD records</span>
        </div>

        {upcoming.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {upcoming.map((appt) => (
              <div
                key={appt.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 card-hover-effect shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md">
                      {appt.serviceType === 'doctor' ? 'Doctor OPD Consultation' : 'Diagnostic Lab Test'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-2.5">
                      {appt.targetTitle}
                    </h3>
                    <p className="text-xs text-slate-500">{appt.departmentName}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">OPD Token</span>
                    <span className="text-2xl font-extrabold font-mono text-teal-700">
                      #{appt.tokenNumber}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Appointment ID:</span>
                    <span className="font-mono font-bold text-slate-800">{appt.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Date:</span>
                    <span className="font-medium text-slate-800">{appt.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Time Window:</span>
                    <span className="font-medium text-slate-800">{appt.timeSlot}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Patient:</span>
                    <span>
                      {appt.patientName} ({appt.age}y, {appt.gender})
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-400">Reason:</span>
                    <span className="text-slate-700 truncate max-w-[220px]">{appt.reason}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => onTrackQueue(appt.tokenNumber)}
                    className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Check Live Queue Position</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleCancelAppointment(appt.id)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    Cancel Booking
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">You currently have no active upcoming appointments.</p>
            <button
              onClick={onBookNew}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer underline"
            >
              Book your first consultation &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Consultation History Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Past Consultations &amp; Completed Visits ({past.length})
        </h2>

        {past.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Appointment ID</th>
                    <th className="py-3.5 px-4 font-bold">Doctor / Diagnostic</th>
                    <th className="py-3.5 px-4 font-bold">Date</th>
                    <th className="py-3.5 px-4 font-bold">Token #</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {past.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{a.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{a.targetTitle}</div>
                        <div className="text-[11px] text-slate-400">{a.departmentName}</div>
                      </td>
                      <td className="py-3.5 px-4">{a.date}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-700">#{a.tokenNumber}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            a.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onGiveFeedback(a.id)}
                          className="text-xs text-teal-700 hover:text-teal-800 font-bold cursor-pointer inline-flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Leave Feedback</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
            No past visits recorded yet.
          </div>
        )}
      </div>
    </div>
  );
};
