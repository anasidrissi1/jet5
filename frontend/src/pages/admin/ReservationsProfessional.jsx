import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Pencil, Phone, Trash2 } from 'lucide-react';
import { reservationsService, clientsService, carsService, paymentsService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import exportExcel from '../../utils/exportExcel';
import Loader from '../../components/Loader';
import ReservationTimelineModal from '../../components/ReservationTimelineModal';
import '../../styles/reservations-professional.css';
import '../../styles/reservations-modal.css';

const requestDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const ONLINE_STATUS_REGEX = /\[ONLINE_STATUS:(new|contacted|confirmed|refused)\]/;
const ONLINE_STATUS_GLOBAL_REGEX = /\s*\[ONLINE_STATUS:(new|contacted|confirmed|refused)\]\s*/g;
const NON_RENSEIGNE = 'Non renseigné';

const formatRequestDateTime = (value) => {
  if (!value) return NON_RENSEIGNE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDisplayValue(value);
  return requestDateFormatter.format(date).replace(',', ' à');
};

const formatDateOnly = (value) => {
  if (!value) return NON_RENSEIGNE;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const formatDisplayValue = (value) => {
  if (value === null || value === undefined) return NON_RENSEIGNE;
  const text = String(value).trim();
  return text ? text : NON_RENSEIGNE;
};

const normalizeSearchText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildNameVariants = (fullName) => {
  const normalized = normalizeSearchText(fullName);
  if (!normalized) return [];
  const parts = normalized.split(' ').filter(Boolean);
  if (parts.length < 2) return [normalized];
  return [normalized, [...parts].reverse().join(' ')];
};

const countProlongationEvents = (commentaire) => {
  if (!commentaire) return 0;
  const matches = String(commentaire).match(/\[PA_AUDIT\]/g);
  return matches ? matches.length : 0;
};

const extractLocationsAndNote = (commentaire) => {
  const raw = (commentaire || '').trim();
  if (!raw) {
    return {
      pickup: '',
      dropoff: '',
      note: '',
    };
  }

  const match = raw.match(/Pickup:\s*(.*?)\s*\/\s*Dropoff:\s*(.*?)(?:\n|$)/i);
  if (!match) {
    return {
      pickup: '',
      dropoff: '',
      note: raw,
    };
  }

  const note = raw.replace(match[0], '').trim();
  return {
    pickup: (match[1] || '').trim(),
    dropoff: (match[2] || '').trim(),
    note,
  };
};

function ReservationsProfessional({
  sourceFilter = 'admin',
  title = 'Gestion des réservations',
  subtitle = null,
  allowCreate = true,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotification } = useNotification();
  const isOnlineView = sourceFilter === 'en_ligne';
  
  // State management
  const [reservations, setReservations] = useState([]);
  const [clients, setClients] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [carFilter, setCarFilter] = useState(null);
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  
  // Retours du jour
  const [returnsToday, setReturnsToday] = useState([]);
  const [showReturnsAlert, setShowReturnsAlert] = useState(true);
  const [paModal, setPaModal] = useState({
    show: false,
    reservation: null,
    days: '',
    targetDate: '',
    longDurationEnabled: false,
    longDurationCount: '1',
    longDurationUnit: 'MONTHS',
    advanceAmount: '',
    paymentMethod: 'CASH',
    loadingSummary: false,
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
    lastAdvanceAmount: null
  });
  
  // Filters and search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig] = useState({ key: null, direction: 'asc' });
  const now = new Date();
  const [financeFilterType, setFinanceFilterType] = useState('month');
  const [financeFilterMonth, setFinanceFilterMonth] = useState(now.getMonth() + 1);
  const [financeFilterYear, setFinanceFilterYear] = useState(now.getFullYear());
  
  // Pagination désactivée pour afficher toutes les réservations
  const [activeReservation, setActiveReservation] = useState(null);
  const [contactCardReservation, setContactCardReservation] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, reservation: null });
  const [pendingHeaderAction, setPendingHeaderAction] = useState(null);

  const getProlongationDays = useCallback((reservation) => {
    const value = Number(reservation?.jours_prolongation);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, []);

  const isReservationExtended = useCallback((reservation) => {
    const days = getProlongationDays(reservation);
    const events = countProlongationEvents(reservation?.commentaire);
    return days > 0 || events > 0;
  }, [getProlongationDays]);

  // Get user info
  useEffect(() => {
    // Afficher un message de succès passé depuis d'autres pages (ex: création)
    const successMessage = location?.state?.successMessage;
    if (successMessage) {
      // Guard against double notifications (React StrictMode mounts twice in dev)
      // while still allowing the same message to appear again on a new navigation.
      const navKey = location?.key || `${window.location.pathname}_${Date.now()}`;
      const key = `shown_notif_${navKey}`;
      if (!sessionStorage.getItem(key)) {
        addNotification(successMessage, 'success');
        sessionStorage.setItem(key, '1');
      }
      // Nettoyer l'état d'historique pour éviter la réapparition au reload
      try {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      } catch {
        // ignore
      }
    }

    // Pré-appliquer filtres si navigation depuis la fiche voiture (impayés)
    if (location?.state) {
      const { carFilter: cf, unpaidOnly: uo } = location.state;
      if (cf) setCarFilter(String(cf));
      if (uo) setUnpaidOnly(Boolean(uo));
    }

    // Action depuis le Header (Prolonger / Récupérer)
    if (location?.state?.headerAction) {
      const { headerAction, reservationId } = location.state;
      // Nettoyage immédiat pour éviter réexécution au reload
      try {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      } catch { /* ignore */ }
      // Différer l'action jusqu'à ce que les réservations soient chargées
      setPendingHeaderAction({ action: headerAction, reservationId });
    }
    // Intentionally only depend on addNotification and location to re-run when navigation provides a new message
  }, [addNotification, location]);

  // Fetch all data
  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [rList, cList, vList] = await Promise.all([
          fetchAllPages(
            reservationsService.list,
            sourceFilter !== 'all' ? { origin: sourceFilter } : {},
          ),
          fetchAllPages(clientsService.list),
          fetchAllPages(carsService.list),
        ]);

        if (mounted) {
          setReservations(rList || []);
          setClients(cList || []);
          setCars(vList || []);
        }
      } catch (err) {
        console.error('Erreur chargement:', err);
        if (mounted) {
          const errorMsg = err.response?.data?.detail || err.message || 'Erreur réseau';
          setError(errorMsg);
          addNotification(errorMsg, 'error');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAll();
    return () => { mounted = false; };
  }, [addNotification, sourceFilter]);

  // Fetch returns today
  useEffect(() => {
    const fetchReturnsToday = async () => {
      try {
        const res = await reservationsService.returnsToday();
        setReturnsToday(res.data.reservations || []);
      } catch (err) {
        console.error('Erreur chargement retours du jour:', err);
      }
    };
    fetchReturnsToday();
  }, []);

  const paymentMethodOptions = useMemo(() => ([
    { value: 'CASH', label: 'Espèces' },
    { value: 'CARD', label: 'Carte' },
    { value: 'CHEQUE', label: 'Chèque' },
    { value: 'TPE', label: 'TPE' },
    { value: 'TRANSFER', label: 'Virement' },
    { value: 'OTHER', label: 'Autre' }
  ]), []);

  const longDurationUnitOptions = useMemo(() => ([
    { value: 'MONTHS', label: 'Mois' },
    { value: 'YEARS', label: 'Annees' },
  ]), []);

  const fetchAllPages = async (loader, baseParams = {}) => {
    const allItems = [];
    let page = 1;
    let hasNext = true;
    const MAX_PAGES = 200;

    while (hasNext && page <= MAX_PAGES) {
      const response = await loader({ ...baseParams, page, page_size: 200 });
      const payload = response.data;

      if (Array.isArray(payload)) {
        return payload;
      }

      if (Array.isArray(payload?.results)) {
        allItems.push(...payload.results);
        hasNext = Boolean(payload.next);
        page += 1;
        continue;
      }

      return [];
    }

    return allItems;
  };

  const refreshReservations = async () => {
    const rList = await fetchAllPages(
      reservationsService.list,
      sourceFilter !== 'all' ? { origin: sourceFilter } : {},
    );
    setReservations(rList);
  };

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatMoney = (value) => {
    const amount = toNumber(value);
    return `${amount.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
  };

  const parseISODate = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const addMonthsSafe = (date, monthsToAdd) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    const safeMonths = Math.max(parseInt(monthsToAdd, 10) || 0, 0);
    const year = date.getFullYear();
    const monthIndex = date.getMonth() + safeMonths;
    const targetYear = year + Math.floor(monthIndex / 12);
    const targetMonth = ((monthIndex % 12) + 12) % 12;
    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const targetDay = Math.min(date.getDate(), daysInTargetMonth);
    return new Date(targetYear, targetMonth, targetDay);
  };

  const addYearsSafe = (date, yearsToAdd) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    const safeYears = Math.max(parseInt(yearsToAdd, 10) || 0, 0);
    const targetYear = date.getFullYear() + safeYears;
    const targetMonth = date.getMonth();
    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const targetDay = Math.min(date.getDate(), daysInTargetMonth);
    return new Date(targetYear, targetMonth, targetDay);
  };

  const getLongDurationTargetDate = useCallback((modalState) => {
    if (!modalState?.longDurationEnabled) return '';

    const baseDate = parseISODate(modalState?.reservation?.date_fin || modalState?.reservation?.date_debut);
    if (!baseDate) return '';

    const count = Math.max(parseInt(modalState.longDurationCount, 10) || 1, 1);
    const target = modalState.longDurationUnit === 'YEARS'
      ? addYearsSafe(baseDate, count)
      : addMonthsSafe(baseDate, count);

    return formatISODate(target);
  }, []);

  const formatISODate = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const parseOnlineStatusMarker = (commentaire) => {
    if (!commentaire) return null;
    const match = commentaire.match(ONLINE_STATUS_REGEX);
    return match?.[1] || null;
  };

  const stripOnlineStatusMarkers = (commentaire) => {
    if (!commentaire) return '';

    return String(commentaire)
      .replace(ONLINE_STATUS_GLOBAL_REGEX, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  };

  const upsertOnlineStatusMarker = (commentaire, status) => {
    const cleanComment = stripOnlineStatusMarkers(commentaire);
    const marker = `[ONLINE_STATUS:${status}]`;

    if (!cleanComment) return marker;

    return `${cleanComment}\n${marker}`.trim();
  };

  const getClientContactInfo = (reservation) => {
    const client = getClientRecord(reservation.client);
    return {
      phone: reservation.client_telephone || client?.telephone || '',
      email: reservation.client_email || client?.email || '',
    };
  };

  const getOnlineStatusKey = useCallback((reservation) => {
    const markerStatus = parseOnlineStatusMarker(reservation.commentaire);
    const startDate = parseISODate(reservation.date_debut);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (reservation.statut === 'annule' || markerStatus === 'refused') return 'refused';
    if (markerStatus === 'confirmed' || reservation.numero_contrat || ['en_cours', 'termine'].includes(reservation.statut)) return 'confirmed';
    if (startDate && startDate < today) return 'expired';
    if (markerStatus === 'contacted') return 'contacted';
    return 'new';
  }, []);

  const getOnlineStatusMeta = (reservation) => {
    const statusKey = getOnlineStatusKey(reservation);
    const meta = {
      new: { label: 'En attente', className: 'status-online-new' },
      // Une demande marquée comme "contactée" est considérée comme traitée côté agence
      contacted: { label: 'Traitée', className: 'status-online-contacted' },
      confirmed: { label: 'Confirmée', className: 'status-online-confirmed' },
      refused: { label: 'Refusée', className: 'status-online-refused' },
      expired: { label: 'Expirée', className: 'status-online-expired' },
    };

    return { key: statusKey, ...(meta[statusKey] || meta.new) };
  };

  const getOnlinePriorityMeta = useCallback((reservation) => {
    const statusKey = getOnlineStatusKey(reservation);
    const startDate = parseISODate(reservation.date_debut);
    const createdAt = reservation.date_creation ? new Date(reservation.date_creation) : null;
    const now = new Date();

    if (statusKey === 'refused' || statusKey === 'confirmed') {
      return { key: 'normal', label: 'Traitee', className: 'online-priority-normal' };
    }

    if (startDate) {
      const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilStart <= 24) {
        return { key: 'urgent', label: 'Urgent', className: 'online-priority-urgent' };
      }
      if (hoursUntilStart <= 72) {
        return { key: 'medium', label: 'Moyen', className: 'online-priority-medium' };
      }
    }

    if (createdAt) {
      const hoursSinceRequest = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceRequest >= 2) {
        // On conserve la priorité "moyenne" mais sans le libellé "A relancer"
        return { key: 'medium', label: 'Moyen', className: 'online-priority-medium' };
      }
    }

    return { key: 'normal', label: 'Normal', className: 'online-priority-normal' };
  }, [getOnlineStatusKey]);

  const buildOnlineContractNumber = (reservation) => {
    if (reservation.numero_contrat) return reservation.numero_contrat;
    const createdAt = reservation.date_creation ? new Date(reservation.date_creation) : new Date();
    const dateChunk = `${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}`;
    return `WEB-${dateChunk}-${String(reservation.id).padStart(4, '0')}`;
  };

  const handleOnlineStatusUpdate = async (reservation, nextStatus) => {
    try {
      const payload = {
        commentaire: upsertOnlineStatusMarker(reservation.commentaire, nextStatus),
      };

      if (nextStatus === 'confirmed') {
        payload.numero_contrat = buildOnlineContractNumber(reservation);
        if (reservation.statut === 'annule') {
          payload.statut = 'planifiee';
        }
      }

      if (nextStatus === 'refused') {
        payload.statut = 'annule';
      }

      await reservationsService.patch(reservation.id, payload);
      await refreshReservations();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('jet5:refreshSidebarCounts'));
      }

      const successMessage = nextStatus === 'confirmed'
        ? 'Demande online convertie et confirmee.'
        : nextStatus === 'contacted'
          ? 'Demande marquee comme contactee.'
          : 'Demande marquee comme refusee.';
      addNotification(successMessage, 'success');
    } catch (err) {
      console.error('Erreur mise a jour demande online:', err);
      const message = err.response?.data?.detail || err.response?.data?.error || 'Impossible de mettre a jour la demande online';
      addNotification(message, 'error');
    }
  };

  const handleCallClient = (reservation) => {
    setContactCardReservation(reservation);
  };

  const openReservationTimeline = (reservation) => {
    setActiveReservation({
      reservation,
      client: getClientRecord(reservation.client),
      car: getCarRecord(reservation.voiture),
    });
  };

  const getOnlineContactCardData = (reservation) => {
    const client = getClientRecord(reservation?.client);
    const carInfo = getCarInfo(reservation?.voiture);
    const fallbackName = getClientName(reservation?.client, reservation);
    const cleanComment = stripOnlineStatusMarkers(reservation?.commentaire);
    const parsedComment = extractLocationsAndNote(cleanComment);

    const firstName = formatDisplayValue(client?.prenom || reservation?.client_prenom);
    const lastName = formatDisplayValue(client?.nom || reservation?.client_nom);
    const fullName = formatDisplayValue(
      reservation?.client_nom
      || `${client?.prenom || ''} ${client?.nom || ''}`.trim()
      || fallbackName
    );

    const pickupLocation = formatDisplayValue(reservation?.pickup_location || parsedComment.pickup);
    const dropoffLocation = formatDisplayValue(reservation?.dropoff_location || parsedComment.dropoff);
    const noteClient = formatDisplayValue(parsedComment.note);

    return {
      fullName,
      firstName,
      lastName,
      phone: formatDisplayValue(reservation?.client_telephone || client?.telephone),
      email: formatDisplayValue(reservation?.client_email || client?.email),
      dateNaissance: formatDateOnly(reservation?.client_date_naissance || client?.date_naissance),
      city: formatDisplayValue(reservation?.client_ville || client?.ville),
      address: formatDisplayValue(reservation?.client_adresse || client?.adresse),
      cin: formatDisplayValue(reservation?.client_cin || client?.cin_numero),
      permis: formatDisplayValue(reservation?.client_permis || client?.permis_numero),
      carName: formatDisplayValue(carInfo.display),
      startDate: formatDateOnly(reservation?.date_debut),
      endDate: formatDateOnly(reservation?.date_fin),
      pickupLocation,
      dropoffLocation,
      requestDate: formatDisplayValue(formatRequestDateTime(reservation?.date_creation)),
      noteClient,
    };
  };

  const getRequestedExtensionDays = useCallback((modalState) => {
    const currentEndDate = modalState?.reservation?.date_fin || modalState?.reservation?.date_debut;
    const currentDate = parseISODate(currentEndDate);

    if (modalState?.longDurationEnabled && currentDate) {
      const longDurationTarget = parseISODate(getLongDurationTargetDate(modalState));
      if (longDurationTarget) {
        const diffDays = Math.round((longDurationTarget.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(diffDays, 0);
      }
    }

    if (modalState?.targetDate && currentDate) {
      const targetDate = parseISODate(modalState.targetDate);
      if (targetDate) {
        const diffDays = Math.round((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(diffDays, 0);
      }
    }

    if (modalState?.days !== '' && Number(modalState.days) > 0) {
      return parseInt(modalState.days, 10);
    }

    return 0;
  }, [getLongDurationTargetDate]);

  const paComputed = useMemo(() => {
    const reservation = paModal.reservation;
    if (!reservation) {
      return {
        extensionDays: 0,
        currentTotalDays: 0,
        projectedTotalDays: 0,
        extensionAmount: 0,
        projectedEndDate: '',
        projectedTotal: toNumber(paModal.totalAmount),
        maxAdvanceAllowed: 0,
        projectedRemaining: toNumber(paModal.remainingAmount),
      };
    }

    const extensionDays = getRequestedExtensionDays(paModal);
    const longDurationTargetDate = getLongDurationTargetDate(paModal);
    const baseDays = toNumber(reservation.nombre_jours);
    const currentProlongationDays = toNumber(reservation.jours_prolongation);
    const currentTotalDays = Math.max(baseDays + currentProlongationDays, 0);
    const projectedTotalDays = currentTotalDays + extensionDays;
    const currentEnd = parseISODate(reservation.date_fin || reservation.date_debut);
    const projectedEndDate = longDurationTargetDate
      || (currentEnd && extensionDays > 0
        ? formatISODate(new Date(currentEnd.getTime() + (extensionDays * 24 * 60 * 60 * 1000)))
        : (reservation.date_fin || reservation.date_debut || ''));

    const dailyPrice = toNumber(reservation.prix_journalier);
    const tarifSpec = toNumber(reservation.tarif_special);
    let extensionAmount;
    let projectedTotal;
    if (tarifSpec > 0 && projectedTotalDays > 0) {
      const currentMonths = Math.max(1, Math.ceil(currentTotalDays / 30));
      const projectedMonths = Math.max(1, Math.ceil(projectedTotalDays / 30));
      const currentTotal = tarifSpec * currentMonths;
      projectedTotal = tarifSpec * projectedMonths;
      extensionAmount = Math.max(projectedTotal - currentTotal, 0);
    } else {
      extensionAmount = Math.max(extensionDays * dailyPrice, 0);
      projectedTotal = Math.max(toNumber(paModal.totalAmount) + extensionAmount, 0);
    }
    const alreadyPaid = toNumber(paModal.paidAmount);
    const maxAdvanceAllowed = Math.max(projectedTotal - alreadyPaid, 0);
    const projectedPaid = alreadyPaid + (toNumber(paModal.advanceAmount) > 0 ? toNumber(paModal.advanceAmount) : 0);
    const projectedRemaining = Math.max(projectedTotal - projectedPaid, 0);

    return {
      extensionDays,
      currentTotalDays,
      projectedTotalDays,
      extensionAmount,
      projectedEndDate,
      projectedTotal,
      maxAdvanceAllowed,
      projectedRemaining,
    };
  }, [paModal, getRequestedExtensionDays, getLongDurationTargetDate]);

  const getSummaryFromReservation = useCallback((reservation) => {
    // Recalculer le montant total réel (cohérent avec le backend)
    let total = toNumber(reservation?.montant_total);
    const tarifSpec = toNumber(reservation?.tarif_special);
    const baseDaysR = toNumber(reservation?.nombre_jours);
    const prolongR = toNumber(reservation?.jours_prolongation);
    const daysR = Math.max(baseDaysR + prolongR, 0);
    if (tarifSpec > 0 && daysR > 0) {
      const months = Math.max(1, Math.ceil(daysR / 30));
      total = tarifSpec * months;
    } else if (!total && daysR > 0 && toNumber(reservation?.prix_journalier)) {
      total = daysR * toNumber(reservation.prix_journalier);
    }
    const paid = toNumber(reservation?.avance);
    return {
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: Math.max(total - paid, 0),
      lastAdvanceAmount: paid > 0 ? paid : null,
    };
  }, []);

  const closePAModal = () => {
    setPaModal({
      show: false,
      reservation: null,
      days: '',
      targetDate: '',
      longDurationEnabled: false,
      longDurationCount: '1',
      longDurationUnit: 'MONTHS',
      advanceAmount: '',
      paymentMethod: 'CASH',
      loadingSummary: false,
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      lastAdvanceAmount: null,
    });
  };

  const loadPASummary = useCallback(async (reservation) => {
    if (!reservation?.id) return;

    const baseSummary = getSummaryFromReservation(reservation);

    try {
      const paymentsRes = await paymentsService.list({ reservation: reservation.id });
      const payments = Array.isArray(paymentsRes.data) ? paymentsRes.data : paymentsRes.data?.results ?? [];

      let summary = { ...baseSummary };
      const payment = payments[0];

      if (payment) {
        const total = toNumber(payment.amount || summary.totalAmount);
        const paid = toNumber(payment.paid_amount || summary.paidAmount);
        const forgiven = toNumber(payment.forgiven_amount);
        const remaining = toNumber(payment.remaining);

        summary = {
          ...summary,
          totalAmount: total,
          paidAmount: paid,
          remainingAmount: Number.isFinite(remaining) ? remaining : Math.max(total - paid - forgiven, 0),
        };

        try {
          const historyRes = await paymentsService.history(payment.id);
          const history = Array.isArray(historyRes.data) ? historyRes.data : historyRes.data?.results ?? [];
          if (history.length > 0) {
            summary.lastAdvanceAmount = toNumber(history[0].amount);
          } else if (summary.paidAmount > 0) {
            summary.lastAdvanceAmount = summary.paidAmount;
          }
        } catch (historyErr) {
          console.error('Erreur chargement historique P/A:', historyErr);
          if (summary.paidAmount > 0) {
            summary.lastAdvanceAmount = summary.paidAmount;
          }
        }
      }

      setPaModal((prev) => {
        if (!prev.show || prev.reservation?.id !== reservation.id) return prev;
        return {
          ...prev,
          ...summary,
          loadingSummary: false,
        };
      });
    } catch (err) {
      console.error('Erreur chargement synthèse paiement:', err);
      setPaModal((prev) => {
        if (!prev.show || prev.reservation?.id !== reservation.id) return prev;
        return {
          ...prev,
          ...baseSummary,
          loadingSummary: false,
        };
      });
    }
  }, [getSummaryFromReservation]);

  const openPAModal = useCallback((reservation) => {
    const summary = getSummaryFromReservation(reservation);
    setPaModal({
      show: true,
      reservation,
      days: '',
      targetDate: reservation?.date_fin || '',
      longDurationEnabled: false,
      longDurationCount: '1',
      longDurationUnit: 'MONTHS',
      advanceAmount: '',
      paymentMethod: reservation?.methode_paiement || 'CASH',
      loadingSummary: true,
      ...summary,
    });

    loadPASummary(reservation);
  }, [getSummaryFromReservation, loadPASummary]);

  // Handle mark returned – navigate to reservation edit so user can fill return time
  const handleMarkReturned = useCallback((reservationId) => {
    navigate(`/admin/reservations/edit/${reservationId}`, {
      state: { focusRetour: true }
    });
  }, [navigate]);

  // Process pending header action (Prolonger / Récupérer from Header banner)
  useEffect(() => {
    if (!pendingHeaderAction || loading || reservations.length === 0) return;

    const { action, reservationId } = pendingHeaderAction;
    setPendingHeaderAction(null);

    if (action === 'openPA' && reservationId) {
      const reservation = reservations.find((r) => r.id === reservationId);
      if (reservation) {
        openPAModal(reservation);
      } else {
        addNotification('Réservation introuvable pour P/A.', 'error');
      }
    } else if (action === 'markReturned' && reservationId) {
      handleMarkReturned(reservationId);
    }
  }, [pendingHeaderAction, loading, reservations, openPAModal, handleMarkReturned, addNotification]);

  // Handle combined Prolongation + Avance update
  const handlePAUpdate = async () => {
    if (!paModal.reservation) {
      addNotification('Réservation introuvable.', 'error');
      return;
    }

    const currentEndDate = paModal.reservation?.date_fin || '';
    const longDurationTargetDate = getLongDurationTargetDate(paModal);
    const hasLongDuration = Boolean(longDurationTargetDate) && longDurationTargetDate !== currentEndDate;
    const hasTargetDate = !hasLongDuration && Boolean(paModal.targetDate) && paModal.targetDate !== currentEndDate;
    const hasDays = !hasLongDuration && !hasTargetDate && paModal.days !== '' && Number(paModal.days) > 0;
    const hasAdvance = paModal.advanceAmount !== '' && Number(paModal.advanceAmount) > 0;

    if (!hasDays && !hasTargetDate && !hasAdvance) {
      addNotification('Renseignez au moins une prolongation ou une avance.', 'error');
      return;
    }

    if (hasAdvance) {
      const requestedAdvance = Number(paModal.advanceAmount);
      if (requestedAdvance > paComputed.maxAdvanceAllowed) {
        addNotification(
          `L'avance (${formatMoney(requestedAdvance)}) dépasse le maximum autorisé (${formatMoney(paComputed.maxAdvanceAllowed)}).`,
          'error'
        );
        return;
      }
    }

    const applyLegacyPAFallback = async () => {
      let updatedReservation = paModal.reservation;
      const requestedAdvance = hasAdvance ? Number(paModal.advanceAmount) : 0;
      const daysToAdd = getRequestedExtensionDays(paModal);

      let paymentToUse = null;
      const paymentsBeforeRes = await paymentsService.list({ reservation: paModal.reservation.id });
      const paymentsBefore = Array.isArray(paymentsBeforeRes.data) ? paymentsBeforeRes.data : paymentsBeforeRes.data?.results ?? [];
      paymentToUse = paymentsBefore[0] || null;

      if (daysToAdd > 0) {
        const extendRes = await reservationsService.extendRental(paModal.reservation.id, {
          jours_supplementaires: daysToAdd,
        });
        updatedReservation = extendRes?.data?.reservation || updatedReservation;

        const reservationTotal = toNumber(updatedReservation?.montant_total);
        if (paymentToUse?.id && reservationTotal > 0) {
          await paymentsService.patch(paymentToUse.id, { amount: reservationTotal });
        }
      }

      if (requestedAdvance > 0) {
        if (!paymentToUse?.id) {
          const paymentsRes = await paymentsService.list({ reservation: paModal.reservation.id });
          const payments = Array.isArray(paymentsRes.data) ? paymentsRes.data : paymentsRes.data?.results ?? [];
          paymentToUse = payments[0] || null;
        }

        if (paymentToUse?.id) {
          await paymentsService.addPayment(paymentToUse.id, {
            additional_amount: requestedAdvance,
            method: paModal.paymentMethod || 'CASH',
          });
        } else {
          await paymentsService.create({
            reservation: paModal.reservation.id,
            method: paModal.paymentMethod || 'CASH',
            advance: requestedAdvance,
          });
        }
      }

      return updatedReservation;
    };

    try {
      const payload = {
        payment_method: paModal.paymentMethod || 'CASH'
      };

      if (hasDays) payload.jours_supplementaires = parseInt(paModal.days, 10);
      if (hasLongDuration) payload.date_fin = longDurationTargetDate;
      if (hasTargetDate) payload.date_fin = paModal.targetDate;
      if (hasAdvance) payload.advance_amount = Number(paModal.advanceAmount);

      try {
        await reservationsService.paUpdate(paModal.reservation.id, payload);
      } catch (primaryErr) {
        if (primaryErr?.response?.status !== 404) {
          throw primaryErr;
        }

        // Fallback for environments where pa-update is not yet deployed.
        await applyLegacyPAFallback();
      }

      addNotification('Mise à jour P/A enregistrée avec succès.', 'success');

      closePAModal();
      await refreshReservations();
      const todayRes = await reservationsService.returnsToday();
      setReturnsToday(todayRes.data.reservations || []);
    } catch (err) {
      console.error('Erreur P/A:', err);
      const message = err.response?.data?.error || err.response?.data?.detail || 'Erreur lors de la mise à jour P/A';
      addNotification(message, 'error');
    }
  };

  // Helper maps
  const clientMap = useMemo(() => 
    Object.fromEntries(clients.map(c => [c.id, c])), 
    [clients]
  );
  
  const carMap = useMemo(() => 
    Object.fromEntries(cars.map(c => [c.id, c])), 
    [cars]
  );

  const getClientRecord = useCallback((clientValue) => {
    if (!clientValue) return null;
    if (typeof clientValue === 'object') return clientValue;
    return clientMap[clientValue] || null;
  }, [clientMap]);

  const getCarRecord = useCallback((carValue) => {
    if (!carValue) return null;
    if (typeof carValue === 'object') return carValue;
    return carMap[carValue] || null;
  }, [carMap]);

  // Status label helper
  const getStatusLabel = (status) => {
    const statusMap = {
      'en_cours': 'En cours',
      'en_attente': 'En attente',
      'planifiee': 'Planifiée',
      'termine': 'Terminée'
    };
    return statusMap[status?.toLowerCase()] || status || 'Inconnu';
  };

  const getOriginLabel = (reservation) => {
    const origin = reservation.origine_reservation || reservation.origin;
    if (origin === 'en_ligne') return 'En ligne';
    if (origin === 'admin') return 'Admin';
    return reservation.origine_reservation_label || 'Admin';
  };

  // Get client name
  const getClientName = useCallback((clientValue, reservation = null) => {
    const serializerName = (reservation?.client_nom || reservation?.client_name || '').trim();
    if (serializerName) return serializerName;

    const client = getClientRecord(clientValue);
    if (!client) return 'Client sans nom';

    const fullName = `${client.prenom || ''} ${client.nom || ''}`.trim();
    return fullName || 'Client sans nom';
  }, [getClientRecord]);

  // Get car info
  const getCarInfo = useCallback((carId) => {
    const car = getCarRecord(carId);
    if (!car) {
      return {
        display: typeof carId === 'object' ? 'Voiture inconnue' : `Voiture #${carId}`,
        immatriculation: '-',
      };
    }
    return {
      display: `${car.marque || ''} ${car.modele || ''}`.trim() || `Voiture #${carId}`,
      immatriculation: car.immatriculation || '-'
    };
  }, [getCarRecord]);

  // Calculate days between dates
  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) {
      return 0;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0;
    }

    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

    if (endUtc < startUtc) {
      return 0;
    }

    const diffDays = Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24));
    // Durée en jours calendaires (fin exclusive) avec minimum 1
    return Math.max(1, diffDays);
  };

  // Filter and sort reservations
  const filteredReservations = useMemo(() => {
    let filtered = reservations;

    // Filtre voiture ciblée
    if (carFilter) {
      filtered = filtered.filter(r => String(r.voiture) === String(carFilter));
    }

    // Filtre impayés
    if (unpaidOnly) {
      filtered = filtered.filter(r => {
        const total = Number(r.montant_total) || 0;
        const paid = Math.min(total, Number(r.avance) || 0);
        const rest = Math.max(total - paid, 0);
        return rest > 0;
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((reservation) => {
        if (isOnlineView) {
          const key = getOnlineStatusKey(reservation);

          // Vue online : regrouper par "non traitées" (new) et "traitées" (tout le reste)
          if (statusFilter === 'not_treated') {
            return key === 'new';
          }
          if (statusFilter === 'treated') {
            return key !== 'new';
          }

          // Cas de secours (si d'autres valeurs sont utilisées ailleurs)
          return key === statusFilter;
        }

        // Vue classique : filtrage sur le statut brut
        return reservation.statut?.toLowerCase() === statusFilter;
      });
    }

    // Search filter
    const q = normalizeSearchText(search);
    if (q) {
      filtered = filtered.filter(r => {
        const clientNameVariants = buildNameVariants(getClientName(r.client, r));
        const carInfo = getCarInfo(r.voiture);
        const carDisplay = normalizeSearchText(carInfo.display);
        const immat = normalizeSearchText(carInfo.immatriculation);
        const phone = normalizeSearchText(r.client_telephone || '');
        const idText = String(r.id || '');
        
        return (
          clientNameVariants.some((name) => name.includes(q)) ||
          phone.includes(q) ||
          carDisplay.includes(q) ||
          immat.includes(q) ||
          idText.includes(q)
        );
      });
    }

    // Sort
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';

        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [reservations, statusFilter, search, sortConfig, carFilter, unpaidOnly, isOnlineView, getClientName, getCarInfo, getOnlineStatusKey]);
  const displayedReservations = filteredReservations;

  const pendingOnlineCount = !isOnlineView || !reservations?.length
    ? 0
    : reservations.filter((r) => getOnlineStatusKey(r) === 'new').length;

  const extendedContractsCount = isOnlineView || !reservations?.length
    ? 0
    : reservations.filter((reservation) => isReservationExtended(reservation)).length;

  const financialYearOptions = useMemo(() => {
    const years = new Set([new Date().getFullYear()]);
    reservations.forEach((reservation) => {
      const sourceDate = reservation.date_debut || reservation.date_creation;
      if (!sourceDate) return;
      const parsed = new Date(sourceDate);
      if (!Number.isNaN(parsed.getTime())) {
        years.add(parsed.getFullYear());
      }
    });
    return [...years].sort((a, b) => b - a);
  }, [reservations]);

  const financialMonthOptions = useMemo(() => ([
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Fevrier' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Aout' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Decembre' },
  ]), []);

  // Statistics
  const stats = useMemo(() => {
    if (isOnlineView) {
      return reservations.reduce((acc, reservation) => {
        const statusKey = getOnlineStatusKey(reservation);
        const priority = getOnlinePriorityMeta(reservation);

        acc.total += 1;
        if (statusKey === 'new') acc.newCount += 1;
        if (statusKey === 'contacted') acc.contactedCount += 1;
        if (statusKey === 'confirmed') acc.confirmedCount += 1;
        if (priority.key === 'urgent') acc.urgentCount += 1;

        return acc;
      }, {
        total: 0,
        newCount: 0,
        contactedCount: 0,
        confirmedCount: 0,
        urgentCount: 0,
      });
    }

    const baseStats = {
      active: 0,
      upcoming: 0,
      monthRevenue: 0,
      totalRevenue: 0,
      totalToCollect: 0,
      totalCollected: 0,
      totalUncollected: 0,
      extendedContracts: 0,
      extensionEvents: 0,
      filteredCount: 0,
      filterLabel: ''
    };

    if (!reservations || reservations.length === 0) {
      return baseStats;
    }

    const currentDate = new Date();
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(currentDate.getDate() + 7);

    const matchesFinanceFilter = (reservation) => {
      const sourceDate = reservation.date_debut || reservation.date_creation;
      if (!sourceDate) return financeFilterType === 'all';
      const parsed = new Date(sourceDate);
      if (Number.isNaN(parsed.getTime())) return false;

      if (financeFilterType === 'all') return true;
      if (financeFilterType === 'year') {
        return parsed.getFullYear() === financeFilterYear;
      }
      return parsed.getFullYear() === financeFilterYear && (parsed.getMonth() + 1) === financeFilterMonth;
    };

    const computed = reservations.reduce((acc, reservation) => {
      const status = (reservation.statut || '').toLowerCase();
      if (status === 'en_cours' || status === 'confirme') {
        acc.active += 1;
      }

      const total = Number(reservation.montant_total) || 0;
      acc.totalRevenue += total;

      if (reservation.date_debut) {
        const startDate = new Date(reservation.date_debut);
        if (!Number.isNaN(startDate.getTime())) {
          if (startDate >= currentDate && startDate <= nextWeek) {
            acc.upcoming += 1;
          }
          if (startDate >= monthStart && startDate <= currentDate) {
            acc.monthRevenue += total;
          }
        }
      }

      if (matchesFinanceFilter(reservation)) {
        const collected = Math.max(0, Number(reservation.avance) || 0);
        const toCollect = Math.max(0, total);
        const uncollected = Math.max(0, toCollect - collected);

        acc.filteredCount += 1;
        acc.totalToCollect += toCollect;
        acc.totalCollected += collected;
        acc.totalUncollected += uncollected;
      }

      if (isReservationExtended(reservation)) {
        acc.extendedContracts += 1;
      }
      acc.extensionEvents += countProlongationEvents(reservation.commentaire);

      return acc;
    }, baseStats);

    if (financeFilterType === 'all') {
      computed.filterLabel = 'Tous les contrats';
    } else if (financeFilterType === 'year') {
      computed.filterLabel = `Annee ${financeFilterYear}`;
    } else {
      const monthLabel = financialMonthOptions.find((m) => m.value === financeFilterMonth)?.label || `Mois ${financeFilterMonth}`;
      computed.filterLabel = `${monthLabel} ${financeFilterYear}`;
    }

    return computed;
  }, [reservations, isOnlineView, financeFilterType, financeFilterMonth, financeFilterYear, financialMonthOptions, getOnlineStatusKey, getOnlinePriorityMeta, isReservationExtended]);

  // Ouvrir la modale de suppression
  const openDeleteModal = (reservation) => {
    setDeleteModal({ show: true, reservation });
  };

  // Fermer la modale de suppression
  const closeDeleteModal = () => {
    setDeleteModal({ show: false, reservation: null });
  };

  // Confirmer la suppression
  const confirmDelete = async () => {
    const reservation = deleteModal.reservation;
    if (!reservation) return;

    try {
      await reservationsService.delete(reservation.id);
      setReservations(prev => prev.filter(r => r.id !== reservation.id));
      addNotification('Réservation supprimée avec succès', 'success');
    } catch (err) {
      console.error('Erreur suppression réservation:', err);
      const message = err.response?.data?.detail || "Impossible de supprimer la réservation";
      addNotification(message, 'error');
    } finally {
      closeDeleteModal();
    }
  };

  const handleExport = async () => {
    try {
      if (!filteredReservations.length) {
        addNotification('Aucune donnée à exporter', 'info');
        return;
      }

      const rows = filteredReservations.map((reservation) => {
        const carInfo = getCarInfo(reservation.voiture);
        const onlineStatus = getOnlineStatusMeta(reservation);
        const priority = getOnlinePriorityMeta(reservation);
        return {
          ID: reservation.id,
          Client: getClientName(reservation.client, reservation),
          Téléphone: reservation.client_telephone || getClientRecord(reservation.client)?.telephone || '—',
          'Conducteur secondaire': reservation.conducteur_secondaire
            ? getClientName(reservation.conducteur_secondaire)
            : 'N/A',
          Voiture: carInfo.display,
          Immatriculation: carInfo.immatriculation,
          'Date début': reservation.date_debut || '-',
          'Date fin': reservation.date_fin || '-',
          'Date demande': reservation.date_creation || '-',
          'Montant total (MAD)': Number(reservation.montant_total || 0),
          'Franchise (MAD)': Number(reservation.franchise || 0),
          Statut: isOnlineView ? onlineStatus.label : getStatusLabel(reservation.statut),
          Priorité: isOnlineView ? priority.label : '-',
          Origine: getOriginLabel(reservation)
        };
      });

      await exportExcel(isOnlineView ? 'reservations_online.xlsx' : 'reservations_professionnelles.xlsx', rows, isOnlineView ? 'Demandes Online' : 'Réservations');
      addNotification('Export généré avec succès', 'success');
    } catch (err) {
      console.error('Erreur export:', err);
      addNotification('Erreur lors de l\'export', 'error');
    }
  };

  if (loading) {
    return (
      <div className="reservations-professional-page">
        <Loader />
      </div>
    );
  }

  return (
    <div className="reservations-professional-page">
      {/* Alerte retours du jour */}
      {!isOnlineView && returnsToday.length > 0 && showReturnsAlert && (
        <div className="card returns-alert">
          <div className="returns-alert-header">
            <div>
              <h3 className="returns-alert-title">
                Retours prévus aujourd'hui ({returnsToday.length})
              </h3>
              <p className="returns-alert-subtitle">
                Voitures à récupérer
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost returns-alert-close"
              onClick={() => setShowReturnsAlert(false)}
            >
              Masquer
            </button>
          </div>

          <div className="returns-alert-list">
            {returnsToday.map(reservation => (
              <div key={reservation.id} className="return-card">
                <div className="return-card-info">
                  <div className="return-card-title">
                    <span>{reservation.voiture_display}</span>
                    <span className="return-card-plate">{reservation.voiture_immatriculation}</span>
                  </div>
                  <div className="return-card-client">
                    {reservation.client_nom} - {reservation.client_telephone}
                  </div>
                </div>
                <div className="return-card-actions">
                  <button
                    type="button"
                    onClick={() => handleMarkReturned(reservation.id)}
                    className="btn-primary"
                  >
                    Récupérer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="reservations-header">
        <div className="header-left">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">
            {subtitle || (isOnlineView
              ? `${stats.newCount} nouvelle${stats.newCount > 1 ? 's' : ''} demande${stats.newCount > 1 ? 's' : ''} - ${stats.urgentCount} urgente${stats.urgentCount > 1 ? 's' : ''} - ${stats.confirmedCount} confirmee${stats.confirmedCount > 1 ? 's' : ''}`
              : `${stats.filteredCount} contrat${stats.filteredCount > 1 ? 's' : ''} - Filtre: ${stats.filterLabel}`)}
          </p>
        </div>

        <div className="header-actions">
          <button className="btn-secondary" onClick={handleExport}>
            Exporter
          </button>
          {allowCreate && (
            <button className="btn-primary" onClick={() => navigate('/admin/reservations/add')}>
              Nouvelle réservation
            </button>
          )}
        </div>
      </div>

      {isOnlineView && pendingOnlineCount > 0 && (
        <div className="online-header-reminder">
          <span className="online-header-reminder-dot" aria-hidden="true" />
          <span>
            Vous avez <strong>{pendingOnlineCount}</strong> reservation
            {pendingOnlineCount > 1 ? 's' : ''} online non traitée
            {pendingOnlineCount > 1 ? 's' : ''}. Pensez à les traiter.
          </span>
        </div>
      )}

      {!isOnlineView && (
        <div className="stats-filter-bar">
          <label>
            Filtre
            <select value={financeFilterType} onChange={(e) => setFinanceFilterType(e.target.value)}>
              <option value="month">Mois</option>
              <option value="year">Annee</option>
              <option value="all">Tous</option>
            </select>
          </label>

          {financeFilterType === 'month' && (
            <label>
              Mois
              <select value={financeFilterMonth} onChange={(e) => setFinanceFilterMonth(Number(e.target.value))}>
                {financialMonthOptions.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </label>
          )}

          {financeFilterType !== 'all' && (
            <label>
              Annee
              <select value={financeFilterYear} onChange={(e) => setFinanceFilterYear(Number(e.target.value))}>
                {financialYearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="stats-grid">
        {isOnlineView ? (
          <>
            <div className="stat-card stat-active">
              <div className="stat-content">
                <div className="stat-label">Nouvelles demandes</div>
                <div className="stat-value">{stats.newCount}</div>
              </div>
            </div>

            <div className="stat-card stat-revenue">
              <div className="stat-content">
                <div className="stat-label">Demandes contactées</div>
                <div className="stat-value">{stats.contactedCount}</div>
              </div>
            </div>

            <div className="stat-card stat-total">
              <div className="stat-content">
                <div className="stat-label">Demandes confirmées</div>
                <div className="stat-value">{stats.confirmedCount}</div>
              </div>
            </div>

            <div className="stat-card stat-upcoming">
              <div className="stat-content">
                <div className="stat-label">Demandes urgentes</div>
                <div className="stat-value">{stats.urgentCount}</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="stat-card stat-revenue">
              <div className="stat-content">
                <div className="stat-label">Total encaissé</div>
                <div className="stat-value">{`${stats.totalCollected.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`}</div>
              </div>
            </div>

            <div className="stat-card stat-upcoming">
              <div className="stat-content">
                <div className="stat-label">Total non encaissé</div>
                <div className="stat-value">{`${stats.totalUncollected.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`}</div>
              </div>
            </div>

            <div className="stat-card stat-total">
              <div className="stat-content">
                <div className="stat-label">Total à encaisser</div>
                <div className="stat-value">{`${stats.totalToCollect.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`}</div>
              </div>
            </div>

            <div className="stat-card stat-active">
              <div className="stat-content">
                <div className="stat-label">Contrats prolongés</div>
                <div className="stat-value">{stats.extendedContracts}</div>
                <div className="stat-label">Avenants: {stats.extensionEvents}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search and Filters */}
      <div className="search-section">
        <div className="search-box">
          <span className="search-icon" aria-hidden="true" />
          <input
            type="text"
            className="search-input-pro"
            placeholder={isOnlineView ? 'Rechercher par client, telephone, voiture...' : 'Rechercher par client, voiture, immatriculation...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              className="search-clear"
              onClick={() => setSearch('')}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          )}
        </div>

        {(carFilter || unpaidOnly) && (
          <div className="filter-badges">
            {carFilter && (
              <span className="filter-chip">
                Filtre voiture #{carFilter}
              </span>
            )}
            {unpaidOnly && (
              <span className="filter-chip">
                Impayés uniquement
              </span>
            )}
            <button
              type="button"
              className="filter-clear"
              onClick={() => { setCarFilter(null); setUnpaidOnly(false); }}
            >
              Réinitialiser
            </button>
          </div>
        )}

        <div className="filter-buttons">
          <button 
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            {isOnlineView ? `Toutes (${reservations.length})` : `Toutes (${reservations.length})`}
          </button>
          {isOnlineView ? (
            <>
              <button 
                className={`filter-btn ${statusFilter === 'not_treated' ? 'active' : ''}`}
                onClick={() => setStatusFilter('not_treated')}
              >
                Non traitées
              </button>
              <button 
                className={`filter-btn ${statusFilter === 'treated' ? 'active' : ''}`}
                onClick={() => setStatusFilter('treated')}
              >
                Traitées
              </button>
            </>
          ) : (
            <>
              <button 
                className={`filter-btn ${statusFilter === 'en_cours' ? 'active' : ''}`}
                onClick={() => setStatusFilter('en_cours')}
              >
                En cours
              </button>
              <button 
                className={`filter-btn ${statusFilter === 'en_attente' ? 'active' : ''}`}
                onClick={() => setStatusFilter('en_attente')}
              >
                En attente
              </button>
              <button 
                className={`filter-btn ${statusFilter === 'termine' ? 'active' : ''}`}
                onClick={() => setStatusFilter('termine')}
              >
                Terminées
              </button>
              <button
                className={`filter-btn ${statusFilter === 'extended' ? 'active' : ''}`}
                onClick={() => setStatusFilter('extended')}
              >
                Prolongés ({extendedContractsCount})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="reservations-content">
        {error ? (
          <div className="error-state">
            <span className="state-icon state-icon-error" aria-hidden="true" />
            <p>Erreur: {error}</p>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="empty-state">
            <span className="state-icon state-icon-list" aria-hidden="true" />
            <h3>Aucune réservation trouvée</h3>
            <p>
              {search || statusFilter !== 'all' 
                ? 'Aucun résultat ne correspond à vos critères' 
                : isOnlineView
                  ? 'Aucune demande client en ligne n\'est disponible pour le moment'
                  : 'Commencez par créer votre première réservation'}
            </p>
            {!isOnlineView && !search && statusFilter === 'all' && (
              <button className="btn-add-empty" onClick={() => navigate('/admin/reservations/add')}>
                Créer une réservation
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-info">
              <span>
                {isOnlineView
                  ? `Affichage de ${displayedReservations.length} demande${displayedReservations.length > 1 ? 's' : ''} online`
                  : `Affichage de ${displayedReservations.length} réservation${displayedReservations.length > 1 ? 's' : ''}`}
              </span>
            </div>

            {isOnlineView ? (
              <div className="table-card reservations-table-wrapper reservations-table-wrapper--online">
                <table className="data-table table-header-sticky online-requests-table">
                  <thead>
                    <tr>
                      <th className="col-client">Client</th>
                      <th className="col-vehicle">Véhicule demandé</th>
                      <th className="col-period">Dates</th>
                      <th className="col-total text-right">Prix estimé</th>
                      <th className="col-request text-center">Date demande</th>
                      <th className="col-status text-center">Statut online</th>
                      <th className="col-actions text-center">Actions rapides</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedReservations.map((reservation) => {
                      const carInfo = getCarInfo(reservation.voiture);
                      const contact = getClientContactInfo(reservation);
                      const rawDays = Number.isFinite(Number(reservation.nombre_jours)) ? Number(reservation.nombre_jours) : null;
                      const fallbackDays = calculateDays(reservation.date_debut, reservation.date_fin);
                      const days = Math.max(rawDays || fallbackDays, fallbackDays);
                      const onlineStatus = getOnlineStatusMeta(reservation);
                      const priority = getOnlinePriorityMeta(reservation);
                      const amountTotal = formatMoney(reservation.montant_total || (days * (Number(reservation.prix_journalier) || 0)));
                      const dateRange = `${reservation.date_debut || '-'} → ${reservation.date_fin || '-'}`;

                      return (
                        <tr
                          key={reservation.id}
                          className={`data-row online-request-row ${priority.className}`}
                          onClick={() => openReservationTimeline(reservation)}
                        >
                          <td className="col-client">
                            <div className="online-client-cell">
                              <span className="client-name">{getClientName(reservation.client, reservation)}</span>
                              <span className="online-client-phone">{contact.phone || 'Telephone non renseigne'}</span>
                            </div>
                          </td>
                          <td className="col-vehicle">
                            <div className="vehicle-cell">
                              <span className="vehicle-name">{carInfo.display}</span>
                              <span className="vehicle-plate">{carInfo.immatriculation || '—'}</span>
                            </div>
                          </td>
                          <td className="col-period">
                            <div className="period-cell">
                              <span className="period-range">{dateRange}</span>
                              <span className="period-duration">{days} jour{days > 1 ? 's' : ''}</span>
                            </div>
                          </td>
                          <td className="col-total text-right">
                            <span className="amount-text">{amountTotal}</span>
                          </td>
                          <td className="col-request text-center">
                            <div className="online-request-date">
                              <span>{formatRequestDateTime(reservation.date_creation)}</span>
                            </div>
                          </td>
                          <td className="col-status text-center">
                            <div className="online-status-stack">
                              <span className={`status-pill ${onlineStatus.className}`}>{onlineStatus.label}</span>
                            </div>
                          </td>
                          <td className="col-actions text-center" onClick={(event) => event.stopPropagation()}>
                            <div className="online-actions">
                              <button
                                type="button"
                                className="btn-online btn-online-contact"
                                onClick={() => handleCallClient(reservation)}
                              >
                                <Phone size={16} />
                                <span>Contact</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="table-card reservations-table-wrapper">
                <table className="data-table table-header-sticky">
                  <thead>
                    <tr>
                      <th className="col-client">Client</th>
                      <th className="col-vehicle">Véhicule</th>
                      <th className="col-period">Période</th>
                      <th className="col-total text-right">Montant total</th>
                      <th className="col-contract text-center">N° Contrat</th>
                      <th className="col-franchise text-center">Franchise</th>
                      <th className="col-status text-center">Statut</th>
                      <th className="col-actions text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedReservations.map((reservation) => {
                      const carInfo = getCarInfo(reservation.voiture);
                      const rawDays = Number.isFinite(Number(reservation.nombre_jours))
                        ? Number(reservation.nombre_jours)
                        : null;
                      const prolongation = getProlongationDays(reservation);
                      const prolongationEvents = countProlongationEvents(reservation.commentaire);
                      const isExtended = isReservationExtended(reservation);
                      const fallbackDays = calculateDays(reservation.date_debut, reservation.date_fin);
                      const baseDays = rawDays && rawDays > 0 ? rawDays : fallbackDays;
                      const days = Math.max(0, Math.max(baseDays + prolongation, fallbackDays));
                      const statusKey = (reservation.statut || '').toLowerCase();
                      const statusClassName = `status-pill status-${statusKey || 'default'}`;
                      const dateRange = `${reservation.date_debut || '-'} → ${reservation.date_fin || '-'}`;
                      let computedTotal = parseFloat(reservation.montant_total) || 0;
                      const tarifSpec = parseFloat(reservation.tarif_special);
                      if (Number.isFinite(tarifSpec) && tarifSpec > 0 && days > 0) {
                        const months = Math.max(1, Math.ceil(days / 30));
                        computedTotal = tarifSpec * months;
                      } else if (!computedTotal && days > 0 && parseFloat(reservation.prix_journalier)) {
                        computedTotal = days * parseFloat(reservation.prix_journalier);
                      }
                      const amountTotal = computedTotal
                        ? `${computedTotal.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`
                        : '-';
                      const franchiseValue = reservation.franchise
                        ? `${parseFloat(reservation.franchise).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`
                        : '-';
                      const contractNumber = reservation.numero_contrat || '—';

                      return (
                        <tr key={reservation.id} className="data-row" onClick={() => navigate(`/admin/reservations/view/${reservation.id}`)}>
                          <td className="col-client">
                            <div className="client-cell">
                              <span className="client-name">{getClientName(reservation.client, reservation)}</span>
                            </div>
                          </td>
                          <td className="col-vehicle">
                            <div className="vehicle-cell">
                              <span className="vehicle-name">{carInfo.display}</span>
                              <span className="vehicle-plate">{carInfo.immatriculation || '—'}</span>
                            </div>
                          </td>
                          <td className="col-period">
                            <div className="period-cell">
                              <span className="period-range">{dateRange}</span>
                              <span className="period-duration">{days} jour{days > 1 ? 's' : ''}</span>
                              {isExtended && (
                                <span className="prolongation-badge">
                                  {prolongation > 0 ? `+${prolongation} j` : 'Prolongé'}
                                  {prolongationEvents > 0 ? ` • ${prolongationEvents}x` : ''}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="col-total text-right">
                            <span className="amount-text">{amountTotal}</span>
                          </td>
                          <td className="col-contract text-center">
                            <span className="contract-text">{contractNumber}</span>
                          </td>
                          <td className="col-franchise text-center">
                            <span className="amount-text muted">{franchiseValue}</span>
                          </td>
                          <td className="col-status text-center">
                            <span className={statusClassName}>{getStatusLabel(reservation.statut)}</span>
                          </td>
                          <td className="col-actions text-center" onClick={(event) => event.stopPropagation()}>
                            <div className="table-actions">
                              <button title="Modifier" onClick={() => navigate(`/admin/reservations/edit/${reservation.id}`)} className="btn-secondary">
                                <Pencil size={13} strokeWidth={2.2} />
                                <span className="action-label">Modifier</span>
                              </button>
                              <button title="Supprimer" onClick={() => openDeleteModal(reservation)} className="btn-danger">
                                <Trash2 size={13} strokeWidth={2.2} />
                                <span className="action-label">Supprimer</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
      {activeReservation && (
        <ReservationTimelineModal
          reservation={activeReservation.reservation}
          client={activeReservation.client}
          car={activeReservation.car}
          onClose={() => setActiveReservation(null)}
        />
      )}

      {contactCardReservation && (() => {
        const contactCard = getOnlineContactCardData(contactCardReservation);
        return (
          <div className="modal-overlay" onClick={() => setContactCardReservation(null)}>
            <div
              className="modal-card online-contact-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="online-contact-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="online-contact-card__header">
                <div>
                  <p className="online-contact-card__eyebrow">Demande client</p>
                  <h3 id="online-contact-title" className="modal-title">Carte contact</h3>
                </div>
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Terminer"
                  onClick={() => setContactCardReservation(null)}
                >
                  &times;
                </button>
              </div>

              <div className="online-contact-card__body">
                <section className="online-contact-card__section">
                  <h4>Informations client</h4>
                  <div className="online-contact-card__grid">
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">Nom complet</span>
                      <strong>{contactCard.fullName}</strong>
                    </div>
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">Nom</span>
                      <strong>{contactCard.lastName}</strong>
                    </div>
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">Prénom</span>
                      <strong>{contactCard.firstName}</strong>
                    </div>
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">Email</span>
                      <strong>{contactCard.email}</strong>
                    </div>
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">Téléphone</span>
                      <strong>{contactCard.phone}</strong>
                    </div>
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">Date de naissance</span>
                      <strong>{contactCard.dateNaissance}</strong>
                    </div>
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">Ville</span>
                      <strong>{contactCard.city}</strong>
                    </div>
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">Adresse</span>
                      <strong>{contactCard.address}</strong>
                    </div>
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">CIN</span>
                      <strong>{contactCard.cin}</strong>
                    </div>
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">Numéro de permis</span>
                      <strong>{contactCard.permis}</strong>
                    </div>
                  </div>
                </section>

                <section className="online-contact-card__section">
                  <h4>Détails de la demande</h4>
                  <div className="online-contact-card__grid">
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">Véhicule demandé</span>
                      <strong>{contactCard.carName}</strong>
                    </div>
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">Date de début</span>
                      <strong>{contactCard.startDate}</strong>
                    </div>
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">Date de fin</span>
                      <strong>{contactCard.endDate}</strong>
                    </div>
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">Lieu de livraison</span>
                      <strong>{contactCard.pickupLocation}</strong>
                    </div>
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">Lieu de récupération</span>
                      <strong>{contactCard.dropoffLocation}</strong>
                    </div>
                    <div className="online-contact-card__item">
                      <span className="online-contact-card__label">Date de la demande</span>
                      <strong>{contactCard.requestDate}</strong>
                    </div>
                  </div>
                </section>

                <section className="online-contact-card__section">
                  <h4>Note client</h4>
                  <div className="online-contact-card__grid">
                    <div className="online-contact-card__item online-contact-card__item--full">
                      <p>{contactCard.noteClient}</p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="modal-footer center online-contact-card__footer">
                <button type="button" className="btn-secondary" onClick={() => setContactCardReservation(null)}>
                  Terminer
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    handleOnlineStatusUpdate(contactCardReservation, 'contacted');
                    setContactCardReservation(null);
                  }}
                >
                  Traiter cette demande
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modale de confirmation de suppression */}
      {deleteModal.show && deleteModal.reservation && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-reservation-title"
            aria-describedby="delete-reservation-description"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-icon danger" aria-hidden="true">!</div>
            <h3 id="delete-reservation-title" className="modal-title">
              Supprimer cette réservation ?
            </h3>
            <p id="delete-reservation-description" className="modal-description">
              Vous êtes sur le point de supprimer définitivement la réservation de{' '}
              <strong>{getClientName(deleteModal.reservation.client, deleteModal.reservation)}</strong> pour le véhicule{' '}
              <strong>{getCarInfo(deleteModal.reservation.voiture).display}</strong>.
              Cette action est irréversible.
            </p>
            <div className="modal-summary">
              <div className="modal-summary-row">
                <span className="modal-summary-label">Période</span>
                <span className="modal-summary-value">
                  {deleteModal.reservation.date_debut} → {deleteModal.reservation.date_fin}
                </span>
              </div>
              <div className="modal-summary-row">
                <span className="modal-summary-label">Immatriculation</span>
                <span className="modal-summary-value">
                  {getCarInfo(deleteModal.reservation.voiture).immatriculation}
                </span>
              </div>
              <div className="modal-summary-row">
                <span className="modal-summary-label">Montant</span>
                <span className="modal-summary-value">
                  {deleteModal.reservation.montant_total 
                    ? `${parseFloat(deleteModal.reservation.montant_total).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`
                    : '-'}
                </span>
              </div>
            </div>
            <div className="modal-footer center">
              <button type="button" className="btn-secondary" onClick={closeDeleteModal}>
                Annuler
              </button>
              <button type="button" onClick={confirmDelete} className="btn-danger">
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Prolongation / Avance */}
      {paModal.show && (
        <div
          className="modal-overlay pa-modal-overlay"
          onClick={closePAModal}
        >
          <div
            className="modal-card light pa-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pa-reservation-title"
            aria-describedby="pa-reservation-description"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header pa-modal-header">
              <div>
                <p className="modal-eyebrow">Gestion de la location</p>
                <h3 id="pa-reservation-title" className="modal-title">Prolongation / Avance</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Fermer la fenêtre"
                onClick={closePAModal}
              >
                &times;
              </button>
            </div>
            <div className="modal-body pa-modal-body">
              <div className="extend-modal-highlight pa-summary-card">
                <p className="extend-modal-highlight-title">{paModal.reservation?.voiture_display || paModal.reservation?.vehicule_nom}</p>
                <p className="extend-modal-highlight-meta">Client: {paModal.reservation?.client_nom}</p>
                <p className="extend-modal-highlight-meta">Date fin actuelle: {paModal.reservation?.date_fin || '—'}</p>
                <p className="extend-modal-highlight-meta">Date fin projetée: {paComputed.projectedEndDate || '—'}</p>
                <p className="extend-modal-highlight-meta">Durée actuelle: {paComputed.currentTotalDays} jour{paComputed.currentTotalDays > 1 ? 's' : ''}</p>
                <p className="extend-modal-highlight-meta">Durée après prolongation: {paComputed.projectedTotalDays} jour{paComputed.projectedTotalDays > 1 ? 's' : ''}</p>
              </div>

              <div className="pa-finance-grid">
                <div className="pa-finance-card extension">
                  <span className="pa-finance-label">Montant prolongation</span>
                  <strong className="pa-finance-value">{formatMoney(paComputed.extensionAmount)}</strong>
                </div>
                <div className="pa-finance-card total">
                  <span className="pa-finance-label">Total projeté réservation</span>
                  <strong className="pa-finance-value">{formatMoney(paComputed.projectedTotal)}</strong>
                </div>
                <div className="pa-finance-card paid">
                  <span className="pa-finance-label">Dernière avance</span>
                  <strong className="pa-finance-value">
                    {paModal.lastAdvanceAmount == null ? '—' : formatMoney(paModal.lastAdvanceAmount)}
                  </strong>
                </div>
                <div className="pa-finance-card remaining">
                  <span className="pa-finance-label">Reste à payer</span>
                  <strong className="pa-finance-value">{formatMoney(paComputed.projectedRemaining)}</strong>
                </div>
              </div>

              {paModal.loadingSummary && (
                <div className="pa-summary-loading">Mise à jour des montants...</div>
              )}

              <div className="pa-form-grid">
                <div className="modal-form-group modal-form-group-wide">
                  <label className="pa-checkbox-row" htmlFor="pa-long-duration-toggle">
                    <input
                      id="pa-long-duration-toggle"
                      type="checkbox"
                      checked={Boolean(paModal.longDurationEnabled)}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setPaModal((prev) => ({
                          ...prev,
                          longDurationEnabled: enabled,
                          days: enabled ? '' : prev.days,
                        }));
                      }}
                    />
                    <span>Prolongation longue duree (mois / annees)</span>
                  </label>
                </div>

                {paModal.longDurationEnabled && (
                  <>
                    <div className="modal-form-group">
                      <label htmlFor="pa-long-duration-count">Duree</label>
                      <input
                        id="pa-long-duration-count"
                        type="number"
                        min="1"
                        className="input pa-input"
                        value={paModal.longDurationCount}
                        onChange={(e) => setPaModal((prev) => ({ ...prev, longDurationCount: e.target.value }))}
                        onWheel={(e) => e.target.blur()}
                      />
                    </div>

                    <div className="modal-form-group">
                      <label htmlFor="pa-long-duration-unit">Unite</label>
                      <select
                        id="pa-long-duration-unit"
                        className="input pa-input"
                        value={paModal.longDurationUnit}
                        onChange={(e) => setPaModal((prev) => ({ ...prev, longDurationUnit: e.target.value }))}
                      >
                        {longDurationUnitOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="modal-form-group">
                  <label htmlFor="pa-days-input">Nombre de jours supplémentaires</label>
                  <input
                    id="pa-days-input"
                    type="number"
                    min="0"
                    className="input pa-input"
                    value={paModal.days}
                    onChange={(e) => setPaModal(prev => ({ ...prev, days: e.target.value }))}
                    onWheel={(e) => e.target.blur()}
                    disabled={Boolean(paModal.longDurationEnabled)}
                    placeholder="Ex: 3"
                  />
                </div>

                <div className="modal-form-group">
                  <label htmlFor="pa-target-date-input">Nouvelle date fin (optionnelle, prioritaire)</label>
                  <input
                    id="pa-target-date-input"
                    type="date"
                    className="input pa-input"
                    value={paModal.longDurationEnabled ? getLongDurationTargetDate(paModal) : paModal.targetDate}
                    onChange={(e) => setPaModal(prev => ({ ...prev, targetDate: e.target.value }))}
                    disabled={Boolean(paModal.longDurationEnabled)}
                  />
                </div>

                <div className="modal-form-group">
                  <label htmlFor="pa-advance-input">Montant d'avance (optionnel)</label>
                  <input
                    id="pa-advance-input"
                    type="number"
                    min="0"
                    step="0.01"
                    className="input pa-input"
                    value={paModal.advanceAmount}
                    onChange={(e) => setPaModal(prev => ({ ...prev, advanceAmount: e.target.value }))}
                    onWheel={(e) => e.target.blur()}
                    placeholder="Ex: 500"
                  />
                </div>

                <div className="modal-form-group">
                  <label htmlFor="pa-method-input">Méthode de paiement</label>
                  <select
                    id="pa-method-input"
                    className="input pa-input"
                    value={paModal.paymentMethod}
                    onChange={(e) => setPaModal(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    {paymentMethodOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pa-help-block">
                <small id="pa-reservation-description" className="modal-description pa-description">
                  Vous pouvez saisir une prolongation en jours, une date de fin, ou activer la longue duree en mois/annees, puis ajouter une avance si besoin.
                </small>
              </div>
            </div>
            <div className="modal-footer pa-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={closePAModal}
              >
                Annuler
              </button>
              <button type="button" className="btn-primary" onClick={handlePAUpdate}>
                Valider P/A
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReservationsProfessional;
