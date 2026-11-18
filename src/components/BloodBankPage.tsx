import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  BloodAvailabilityStatus,
  BloodGroup,
  BloodRequest,
  BloodRequestStatus,
  BloodStockItem,
  UserSession,
} from '../types';
import {
  BLOOD_GROUPS,
  BLOOD_STATUSES,
  adminTransitionBloodRequest,
  adminUpdateBloodStock,
  submitSimpleBloodRequest,
  syncBloodBankFromServer,
} from '../services/bloodRequestService';
import { translateBloodAvailability, translateBloodRequestStatus } from '../i18n';
import { APPLE_EASE } from './MotionPrimitives';
import {
  Droplet,
  Search,
  Building2,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
  Edit3,
  ClipboardList,
  PackageCheck,
  ShieldCheck,
  ArrowRight,
  Loader2,
  HeartPulse,
  Lock,
  X,
} from 'lucide-react';

interface BloodBankPageProps {
  bloodStock: BloodStockItem[];
  mySubmittedRequests: BloodRequest[];
  adminRequests: BloodRequest[];
  session: UserSession | null;
  onRefreshBloodData: () => void;
}

type PatientNavTab = 'find' | 'request' | 'my-requests';
type AdminNavTab = 'overview' | 'stock' | 'requests';

function getAvailabilityStyle(status: BloodAvailabilityStatus) {
  if (status === 'Available') {
    return {
      badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      icon: CheckCircle2,
    };
  }
  if (status === 'Low Stock') {
    return {
      badge: 'bg-amber-50 text-amber-800 border border-amber-200',
      icon: AlertCircle,
    };
  }
  return {
    badge: 'bg-rose-50 text-rose-700 border border-rose-200',
    icon: XCircle,
  };
}

function getRequestStatusStyle(status: BloodRequestStatus) {
  if (status === 'Approved') {
    return {
      badge: 'bg-sky-50 text-sky-800 border border-sky-200',
      icon: CheckCircle2,
      hintKey: 'bloodBank.statusHints.Approved',
    };
  }
  if (status === 'Completed') {
    return {
      badge: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
      icon: PackageCheck,
      hintKey: 'bloodBank.statusHints.Completed',
    };
  }
  if (status === 'Rejected') {
    return {
      badge: 'bg-rose-50 text-rose-800 border border-rose-200',
      icon: XCircle,
      hintKey: 'bloodBank.statusHints.Rejected',
    };
  }
  return {
    badge: 'bg-amber-50 text-amber-800 border border-amber-200',
    icon: Clock,
    hintKey: 'bloodBank.statusHints.Pending',
  };
}

function formatDateTime(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const BloodBankPage: React.FC<BloodBankPageProps> = ({
  bloodStock,
  mySubmittedRequests,
  adminRequests,
  session,
  onRefreshBloodData,
}) => {
  const { t } = useTranslation();
  const isAdmin = session?.role === 'admin';

  // Navigation strictly matches role
  const [patientTab, setPatientTab] = useState<PatientNavTab>('find');
  const [adminTab, setAdminTab] = useState<AdminNavTab>('overview');

  // Toast & error feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Patient 1: Find Blood search state
  const [dropdownGroup, setDropdownGroup] = useState<BloodGroup | 'All'>('All');
  const [appliedGroupFilter, setAppliedGroupFilter] = useState<BloodGroup | 'All'>('All');

  // Patient 2: Request Blood form state
  const [patientName, setPatientName] = useState(session?.role === 'patient' ? session.name : '');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [requiredUnits, setRequiredUnits] = useState('1');
  const [hospitalName, setHospitalName] = useState('SmartCare Medical Center');
  const [contactNumber, setContactNumber] = useState(
    session?.role === 'patient' ? session.phone : ''
  );
  const [requiredDate, setRequiredDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedConfirmation, setSubmittedConfirmation] = useState<BloodRequest | null>(null);

  // Patient 3: My Blood Requests lookup
  const [lookupInput, setLookupInput] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Admin: Stock modal state
  const [stockModal, setStockModal] = useState<{
    bloodGroup: BloodGroup;
    mode: 'add' | 'set';
    currentUnits: number;
  } | null>(null);
  const [stockQtyInput, setStockQtyInput] = useState('');
  const [stockModalError, setStockModalError] = useState<string | null>(null);
  const [isSavingStock, setIsSavingStock] = useState(false);

  // Admin: Requests filter & loading state
  const [adminStatusFilter, setAdminStatusFilter] = useState<'All' | BloodRequestStatus>('All');
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  useEffect(() => {
    void syncBloodBankFromServer(session).then((res) => {
      if (res) onRefreshBloodData();
    });
  }, [session?.id, session?.role]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered blood stock for Find Blood
  const displayedStock = useMemo(() => {
    if (appliedGroupFilter === 'All') return bloodStock;
    return bloodStock.filter((item) => item.bloodGroup === appliedGroupFilter);
  }, [bloodStock, appliedGroupFilter]);

  // Filtered My Blood Requests
  const displayedMyRequests = useMemo(() => {
    const q = lookupInput.trim().toLowerCase();
    const digits = lookupInput.replace(/\D/g, '');
    if (!q) return mySubmittedRequests;
    return mySubmittedRequests.filter((req) => {
      const matchRef = req.referenceCode.toLowerCase().includes(q);
      const matchName = req.patientName.toLowerCase().includes(q);
      const matchPhone =
        digits.length >= 4 && req.contactNumber.replace(/\D/g, '').includes(digits);
      return matchRef || matchName || matchPhone;
    });
  }, [mySubmittedRequests, lookupInput]);

  // Filtered Admin Requests
  const filteredAdminRequests = useMemo(() => {
    if (adminStatusFilter === 'All') return adminRequests;
    return adminRequests.filter((r) => r.requestStatus === adminStatusFilter);
  }, [adminRequests, adminStatusFilter]);

  // Stock map for fast lookup in Admin Requests
  const stockByGroup = useMemo(() => {
    const map: Record<string, BloodStockItem> = {};
    for (const item of bloodStock) {
      map[item.bloodGroup] = item;
    }
    return map;
  }, [bloodStock]);

  // Admin KPI metrics
  const adminStats = useMemo(() => {
    const totalUnits = bloodStock.reduce((sum, s) => sum + s.availableUnits, 0);
    const lowOrEmptyCount = bloodStock.filter((s) => s.availableUnits <= 3).length;
    const pendingCount = adminRequests.filter((r) => r.requestStatus === 'Pending').length;
    const approvedCount = adminRequests.filter((r) => r.requestStatus === 'Approved').length;
    return { totalUnits, lowOrEmptyCount, pendingCount, approvedCount };
  }, [bloodStock, adminRequests]);

  // Handlers
  const handleFindBloodSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedGroupFilter(dropdownGroup);
  };

  const handleResetFindSearch = () => {
    setDropdownGroup('All');
    setAppliedGroupFilter('All');
  };

  const handleQuickRequestGroup = (grp: BloodGroup) => {
    setBloodGroup(grp);
    setSubmittedConfirmation(null);
    setSubmitError(null);
    setPatientTab('request');
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmittingRequest(true);
    try {
      const created = await submitSimpleBloodRequest(
        {
          patientName,
          bloodGroup,
          unitsRequired: Number(requiredUnits),
          hospitalName,
          contactNumber,
          requiredDate,
          additionalInfo,
        },
        session
      );
      setSubmittedConfirmation(created);
      setAdditionalInfo('');
      onRefreshBloodData();
      showToast(t('bloodBank.admin.toastRequestSubmitted', { code: created.referenceCode }));
    } catch (err: any) {
      setSubmitError(err?.message || t('bloodBank.admin.errUpdateStatus'));
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleLookupMyRequests = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLookingUp(true);
    try {
      const q = lookupInput.trim();
      const digits = q.replace(/\D/g, '');
      await syncBloodBankFromServer(session, {
        ref: q.toUpperCase().startsWith('SC-BLD') ? q : undefined,
        phone: digits.length >= 10 ? digits : undefined,
      });
      onRefreshBloodData();
    } finally {
      setIsLookingUp(false);
    }
  };

  const openStockModal = (item: BloodStockItem, mode: 'add' | 'set') => {
    setStockModal({
      bloodGroup: item.bloodGroup,
      mode,
      currentUnits: item.availableUnits,
    });
    setStockQtyInput(mode === 'add' ? '2' : String(item.availableUnits));
    setStockModalError(null);
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModal) return;

    const trimmed = stockQtyInput.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) {
      setStockModalError(t('bloodBank.admin.errWholeNumber'));
      return;
    }

    const parsedUnits = Number(trimmed);
    if (stockModal.mode === 'add' && (parsedUnits < 1 || parsedUnits > 500)) {
      setStockModalError(t('bloodBank.admin.errAddRange'));
      return;
    }
    if (stockModal.mode === 'set' && (parsedUnits < 0 || parsedUnits > 500)) {
      setStockModalError(t('bloodBank.admin.errSetRange'));
      return;
    }

    setStockModalError(null);
    setIsSavingStock(true);
    try {
      const updated = await adminUpdateBloodStock(
        stockModal.bloodGroup,
        stockModal.mode,
        parsedUnits,
        session
      );
      setStockModal(null);
      onRefreshBloodData();
      showToast(
        t('bloodBank.admin.toastStockUpdated', {
          group: updated.bloodGroup,
          units: updated.availableUnits,
          status: translateBloodAvailability(t, updated.availabilityStatus),
        })
      );
    } catch (err: any) {
      setStockModalError(err?.message || t('bloodBank.admin.errUpdateStock'));
    } finally {
      setIsSavingStock(false);
    }
  };

  const handleProcessRequest = async (
    requestId: string,
    nextStatus: 'Approved' | 'Rejected' | 'Completed'
  ) => {
    setActionError(null);
    setProcessingRequestId(requestId);
    try {
      const updated = await adminTransitionBloodRequest(requestId, nextStatus, session);
      onRefreshBloodData();
      showToast(
        t('bloodBank.admin.toastStatusUpdated', {
          code: updated.referenceCode,
          status: translateBloodRequestStatus(t, updated.requestStatus),
        })
      );
    } catch (err: any) {
      setActionError(err?.message || t('bloodBank.admin.errUpdateStatus'));
    } finally {
      setProcessingRequestId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: APPLE_EASE }}
            className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2.5 text-xs font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clean White & Soft Blue Header */}
      <section className="bg-gradient-to-br from-white via-sky-50/70 to-cyan-50/80 rounded-2xl border border-sky-100 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700">
              <HeartPulse className="w-4 h-4 text-cyan-600" />
              <span>{t('bloodBank.brandLabel')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
              {isAdmin ? t('bloodBank.adminTitle') : t('bloodBank.patientTitle')}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isAdmin ? t('bloodBank.adminSubtitle') : t('bloodBank.patientSubtitle')}
            </p>
          </div>

          <div className="bg-white/90 border border-sky-100 rounded-xl px-4 py-3 text-xs space-y-1 shrink-0">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-sky-600" />
              <span>{t('bloodBank.deskPhone')}</span>
            </div>
            <div className="text-slate-500">{t('bloodBank.deskHours')}</div>
          </div>
        </div>
      </section>

      {/* Role-Specific 3-Option Simple Navigation */}
      <nav aria-label={t('bloodBank.navAria')} className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-2xs">
        {!isAdmin ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {(
              [
                { id: 'find', label: t('bloodBank.tabs.find'), icon: Search },
                { id: 'request', label: t('bloodBank.tabs.request'), icon: Droplet },
                {
                  id: 'my-requests',
                  label:
                    mySubmittedRequests.length > 0
                      ? t('bloodBank.tabs.myRequestsCount', { count: mySubmittedRequests.length })
                      : t('bloodBank.tabs.myRequests'),
                  icon: ClipboardList,
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = patientTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setPatientTab(item.id)}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[42px] ${
                    active
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-sky-50/70'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {(
              [
                { id: 'overview', label: t('bloodBank.tabs.overview'), icon: ShieldCheck },
                { id: 'stock', label: t('bloodBank.tabs.stock'), icon: PackageCheck },
                {
                  id: 'requests',
                  label:
                    adminStats.pendingCount > 0
                      ? t('bloodBank.tabs.requestsPending', { count: adminStats.pendingCount })
                      : t('bloodBank.tabs.requests'),
                  icon: ClipboardList,
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = adminTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActionError(null);
                    setAdminTab(item.id);
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[42px] ${
                    active
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-sky-50/70'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Global Action Error Banner */}
      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-3 text-xs font-medium flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-600 hover:text-rose-800 cursor-pointer"
            aria-label={t('common.dismiss')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================== PATIENT / VISITOR VIEWS ==================== */}
      {!isAdmin && patientTab === 'find' && (
        <div className="space-y-6">
          {/* Simple Dropdown + Search Bar */}
          <form
            onSubmit={handleFindBloodSearch}
            className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
          >
            <div className="flex-1">
              <label
                htmlFor="find-blood-group"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {t('bloodBank.selectBloodGroup')}
              </label>
              <select
                id="find-blood-group"
                value={dropdownGroup}
                onChange={(e) => setDropdownGroup(e.target.value as BloodGroup | 'All')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white min-h-[42px]"
              >
                <option value="All">{t('bloodBank.allBloodGroups')}</option>
                {BLOOD_GROUPS.map((grp) => (
                  <option key={grp} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 min-h-[42px] flex-1 sm:flex-initial"
              >
                <Search className="w-4 h-4" />
                <span>{t('bloodBank.searchBtn')}</span>
              </button>
              {appliedGroupFilter !== 'All' && (
                <button
                  type="button"
                  onClick={handleResetFindSearch}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[42px]"
                >
                  {t('bloodBank.showAll')}
                </button>
              )}
            </div>
          </form>

          {/* Blood Stock Availability Cards */}
          {displayedStock.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayedStock.map((item) => {
                const style = getAvailabilityStyle(item.availabilityStatus);
                const StatusIcon = style.icon;
                return (
                  <div
                    key={item.bloodGroup}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-sky-300 transition-colors p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-200 flex items-center justify-center">
                          <span className="text-lg font-bold font-mono tabular-nums text-sky-900">
                            {item.bloodGroup}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${style.badge}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{translateBloodAvailability(t, item.availabilityStatus)}</span>
                        </span>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">{t('bloodBank.availableUnits')}</div>
                        <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                          {item.availableUnits} {item.availableUnits === 1 ? t('common.unit') : t('common.units')}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="font-semibold text-slate-800 flex items-start gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                          <span>{item.hospitalName}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                          <span className="font-mono tabular-nums">{item.contactNumber}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickRequestGroup(item.bloodGroup)}
                      className="w-full py-2.5 px-4 bg-sky-50 hover:bg-sky-600 text-sky-800 hover:text-white border border-sky-200 hover:border-sky-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <span>{t('bloodBank.requestGroupBtn', { group: item.bloodGroup })}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-900">
                {t('bloodBank.noStockTitle', { group: appliedGroupFilter })}
              </p>
              <button
                type="button"
                onClick={handleResetFindSearch}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                {t('bloodBank.viewAllGroups')}
              </button>
            </div>
          )}
        </div>
      )}

      {!isAdmin && patientTab === 'request' && (
        <div className="max-w-2xl mx-auto">
          {submittedConfirmation ? (
            <div className="bg-white rounded-2xl border border-sky-200 p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900">
                    {t('bloodBank.requestSubmittedTitle')}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {t('bloodBank.requestSubmittedDesc')}
                  </p>
                </div>
              </div>

              <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">{t('bloodBank.requestId')}</span>
                  <span className="text-base font-bold font-mono tabular-nums text-sky-900">
                    {submittedConfirmation.referenceCode}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">{t('bloodBank.currentStatus')}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-800 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{translateBloodRequestStatus(t, submittedConfirmation.requestStatus)}</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">{t('bloodBank.patientAndGroup')}</span>
                  <span className="font-semibold text-slate-900">
                    {submittedConfirmation.patientName} · {submittedConfirmation.bloodGroup} (
                    {submittedConfirmation.unitsRequired}{' '}
                    {submittedConfirmation.unitsRequired === 1 ? t('common.unit') : t('common.units')})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">{t('bloodBank.hospitalAndDate')}</span>
                  <span className="font-semibold text-slate-900">
                    {submittedConfirmation.hospitalName} · {submittedConfirmation.requiredDate}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPatientTab('my-requests')}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  {t('bloodBank.viewMyRequests')}
                </button>
                <button
                  type="button"
                  onClick={() => setSubmittedConfirmation(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  {t('bloodBank.submitAnother')}
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmitRequest}
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-2xs"
            >
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900">{t('bloodBank.formTitle')}</h2>
                <p className="text-xs text-slate-600">
                  {t('bloodBank.formSubtitle')}
                </p>
              </div>

              {submitError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label htmlFor="req-patient-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('bloodBank.patientName')} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="req-patient-name"
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder={t('bloodBank.patientNamePlaceholder')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="req-blood-group" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('bloodBank.bloodGroup')} <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="req-blood-group"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  >
                    {BLOOD_GROUPS.map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="req-units" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('bloodBank.requiredUnits')} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="req-units"
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={requiredUnits}
                    onChange={(e) => setRequiredUnits(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="req-date" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('bloodBank.requiredDate')} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="req-date"
                    type="date"
                    required
                    value={requiredDate}
                    onChange={(e) => setRequiredDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="req-hospital" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('bloodBank.hospitalName')} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="req-hospital"
                    type="text"
                    required
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder={t('bloodBank.hospitalNamePlaceholder')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="req-contact" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('bloodBank.contactNumber')} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="req-contact"
                    type="tel"
                    required
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder={t('bloodBank.contactPlaceholder')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="req-notes" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('bloodBank.additionalInfo')}
                </label>
                <textarea
                  id="req-notes"
                  rows={3}
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder={t('bloodBank.additionalInfoPlaceholder')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  {t('bloodBank.approvalRequiredNote')}
                </span>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  {isSubmittingRequest && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSubmittingRequest ? t('bloodBank.submitting') : t('bloodBank.submitRequest')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {!isAdmin && patientTab === 'my-requests' && (
        <div className="space-y-5">
          {/* Request Lookup */}
          <form
            onSubmit={handleLookupMyRequests}
            className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                placeholder={t('bloodBank.lookupPlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white min-h-[42px]"
              />
            </div>
            <button
              type="submit"
              disabled={isLookingUp}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 min-h-[42px]"
            >
              {isLookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{t('bloodBank.checkStatus')}</span>
            </button>
          </form>

          {displayedMyRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedMyRequests.map((req) => {
                const st = getRequestStatusStyle(req.requestStatus);
                const StIcon = st.icon;
                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-mono tabular-nums text-slate-500">
                          {req.referenceCode}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-0.5">
                          {req.patientName} ·{' '}
                          <span className="text-sky-700 font-mono">{req.bloodGroup}</span>
                        </h3>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 ${st.badge}`}
                      >
                        <StIcon className="w-3.5 h-3.5" />
                        <span>{translateBloodRequestStatus(t, req.requestStatus)}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-slate-500 block">{t('bloodBank.requiredUnits')}</span>
                        <span className="font-semibold text-slate-900 font-mono tabular-nums">
                          {req.unitsRequired} {req.unitsRequired === 1 ? t('common.unit') : t('common.units')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{t('bloodBank.requiredDate')}</span>
                        <span className="font-semibold text-slate-900 font-mono tabular-nums">
                          {req.requiredDate}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{t('bloodBank.hospital')}</span>
                        <span className="font-semibold text-slate-900">{req.hospitalName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{t('bloodBank.contactNumber')}</span>
                        <span className="font-semibold text-slate-900 font-mono tabular-nums">
                          {req.contactNumber}
                        </span>
                      </div>
                    </div>

                    {req.additionalInfo && (
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
                        {req.additionalInfo}
                      </p>
                    )}

                    <p className="text-xs text-slate-500 pt-1">{t(st.hintKey)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-900">{t('bloodBank.noRequestsTitle')}</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {t('bloodBank.noRequestsSubtitle')}
              </p>
              <button
                type="button"
                onClick={() => setPatientTab('request')}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
              >
                {t('bloodBank.tabs.request')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==================== ADMINISTRATOR VIEWS ==================== */}
      {isAdmin && adminTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1">
              <span className="text-xs font-medium text-slate-500">{t('bloodBank.admin.totalUnitsInStock')}</span>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {adminStats.totalUnits}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1">
              <span className="text-xs font-medium text-amber-700">{t('bloodBank.admin.lowOrOutGroups')}</span>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {adminStats.lowOrEmptyCount}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1">
              <span className="text-xs font-medium text-sky-700">{t('bloodBank.admin.pendingRequests')}</span>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {adminStats.pendingCount}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1">
              <span className="text-xs font-medium text-emerald-700">{t('bloodBank.admin.approvedActive')}</span>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {adminStats.approvedCount}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Stock Snapshot */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">{t('bloodBank.admin.stockSummary')}</h2>
                <button
                  type="button"
                  onClick={() => setAdminTab('stock')}
                  className="text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer whitespace-nowrap"
                >
                  {t('bloodBank.admin.manageStockLink')}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {bloodStock.map((item) => {
                  const style = getAvailabilityStyle(item.availabilityStatus);
                  return (
                    <div
                      key={item.bloodGroup}
                      className="rounded-xl border border-slate-200 p-3 space-y-1 bg-slate-50/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {item.bloodGroup}
                        </span>
                        <span className="font-mono tabular-nums font-bold text-sm text-sky-700">
                          {item.availableUnits}
                        </span>
                      </div>
                      <div className={`text-[11px] font-medium px-1.5 py-0.5 rounded inline-block ${style.badge}`}>
                        {translateBloodAvailability(t, item.availabilityStatus)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pending Requests Attention Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">{t('bloodBank.admin.pendingRequestsBox')}</h2>
                <button
                  type="button"
                  onClick={() => setAdminTab('requests')}
                  className="text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer whitespace-nowrap"
                >
                  {t('bloodBank.admin.viewAllRequestsLink')}
                </button>
              </div>

              {adminRequests.filter((r) => r.requestStatus === 'Pending').length > 0 ? (
                <div className="space-y-2.5">
                  {adminRequests
                    .filter((r) => r.requestStatus === 'Pending')
                    .slice(0, 4)
                    .map((req) => (
                      <div
                        key={req.id}
                        className="rounded-xl border border-slate-200 p-3.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            {req.patientName} ·{' '}
                            <span className="font-mono text-sky-700">{req.bloodGroup}</span> (
                            {req.unitsRequired} {req.unitsRequired === 1 ? t('common.unit') : t('common.units')})
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            {req.referenceCode} · {req.hospitalName} · {t('bloodBank.admin.duePrefix', { date: req.requiredDate })}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAdminTab('requests')}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                        >
                          {t('bloodBank.admin.review')}
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  {t('bloodBank.admin.noPending')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isAdmin && adminTab === 'stock' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t('bloodBank.admin.stockMgmtTitle')}</h2>
              <p className="text-xs text-slate-500">
                {t('bloodBank.admin.stockMgmtSubtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAdminTab('requests')}
              className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <ClipboardList className="w-4 h-4" />
              <span>{t('bloodBank.admin.viewRequestsCount', { count: adminRequests.length })}</span>
            </button>
          </div>

          {/* Desktop Clean Stock Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-5 font-semibold">{t('bloodBank.bloodGroup')}</th>
                  <th className="py-3.5 px-5 font-semibold">{t('bloodBank.availableUnits')}</th>
                  <th className="py-3.5 px-5 font-semibold">{t('bloodBank.admin.lastUpdated')}</th>
                  <th className="py-3.5 px-5 font-semibold">{t('bloodBank.admin.availabilityStatus')}</th>
                  <th className="py-3.5 px-5 font-semibold text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bloodStock.map((item) => {
                  const style = getAvailabilityStyle(item.availabilityStatus);
                  const StatusIcon = style.icon;
                  return (
                    <tr key={item.bloodGroup} className="hover:bg-sky-50/30 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-base text-slate-900">
                        {item.bloodGroup}
                      </td>
                      <td className="py-3.5 px-5 font-mono tabular-nums font-semibold text-slate-900">
                        {item.availableUnits} {item.availableUnits === 1 ? t('common.unit') : t('common.units')}
                      </td>
                      <td className="py-3.5 px-5 text-xs font-mono tabular-nums text-slate-500">
                        {formatDateTime(item.lastUpdated)}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${style.badge}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span>{translateBloodAvailability(t, item.availabilityStatus)}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openStockModal(item, 'add')}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{t('bloodBank.admin.addStock')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openStockModal(item, 'set')}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{t('bloodBank.admin.updateStock')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Stock Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
            {bloodStock.map((item) => {
              const style = getAvailabilityStyle(item.availabilityStatus);
              const StatusIcon = style.icon;
              return (
                <div
                  key={item.bloodGroup}
                  className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold font-mono text-slate-900">
                      {item.bloodGroup}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${style.badge}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{translateBloodAvailability(t, item.availabilityStatus)}</span>
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-mono tabular-nums text-base font-bold text-slate-900">
                      {item.availableUnits} {item.availableUnits === 1 ? t('common.unit') : t('common.units')}
                    </span>
                    <span className="text-slate-500 font-mono tabular-nums">
                      {formatDateTime(item.lastUpdated)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openStockModal(item, 'add')}
                      className="py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl cursor-pointer inline-flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('bloodBank.admin.addStock')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openStockModal(item, 'set')}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl cursor-pointer inline-flex items-center justify-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t('bloodBank.admin.update')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isAdmin && adminTab === 'requests' && (
        <div className="space-y-5">
          {/* Status Filter */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['All', ...BLOOD_STATUSES] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setAdminStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    adminStatusFilter === st
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'All' ? t('common.all') : translateBloodRequestStatus(t, st)}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {t('bloodBank.admin.showingOf', { shown: filteredAdminRequests.length, total: adminRequests.length })}
            </span>
          </div>

          {filteredAdminRequests.length > 0 ? (
            <div className="space-y-3">
              {filteredAdminRequests.map((req) => {
                const st = getRequestStatusStyle(req.requestStatus);
                const StIcon = st.icon;
                const stock = stockByGroup[req.bloodGroup];
                const isBusy = processingRequestId === req.id;

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs text-slate-500 tabular-nums">
                          {req.referenceCode}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold ${st.badge}`}
                        >
                          <StIcon className="w-3.5 h-3.5" />
                          <span>{translateBloodRequestStatus(t, req.requestStatus)}</span>
                        </span>
                        {stock && (
                          <span className="text-xs text-slate-500 font-mono tabular-nums">
                            {t('bloodBank.admin.stockForGroup', { group: req.bloodGroup })}{' '}
                            <strong className="text-slate-800">
                              {stock.availableUnits} {stock.availableUnits === 1 ? t('common.unit') : t('common.units')}
                            </strong>
                          </span>
                        )}
                      </div>

                      <div className="text-base font-bold text-slate-900">
                        {req.patientName} ·{' '}
                        <span className="text-sky-700 font-mono">{req.bloodGroup}</span> ·{' '}
                        <span className="font-mono tabular-nums">
                          {req.unitsRequired} {req.unitsRequired === 1 ? t('common.unit') : t('common.units')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{req.hospitalName}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{req.contactNumber}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t('bloodBank.admin.requiredLabel', { date: req.requiredDate })}</span>
                        </span>
                      </div>

                      {req.additionalInfo && (
                        <p className="text-xs text-slate-500">{req.additionalInfo}</p>
                      )}
                    </div>

                    {/* Strict Status-Locked Admin Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {req.requestStatus === 'Pending' && (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleProcessRequest(req.id, 'Approved')}
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
                          >
                            {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>{t('bloodBank.admin.approve')}</span>
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleProcessRequest(req.id, 'Rejected')}
                            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {t('bloodBank.admin.reject')}
                          </button>
                        </>
                      )}

                      {req.requestStatus === 'Approved' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleProcessRequest(req.id, 'Completed')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>{t('bloodBank.admin.markCompleted')}</span>
                        </button>
                      )}

                      {(req.requestStatus === 'Completed' || req.requestStatus === 'Rejected') && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl whitespace-nowrap">
                          <Lock className="w-3.5 h-3.5" />
                          <span>{t('bloodBank.admin.processed')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
              {t('bloodBank.admin.noMatchRequests')}
            </div>
          )}
        </div>
      )}

      {/* ==================== ADMIN MODAL: ADD OR UPDATE BLOOD STOCK ==================== */}
      <AnimatePresence>
        {isAdmin && stockModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2, ease: APPLE_EASE }}
              className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden"
            >
              <div className="px-5 py-4 bg-sky-50 border-b border-sky-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {stockModal.mode === 'add'
                      ? t('bloodBank.admin.modalAddTitle', { group: stockModal.bloodGroup })
                      : t('bloodBank.admin.modalUpdateTitle', { group: stockModal.bloodGroup })}
                  </h3>
                  <p className="text-xs text-slate-600 font-mono tabular-nums">
                    {t('bloodBank.admin.currentAvailable', { units: stockModal.currentUnits })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStockModal(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white cursor-pointer"
                  aria-label={t('common.close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveStock} className="p-5 space-y-4">
                {stockModalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">
                    {stockModalError}
                  </div>
                )}

                <div>
                  <label htmlFor="stock-units-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {stockModal.mode === 'add'
                      ? t('bloodBank.admin.unitsToAddLabel')
                      : t('bloodBank.admin.newTotalLabel')}
                  </label>
                  <input
                    id="stock-units-input"
                    type="number"
                    min={stockModal.mode === 'add' ? 1 : 0}
                    max={500}
                    required
                    value={stockQtyInput}
                    onChange={(e) => setStockQtyInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStockModal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingStock}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {isSavingStock && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {stockModal.mode === 'add'
                        ? t('bloodBank.admin.confirmAddStock')
                        : t('bloodBank.admin.saveStock')}
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
