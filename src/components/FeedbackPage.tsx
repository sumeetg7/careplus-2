import React, { useState, useEffect } from 'react';
import { FeedbackItem, Department } from '../types';
import { getFeedbacks, addFeedback } from '../services/storageService';
import {
  Star,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Send,
  Sparkles,
  Filter,
} from 'lucide-react';

interface FeedbackPageProps {
  departments: Department[];
}

export const FeedbackPage: React.FC<FeedbackPageProps> = ({ departments }) => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [name, setName] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [deptName, setDeptName] = useState('Cardiology');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comments, setComments] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  useEffect(() => {
    setFeedbacks(getFeedbacks());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !comments.trim()) return;

    addFeedback({
      patientName: name.trim(),
      appointmentId: appointmentId.trim() || `CP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      departmentName: deptName,
      rating,
      comments: comments.trim(),
    });

    setFeedbacks(getFeedbacks());
    setName('');
    setAppointmentId('');
    setComments('');
    setRating(5);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 4000);
  };

  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (filterRating === 'all') return true;
    return fb.rating === filterRating;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-page-enter">
      {/* Header */}
      <div className="space-y-2 pb-6 border-b border-slate-200">
        <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
          Patient Experience
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Patient Feedback &amp; Clinical Reviews
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
          Help us continually refine patient care and outpatient coordination. All feedback associated with valid appointment tokens is marked with a verified hospital patient badge.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Feedback Form */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5 sticky top-24">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Submit Consultation Feedback
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Share your experience regarding doctor punctuality, staff care, or wait times.
              </p>
            </div>

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Thank you! Your feedback has been verified and logged.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunita Rao"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Appointment ID (e.g. CP-2026-1021)
                </label>
                <input
                  type="text"
                  placeholder="Optional (Enables verified badge)"
                  value={appointmentId}
                  onChange={(e) => setAppointmentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Entering an appointment ID earns a "Verified Patient" badge.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department Visited
                </label>
                <select
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                  <option value="Diagnostics Wing">Diagnostics &amp; Lab</option>
                </select>
              </div>

              {/* Star Rating Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Rating <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1.5 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= (hoverRating || rating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">
                    {hoverRating || rating} / 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Comments &amp; Experience <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Share details on doctor explanation, waiting room comfort, or queue ease..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Verified Feedback</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: Verified Feedback List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900">
              Community Reviews ({filteredFeedbacks.length})
            </h2>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 mr-1 font-semibold">Filter:</span>
              <button
                onClick={() => setFilterRating('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  filterRating === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {[5, 4, 3].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilterRating(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 transition-colors ${
                    filterRating === r
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{r}</span>
                  <Star className="w-3 h-3 fill-current" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredFeedbacks.map((fb) => (
              <div
                key={fb.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 card-hover-effect shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{fb.patientName}</span>
                      {fb.verified && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified Visit
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                      {fb.departmentName} · Token Ref: {fb.appointmentId}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < fb.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400">{fb.date}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "{fb.comments}"
                </p>
              </div>
            ))}

            {filteredFeedbacks.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
                No feedback matches the selected star filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
