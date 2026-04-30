import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLocation, useNavigate, useParams } from 'react-router-dom';

import apiClient from '../api/apiClient';

import Loader from '../components/Loader';
import PageHeader from '../components/PageHeader';
import FormInput from '../components/FormInput';

import { useNotification } from '../contexts/NotificationContext';

import '../styles/pages.css';

import '../styles/add-reservation.css';



const PAYMENT_METHOD_LABELS = {

  CASH: 'Espèces',

  CARD: 'Carte Bancaire',

  CHEQUE: 'Chèque',

  TPE: 'TPE',

  TRANSFER: 'Virement',

  OTHER: 'Autre',

};



const AVAILABLE_CAR_STATUSES = ['disponible', 'libre', 'free', 'available'];
const UNAVAILABLE_CAR_STATUSES = [
  'loue', 'louee', 'louée', 'loueé',
  'reserve', 'reservee', 'réservee', 'réservée', 'reservée',
  'en_cours', 'en cours', 'en location', 'occupation',
  'maintenance', 'entretien', 'panne', 'vendue',
];
const ACTIVE_RESERVATION_STATUSES = [
  'en_cours', 'en cours',
  'planifiee', 'planifiée', 'planifie', 'planifié',
  'confirmée', 'confirmee', 'confirmé', 'confirme',
  'active', 'en_attente', 'en attente',
  'reservee', 'réservée', 'reserve', 'reservée', 'reservec',
];

const truthyFlag = (value) => value === true || value === 'true' || value === 1;

const normalizeId = (value) => {
  if (value == null) {
    return null;
  }
  if (typeof value === 'object') {
    if ('id' in value) {
      return normalizeId(value.id);
    }
    return null;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return String(numeric);
  }
  return String(value);
};

const isReservationActiveLike = (reservation) => {
  if (!reservation) {
    return false;
  }
  const status = (reservation.statut || reservation.status || '')
    .toString()
    .trim()
    .toLowerCase();

  if (status && ACTIVE_RESERVATION_STATUSES.includes(status)) {
    return true;
  }

  const flags = [
    reservation.active,
    reservation.is_active,
    reservation.est_active,
    reservation.reservation_active,
    reservation.en_cours,
    reservation.enCours,
  ];
  return flags.some(truthyFlag);
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LONG_DURATION_COUNT = 3;
const DEFAULT_LONG_DURATION_UNIT = 'YEARS';

const addMonthsSafe = (dateValue, months) => {
  const source = new Date(dateValue);
  if (Number.isNaN(source.getTime())) return null;

  const day = source.getDate();
  const next = new Date(source);
  next.setMonth(next.getMonth() + months);

  // Keep same day-of-month when possible, else clamp to month end.
  if (next.getDate() < day) {
    next.setDate(0);
  }
  return next;
};

const addYearsSafe = (dateValue, years) => addMonthsSafe(dateValue, years * 12);

const longDurationToMonths = (count, unit) => {
  const safeCount = Math.max(1, parseInt(count, 10) || 1);
  return unit === 'MONTHS' ? safeCount : safeCount * 12;
};

const computeRentalDays = (startDate, endDate) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  if (end && !Number.isNaN(end.getTime()) && !Number.isNaN(start.getTime())) {
    const rawDiff = Math.round((end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0)) / DAY_MS);
    // Durée calculée en jours calendaires (fin exclusive)
    return Math.max(1, rawDiff);
  }
  return Math.max(1, 1);
};

const hasActiveContractOrRental = (car) => {
  if (!car) return false;
  const status = (car.statut || car.status || '').toString().toLowerCase();
  if (UNAVAILABLE_CAR_STATUSES.includes(status)) return true;

  const flags = [
    car.en_location,
    car.has_active_contract,
    car.has_active_reservation,
    car.active_contract,
    car.active_reservation,
    car.contract_active,
    car.contrat_actif,
    car.contrat_en_cours,
    car.reservation_en_cours,
    car.en_cours_location,
    car.est_loue,
    car.estLouee,
    car.is_rented,
  ];
  if (flags.some((flag) => flag === true || flag === 'true' || flag === 1)) return true;

  // If an active reservation object exists
  if (car.current_reservation || car.reservation_active) return true;
  return false;
};

const isCarAvailable = (car) => {
  if (!car) return false;
  if (hasActiveContractOrRental(car)) return false;

  const status = (car.statut || car.status || '').toString().trim().toLowerCase();
  if (!status) {
    return true;
  }

  if (UNAVAILABLE_CAR_STATUSES.includes(status)) {
    return false;
  }

  if (AVAILABLE_CAR_STATUSES.includes(status)) {
    return true;
  }

  // Statuts inconnus considérés disponibles s'ils ne sont pas marqués indisponibles
  return true;
};



const todayIso = () => new Date().toISOString().split('T')[0];



const formatMoney = (value) => {

  const amount = Number.parseFloat(value);

  if (Number.isNaN(amount)) {

    return '0,00 DH';

  }

  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;

};



function AddReservation() {

  const { id } = useParams();

  const isEdit = Boolean(id);

  const navigate = useNavigate();

  const location = useLocation();

  const { addNotification } = useNotification();

  const today = useMemo(() => todayIso(), []);

  const showFullSidebar = !isEdit;



  const [initializing, setInitializing] = useState(true);

  const [cars, setCars] = useState([]);

  const [clients, setClients] = useState([]);
  const [activeCarIds, setActiveCarIds] = useState(new Set());

  const [form, setForm] = useState({
    voiture: '',
    client: '',
    conducteur_secondaire: '',
    date_debut: todayIso(),
    heure_depart: '',
    date_fin: '',
    heure_retour: '',
    nombre_jours: '1',
    jours_prolongation: '0',
    prix_journalier: '',
    tarif_special: '',
    avance: '0',
    franchise: '0',
    long_duration: false,
    long_duration_count: String(DEFAULT_LONG_DURATION_COUNT),
    long_duration_unit: DEFAULT_LONG_DURATION_UNIT,
    billing_mode: 'JOURNALIER',
    numero_contrat: '',
    methode_paiement: 'CASH',
    commentaire: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Search states for autocomplete fields
  const [carSearch, setCarSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [secondarySearch, setSecondarySearch] = useState('');
  const [carDropdownOpen, setCarDropdownOpen] = useState(false);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [secondaryDropdownOpen, setSecondaryDropdownOpen] = useState(false);
  const carRef = useRef(null);
  const clientRef = useRef(null);
  const secondaryRef = useRef(null);

  const uniqueById = useCallback((list) => {
    const seen = new Set();
    return (list || []).filter((item) => {
      const key = item && item.id;
      if (key == null || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);



  const emitGeneralError = useCallback((message) => {

    setErrors((prev) => ({ ...prev, general: message }));

    addNotification(message, 'error');

  }, [addNotification]);



  const clearGeneralError = useCallback(() => {

    setErrors((prev) => {

      if (!prev || prev.general == null) {

        return prev;

      }

      const next = { ...prev };

      delete next.general;

      return next;

    });

  }, []);



  useEffect(() => {

    const normalizePayload = (data) => (

      Array.isArray(data) ? data : data?.results ?? data?.items ?? []

    );



    const load = async () => {

      try {

        const [carsRes, clientsRes, activeRes] = await Promise.all([
          apiClient.get('/cars/voitures/'),
          apiClient.get('/clients/'),
          apiClient
            .get('/reservations/?active=true')
            .catch(() => apiClient.get('/reservations/?status=en_cours'))
            .catch(() => null),
        ]);



        const carsPayload = normalizePayload(carsRes.data) || [];
        const uniqueCars = uniqueById(carsPayload);

        const activeReservations = normalizePayload(activeRes?.data) || [];
        const activeIds = new Set(
          activeReservations
            .filter((reservation) => isReservationActiveLike(reservation))
            .map((res) => normalizeId(res.voiture ?? res.voiture_id))
            .filter(Boolean)
        );
        setActiveCarIds(activeIds);

        // Ne garder que les voitures disponibles en création (pas d'active reservation)
        setCars(
          isEdit
            ? uniqueCars
            : uniqueCars.filter((car) => isCarAvailable(car) && !activeIds.has(normalizeId(car.id)))
        );

        setClients(normalizePayload(clientsRes.data) || []);



        if (isEdit) {

            const reservationRes = await apiClient.get(`/reservations/${id}/`);

            const reservation = reservationRes.data;

            setForm({

              voiture: reservation.voiture != null ? String(reservation.voiture) : '',

              client: reservation.client != null ? String(reservation.client) : '',

              conducteur_secondaire: reservation.conducteur_secondaire != null ? String(reservation.conducteur_secondaire) : '',

              date_debut: reservation.date_debut || todayIso(),

              heure_depart: reservation.heure_depart || '',

              date_fin: reservation.date_fin || '',

              heure_retour: reservation.heure_retour || '',

              nombre_jours: reservation.nombre_jours != null ? String(reservation.nombre_jours) : '1',

              jours_prolongation: reservation.jours_prolongation != null ? String(reservation.jours_prolongation) : '0',

              prix_journalier: reservation.prix_journalier != null ? String(reservation.prix_journalier) : '',

              tarif_special: reservation.tarif_special != null ? String(reservation.tarif_special) : '',

              avance: reservation.avance != null ? String(reservation.avance) : '0',

              franchise: reservation.franchise != null ? String(reservation.franchise) : '0',

              long_duration: Boolean(reservation.long_duration),
              long_duration_count: String(DEFAULT_LONG_DURATION_COUNT),
              long_duration_unit: DEFAULT_LONG_DURATION_UNIT,

              billing_mode: reservation.billing_mode || 'JOURNALIER',

              numero_contrat: reservation.numero_contrat != null ? String(reservation.numero_contrat) : '',

              methode_paiement: reservation.methode_paiement || 'CASH',

              commentaire: reservation.commentaire || '',

            });

          }

      } catch (error) {

        console.error('Erreur lors du chargement des données de réservation :', error);

        emitGeneralError('Impossible de charger les données nécessaires.');

      } finally {

        setInitializing(false);

      }

    };



    load();

  }, [id, isEdit, emitGeneralError, uniqueById]);

  // Scroll to heure_retour when coming from "Récupérer"
  useEffect(() => {
    if (location?.state?.focusRetour && !initializing) {
      const el = document.getElementById('heure_retour');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }, 300);
      }
    }
  }, [initializing, location?.state?.focusRetour]);

  const selectableCars = useMemo(() => (

    cars.filter((car) => {

      const carIdNormalized = normalizeId(car.id);
      const available = isCarAvailable(car);

      const isCurrentSelection = String(car.id) === String(form.voiture);

      const hasActiveReservation = carIdNormalized ? activeCarIds.has(carIdNormalized) : false;

      if (isEdit) {
        return (available || isCurrentSelection) && (!hasActiveReservation || isCurrentSelection);
      }

      return available && !hasActiveReservation;

    })

  ), [cars, form.voiture, isEdit, activeCarIds]);



  const selectedCar = useMemo(() => (

    cars.find((car) => String(car.id) === String(form.voiture)) || null

  ), [cars, form.voiture]);



  const carOptions = useMemo(() => selectableCars, [selectableCars]);



  const selectedClient = useMemo(() => (

    clients.find((client) => String(client.id) === String(form.client)) || null

  ), [clients, form.client]);



  const clientOptions = useMemo(() => clients, [clients]);



  const secondaryDriver = useMemo(() => (

    clients.find((client) => String(client.id) === String(form.conducteur_secondaire)) || null

  ), [clients, form.conducteur_secondaire]);



  const secondaryOptions = useMemo(() => (

    clients.filter((client) => String(client.id) !== String(form.client))

  ), [clients, form.client]);

  // Filtered options for searchable dropdowns
  const filteredCars = useMemo(() => {
    if (!carSearch.trim()) return carOptions;
    const q = carSearch.toLowerCase();
    return carOptions.filter((c) =>
      [c.immatriculation, c.marque, c.modele].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [carOptions, carSearch]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clientOptions;
    const q = clientSearch.toLowerCase();
    return clientOptions.filter((c) =>
      [c.nom, c.prenom, c.telephone, c.cin, c.cin_numero].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [clientOptions, clientSearch]);

  const filteredSecondary = useMemo(() => {
    if (!secondarySearch.trim()) return secondaryOptions;
    const q = secondarySearch.toLowerCase();
    return secondaryOptions.filter((c) =>
      [c.nom, c.prenom, c.telephone, c.cin, c.cin_numero].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [secondaryOptions, secondarySearch]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (carRef.current && !carRef.current.contains(e.target)) setCarDropdownOpen(false);
      if (clientRef.current && !clientRef.current.contains(e.target)) setClientDropdownOpen(false);
      if (secondaryRef.current && !secondaryRef.current.contains(e.target)) setSecondaryDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);



  const selectedCarName = useMemo(() => {

    if (!selectedCar) {

      return '';

    }

    const name = `${selectedCar.marque || ''} ${selectedCar.modele || ''}`.trim();

    return name || selectedCar.immatriculation || 'véhicule Sélectionné';

  }, [selectedCar]);



  const selectedClientName = useMemo(() => {

    if (!selectedClient) {

      return '';

    }

    const name = `${selectedClient.nom || ''} ${selectedClient.prenom || ''}`.trim();

    if (name) {

      return name;

    }

    if (selectedClient.telephone) {

      return selectedClient.telephone;

    }

    return 'Client Sélectionné';

  }, [selectedClient]);



  const secondaryDriverName = useMemo(() => {

    if (!secondaryDriver) {

      return '';

    }

    const name = `${secondaryDriver.nom || ''} ${secondaryDriver.prenom || ''}`.trim();

    if (name) {

      return name;

    }

    if (secondaryDriver.telephone) {

      return secondaryDriver.telephone;

    }

    return 'Conducteur secondaire';

  }, [secondaryDriver]);



  const carStatusInfo = useMemo(() => {

    if (!selectedCar?.statut) {

      return null;

    }

    const raw = selectedCar.statut.toLowerCase();

    const map = {
      disponible: { label: 'Disponible', className: 'status-libre' },
      loue: { label: 'Louée', className: 'status-loue' },
      louee: { label: 'Louée', className: 'status-loue' },
      'louée': { label: 'Louée', className: 'status-loue' },
      reservee: { label: 'Réservée', className: 'status-reserve' },
      'réservée': { label: 'Réservée', className: 'status-reserve' },
      reserve: { label: 'Réservée', className: 'status-reserve' },
      en_cours: { label: 'En cours', className: 'status-reserve' },
      entretien: { label: 'Entretien', className: 'status-maintenance' },
      maintenance: { label: 'Maintenance', className: 'status-maintenance' },
    };

    const match = map[raw];

    if (match) {

      return match;

    }

    return { label: selectedCar.statut, className: 'status-default' };

  }, [selectedCar]);



  const carQuickFacts = useMemo(() => {

    if (!selectedCar) {

      return [];

    }

    const facts = [];

    if (selectedCar.prix_journalier != null) {

      facts.push({ label: 'Tarif journalier', value: formatMoney(selectedCar.prix_journalier) });

    }

    if (selectedCar.kilometrage != null && selectedCar.kilometrage !== '') {

      const numeric = Number(selectedCar.kilometrage);

      const display = Number.isFinite(numeric)

        ? `${numeric.toLocaleString('fr-MA')} km`

        : `${selectedCar.kilometrage}`;

      facts.push({ label: 'Kilométrage', value: display });

    }

    if (selectedCar.carburant) {

      facts.push({ label: 'Carburant', value: selectedCar.carburant });

    }

    if (selectedCar.categorie) {

      facts.push({ label: 'Catégorie', value: selectedCar.categorie });

    }

    return facts;

  }, [selectedCar]);



  const clientQuickFacts = useMemo(() => {

    if (!selectedClient) {

      return [];

    }

    const facts = [];

    if (selectedClient.email) {

      facts.push({ label: 'Email', value: selectedClient.email });

    }

    if (selectedClient.cin || selectedClient.cin_numero) {

      const cinValue = selectedClient.cin ?? selectedClient.cin_numero;

      facts.push({ label: 'CIN', value: cinValue });

    }

    if (selectedClient.ville) {

      facts.push({ label: 'Ville', value: selectedClient.ville });

    }

    return facts;

  }, [selectedClient]);



  const secondaryQuickFacts = useMemo(() => {

    if (!secondaryDriver) {

      return [];

    }

    const facts = [];

    if (secondaryDriver.cin || secondaryDriver.cin_numero) {

      const cinValue = secondaryDriver.cin ?? secondaryDriver.cin_numero;

      facts.push({ label: 'CIN', value: cinValue });

    }

    return facts;

  }, [secondaryDriver]);



  const renderCarSummary = useCallback((compact = false) => {

    if (!selectedCar) {

      return (

        <div className="selection-empty">Sélectionnez une voiture pour voir les détails.</div>

      );

    }



    return (

      <div className={`selection-summary ${compact ? 'compact' : ''}`}>

        <div className="summary-title-row">

          <span className="summary-main">{selectedCarName}</span>

          {carStatusInfo && (

            <span className={`status-pill ${carStatusInfo.className}`}>

              {carStatusInfo.label}

            </span>

          )}

        </div>

        {selectedCar.immatriculation && (

          <div className="summary-subtitle">{selectedCar.immatriculation}</div>

        )}

        {carQuickFacts.length > 0 && (

          <div className="summary-list">

            {carQuickFacts.map((item) => (

              <div key={item.label} className="summary-item">

                <span className="summary-key">{item.label}</span>

                <span className="summary-value">{item.value}</span>

              </div>

            ))}

          </div>

        )}

      </div>

    );

  }, [selectedCar, selectedCarName, carStatusInfo, carQuickFacts]);



  const renderClientSummary = useCallback((compact = false) => {

    if (!selectedClient) {

      return (

        <div className="selection-empty">Sélectionnez un client pour voir les détails.</div>

      );

    }



    return (

      <div className={`selection-summary ${compact ? 'compact' : ''}`}>

        <div className="summary-title-row">

          <span className="summary-main">{selectedClientName}</span>

        </div>

        {selectedClient.telephone && (

          <div className="summary-subtitle">{selectedClient.telephone}</div>

        )}

        {clientQuickFacts.length > 0 && (

          <div className="summary-list">

            {clientQuickFacts.map((item) => (

              <div key={item.label} className="summary-item">

                <span className="summary-key">{item.label}</span>

                <span className="summary-value">{item.value}</span>

              </div>

            ))}

          </div>

        )}

        {isEdit && !compact && (

          <div className="summary-note subtle">

            Ce titulaire ne peut pas être modifié sur une réservation existante.

          </div>

        )}

      </div>

    );

  }, [selectedClient, selectedClientName, clientQuickFacts, isEdit]);



  const renderSecondarySummary = useCallback((compact = false, extraClass = '') => {

    if (!secondaryDriver) {

      return (

        <div className="selection-empty">Aucun conducteur secondaire Sélectionné.</div>

      );

    }



    return (

      <div className={`selection-summary ${compact ? 'compact' : ''} ${extraClass}`.trim()}>

        <div className="summary-title-row">

          <span className="summary-main">{secondaryDriverName}</span>

        </div>

        {secondaryDriver.telephone && (

          <div className="summary-subtitle">{secondaryDriver.telephone}</div>

        )}

        {secondaryQuickFacts.length > 0 && (

          <div className="summary-list">

            {secondaryQuickFacts.map((item) => (

              <div key={item.label} className="summary-item">

                <span className="summary-key">{item.label}</span>

                <span className="summary-value">{item.value}</span>

              </div>

            ))}

          </div>

        )}

      </div>

    );

  }, [secondaryDriver, secondaryDriverName, secondaryQuickFacts]);



  const hasProlongation = useMemo(
    () => (parseInt(form.jours_prolongation, 10) || 0) > 0,
    [form.jours_prolongation],
  );


  // Si l'utilisateur saisit une date de fin, recalculer automatiquement le nombre de jours (fin exclusive)
  useEffect(() => {
    if (form.long_duration) {
      return;
    }

    if (form.date_debut && form.date_fin) {
      const diff = computeRentalDays(form.date_debut, form.date_fin);
      if (Number.isFinite(diff) && diff > 0) {
        setForm((prev) => {
          if (parseInt(prev.nombre_jours, 10) === diff) return prev;
          return { ...prev, nombre_jours: String(diff), jours_prolongation: '0' };
        });
      }
    }
  }, [form.date_debut, form.date_fin, form.long_duration]);

  // En longue duree: date de fin auto selon la duree choisie et jours auto synchronises.
  useEffect(() => {
    if (!form.long_duration || !form.date_debut) {
      return;
    }

    const durationMonths = longDurationToMonths(form.long_duration_count, form.long_duration_unit);
    const contractEnd = addMonthsSafe(form.date_debut, durationMonths);
    if (!contractEnd) {
      return;
    }

    const contractEndIso = contractEnd.toISOString().split('T')[0];
    const totalDays = computeRentalDays(form.date_debut, contractEndIso);

    if (form.date_fin !== contractEndIso || String(totalDays) !== String(form.nombre_jours)) {
      setForm((prev) => ({
        ...prev,
        date_fin: contractEndIso,
        nombre_jours: String(Math.max(totalDays, 1)),
        jours_prolongation: '0',
      }));
    }
  }, [form.long_duration, form.date_debut, form.date_fin, form.nombre_jours, form.long_duration_count, form.long_duration_unit]);



  const calculatedValues = useMemo(() => {

    const nombreJours = parseInt(form.nombre_jours, 10) || 0;

    const prolongation = parseInt(form.jours_prolongation, 10) || 0;

    let totalJours = Math.max(0, nombreJours + prolongation);



    let endDate = null;

    if (form.date_debut) {

      if (form.date_fin) {

        const diff = computeRentalDays(form.date_debut, form.date_fin);

        if (Number.isFinite(diff) && diff > 0) {
          totalJours = diff;
          endDate = new Date(new Date(form.date_debut).setHours(0, 0, 0, 0) + diff * DAY_MS);
        }

      }



      if (!endDate && totalJours > 0) {
        endDate = new Date(new Date(form.date_debut).setHours(0, 0, 0, 0) + totalJours * DAY_MS);
      }

    }



    const tarifSpecial = parseFloat(form.tarif_special);
    const prixJournalier = parseFloat(form.prix_journalier) || 0;

    let montantTotal = '0.00';

    if (Number.isFinite(tarifSpecial) && tarifSpecial > 0) {
      // tarif_special = mensuel → multiplier par le nombre de mois si on a des dates
      if (totalJours > 0) {
        const months = Math.max(1, Math.ceil(totalJours / 30));
        montantTotal = (tarifSpecial * months).toFixed(2);
      } else {
        montantTotal = tarifSpecial.toFixed(2);
      }
    } else if (totalJours > 0 && prixJournalier) {
      montantTotal = (totalJours * prixJournalier).toFixed(2);
    }



    const resteBrut = (parseFloat(montantTotal) || 0) - (parseFloat(form.avance) || 0);

    const resteAPayer = Math.max(0, resteBrut).toFixed(2);



    return {

      totalJours,

      montantTotal,

      resteAPayer,

      // dateFin as ISO string for short formatting and the Date object for long formatting

      dateFin: endDate ? endDate.toISOString() : null,

      dateFinObject: endDate,

    };

  }, [form.avance, form.billing_mode, form.date_debut, form.date_fin, form.jours_prolongation, form.long_duration, form.long_duration_count, form.long_duration_unit, form.nombre_jours, form.prix_journalier, form.tarif_special]);



  const paymentProgress = useMemo(() => {

    const total = parseFloat(calculatedValues.montantTotal) || 0;

    if (!total) {

      return 0;

    }

    const avance = Math.max(0, Math.min(total, parseFloat(form.avance) || 0));

    return Math.round((avance / total) * 100);

  }, [calculatedValues.montantTotal, form.avance]);


  const paymentLabel = PAYMENT_METHOD_LABELS[form.methode_paiement] || '—';
  const totalFormatted = formatMoney(calculatedValues.montantTotal);
  const avanceFormatted = formatMoney(form.avance);
  const resteFormatted = formatMoney(calculatedValues.resteAPayer);

  const heroSteps = useMemo(() => ([
    {
      label: 'Sélection',
      status: form.voiture && form.client ? 'done' : 'current',
      detail: form.voiture && form.client ? 'Véhicule et client validés' : 'Choisissez un véhicule et un client',
    },
    {
      label: 'Période',
      status: form.date_debut ? (calculatedValues.totalJours > 0 ? 'done' : 'current') : 'pending',
      detail: form.date_debut ? `${Math.max(calculatedValues.totalJours || 0, 1)} jour(s)` : 'Définissez les dates',
    },
    {
      label: 'Paiement',
      status: (parseFloat(form.avance) || 0) > 0 ? 'done' : 'pending',
      detail: (parseFloat(form.avance) || 0) > 0 ? `${paymentProgress}% réglé` : 'Configurez le paiement',
    },
  ]), [calculatedValues.totalJours, form.avance, form.client, form.date_debut, form.voiture, paymentProgress]);


  const completedSteps = heroSteps.filter((step) => step.status === 'done').length;
  const heroProgress = heroSteps.length ? Math.round((completedSteps / heroSteps.length) * 100) : 0;



  const formattedStartDateShort = form.date_debut

    ? new Date(form.date_debut).toLocaleDateString('fr-FR')

    : '—';

  const formattedEndDateShort = calculatedValues.dateFin
    ? new Date(calculatedValues.dateFin).toLocaleDateString('fr-FR')
    : '—';



  const formattedEndDateLong = calculatedValues.dateFinObject
    ? calculatedValues.dateFinObject.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const longDurationMilestones = useMemo(() => {
    if (!form.long_duration || !form.date_debut) {
      return null;
    }

    const durationMonths = longDurationToMonths(form.long_duration_count, form.long_duration_unit);
    const firstMonthEnd = addMonthsSafe(form.date_debut, 1);
    const contractEnd = addMonthsSafe(form.date_debut, durationMonths);
    const startDate = new Date(form.date_debut);

    if (!firstMonthEnd || !contractEnd || Number.isNaN(startDate.getTime())) {
      return null;
    }

    return {
      monthlyDay: String(startDate.getDate()).padStart(2, '0'),
      firstMonthEndLabel: firstMonthEnd.toLocaleDateString('fr-FR'),
      contractEndLabel: contractEnd.toLocaleDateString('fr-FR'),
      durationLabel: `${Math.max(parseInt(form.long_duration_count, 10) || 1, 1)} ${form.long_duration_unit === 'MONTHS' ? 'mois' : 'an(s)'}`,
    };
  }, [form.long_duration, form.date_debut, form.long_duration_count, form.long_duration_unit]);

  const preventNumberScroll = useCallback((event) => {
    // Blur input so the mouse wheel no longer adjusts the value
    event.currentTarget.blur();
  }, []);
  
  const billingModeLabel = form.billing_mode === 'FORFAIT' ? 'Forfait' : 'Journalier';


  const handleCarChange = (event) => {

    const carId = event.target.value;

    const targetCar = cars.find((car) => String(car.id) === carId);

    setForm((prev) => ({

      ...prev,

      voiture: carId,

      prix_journalier: targetCar && targetCar.prix_journalier != null

        ? String(targetCar.prix_journalier)

        : prev.prix_journalier,

    }));

    if (errors.voiture) {

      setErrors((prev) => ({ ...prev, voiture: null }));

    }

  };



  const handleEnableProlongation = () => {

    setForm((prev) => ({

      ...prev,

      jours_prolongation: hasProlongation ? '0' : '1',

    }));

  };
  
  const toggleLongDuration = () => {
    setForm((prev) => {
      const nextLongDuration = !prev.long_duration;

      if (!nextLongDuration || !prev.date_debut) {
        return {
          ...prev,
          long_duration: nextLongDuration,
          ...(nextLongDuration ? {} : { date_fin: '' }),
        };
      }

      const durationMonths = longDurationToMonths(prev.long_duration_count, prev.long_duration_unit);
      const contractEnd = addMonthsSafe(prev.date_debut, durationMonths);
      const contractEndIso = contractEnd ? contractEnd.toISOString().split('T')[0] : '';
      const totalDays = contractEndIso ? computeRentalDays(prev.date_debut, contractEndIso) : (parseInt(prev.nombre_jours, 10) || 1);

      return {
        ...prev,
        long_duration: true,
        date_fin: contractEndIso,
        nombre_jours: String(Math.max(totalDays, 1)),
        jours_prolongation: '0',
      };
    });
  };



  const handleChange = (event) => {

    const { name, value } = event.target;

    if (name === 'nombre_jours' && !form.long_duration && form.date_debut) {
      // Quand l'utilisateur modifie le nombre de jours manuellement, recalculer date_fin
      const days = parseInt(value, 10);
      if (Number.isFinite(days) && days > 0) {
        const start = new Date(form.date_debut);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + days * DAY_MS);
        setForm((prev) => ({ ...prev, nombre_jours: value, date_fin: end.toISOString().split('T')[0], jours_prolongation: '0' }));
      } else {
        setForm((prev) => ({ ...prev, nombre_jours: value }));
      }
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }



    if (errors[name]) {

      setErrors((prev) => ({ ...prev, [name]: null }));

    }

  };



  const validateForm = useCallback(() => {

    const ensure = (condition, message) => {

      if (!condition) {

        emitGeneralError(message);

        return false;

      }

      return true;

    };



    if (!ensure(form.voiture && form.client, 'Veuillez sélectionner une voiture et un client.')) return false;

    if (!ensure(form.date_debut, 'Veuillez renseigner la date de début.')) return false;

    if (form.date_fin && form.date_debut && new Date(form.date_fin) < new Date(form.date_debut)) {

      emitGeneralError('La date de fin doit être postérieure ou égale à la date de début.');

      return false;

    }

    if (!ensure(parseInt(form.nombre_jours, 10) > 0, 'Veuillez saisir un nombre de jours valide.')) return false;
    const hasSpecial = Number.isFinite(parseFloat(form.tarif_special)) && parseFloat(form.tarif_special) > 0;
    if (!ensure(form.prix_journalier || hasSpecial, 'Veuillez renseigner un prix journalier ou un tarif spécial.')) return false;

    if (hasProlongation && !ensure(parseInt(form.jours_prolongation, 10) > 0, 'Veuillez indiquer le nombre de jours de prolongation.')) return false;



    const total = parseFloat(calculatedValues.montantTotal) || 0;

    const avance = parseFloat(form.avance) || 0;

    if (avance > total) {

      emitGeneralError("L'avance ne peut pas dépasser le montant total.");

      return false;

    }



    clearGeneralError();

    return true;

  }, [calculatedValues.montantTotal, clearGeneralError, emitGeneralError, form.avance, form.client, form.date_debut, form.jours_prolongation, form.nombre_jours, form.prix_journalier, form.tarif_special, form.voiture, hasProlongation]);



  const handleSubmit = async (event) => {

    event.preventDefault();

    if (!validateForm()) {

      return;

    }



    setLoading(true);
    let successMessage = '';

    try {

      const payload = {

        voiture: form.voiture ? parseInt(form.voiture, 10) : null,

        client: form.client ? parseInt(form.client, 10) : null,

        conducteur_secondaire: form.conducteur_secondaire

          ? parseInt(form.conducteur_secondaire, 10)

          : null,

        date_debut: form.date_debut,

        heure_depart: form.heure_depart || null,

        date_fin: form.date_fin || null,

        heure_retour: form.heure_retour || null,

        nombre_jours: parseInt(form.nombre_jours, 10) || 1,

        jours_prolongation: parseInt(form.jours_prolongation, 10) || 0,

        prix_journalier: parseFloat(form.prix_journalier) || 0,

        tarif_special: form.tarif_special ? parseFloat(form.tarif_special) : null,

        avance: parseFloat(form.avance) || 0,

        franchise: parseFloat(form.franchise) || 0,

        long_duration: Boolean(form.long_duration),

        billing_mode: form.billing_mode || 'JOURNALIER',

        numero_contrat: form.numero_contrat || '',

        methode_paiement: form.methode_paiement,

        commentaire: form.commentaire,

      };
      if (isEdit) {

        await apiClient.put(`/reservations/${id}/`, payload);

        // If coming from "Récupérer" flow and heure_retour was filled, mark as returned
        if (location?.state?.focusRetour && form.heure_retour) {
          await apiClient.post(`/reservations/${id}/mark-returned/`, {
            heure_retour: form.heure_retour,
          });
          window.dispatchEvent(new Event('jet5:refreshReturns'));
          window.dispatchEvent(new Event('jet5:refreshSidebarCounts'));
          successMessage = 'Voiture récupérée avec succès !';
        } else {
          successMessage = 'Réservation modifiée avec succès.';
        }

      } else {

        await apiClient.post('/reservations/', payload);

        successMessage = 'Réservation ajoutée avec succès.';

      }



      navigate('/admin/reservations', { state: { successMessage, refresh: Date.now() } });

    } catch (error) {

      console.error('Erreur lors de l\'enregistrement de la réservation :', error);

      const errorData = error.response?.data;

      if (errorData && typeof errorData === 'object') {

        setErrors(errorData);

        const nonField = errorData.non_field_errors || errorData.detail;

        if (nonField) {

          addNotification(Array.isArray(nonField) ? nonField.join(' ') : String(nonField), 'error');

        } else {

          const messageFromFields = Object.values(errorData)
            .flatMap((v) => (Array.isArray(v) ? v : [v]))
            .filter(Boolean)
            .map((v) => String(v))
            .join(' | ');

          const fallbackMsg = messageFromFields || 'Des erreurs ont été détectées. Veuillez vérifier les champs.';

          addNotification(fallbackMsg, 'error');

        }

      } else {

        const statusText = error.response?.status ? ` (code ${error.response.status})` : '';

        emitGeneralError(`Une erreur inattendue est survenue lors de l'enregistrement${statusText}.`);

      }

    } finally {

      setLoading(false);

    }

  };



  if (initializing) {

    return (

      <div className="cars-page add-reservation-modern">

        <Loader />

      </div>

    );

  }



  return (

    <div className="cars-page add-reservation-modern">

      <PageHeader
        title={isEdit ? '📝 Modifier la Réservation' : '🚗 Nouvelle Réservation'}
        subtitle={`Remplissez les informations ci-dessous pour ${isEdit ? 'mettre à jour' : 'créer'} une réservation.`}
        backUrl="/admin/reservations"
      />



      <div className="modal-container-reservation">

        <div className="modal-card-reservation">

          <div className="reservation-card-header">

            <h2>{isEdit ? 'Modifier la réservation' : 'Nouvelle réservation'}</h2>

            <p>{isEdit ? 'Mettez à jour les informations de la réservation existante.' : 'Enregistrez une nouvelle réservation de location.'}</p>

          </div>

          <form className="modern-form" onSubmit={handleSubmit}>
            <div className="reservation-layout">
              <div className="reservation-main">

                {/* ═══════ CARTE 1 — SÉLECTION ═══════ */}
                <div className="form-step payment-section">
                  <div className="step-header"><h3>🚗 Sélection</h3></div>
                  <div className="form-grid-2" style={{ gap: '24px' }}>

                    {/* Voiture — Recherche */}
                    <div className="form-field">
                      <label>Voiture <span className="required">*</span></label>
                      <div className="search-select" ref={carRef}>
                        <input
                          type="text"
                          className="input-enhanced"
                          placeholder="🔍 Rechercher marque, modèle, immatriculation..."
                          value={carDropdownOpen ? carSearch : (selectedCar ? `${selectedCar.immatriculation || ''} — ${selectedCar.marque || ''} ${selectedCar.modele || ''}` : '')}
                          onChange={(e) => { setCarSearch(e.target.value); if (!carDropdownOpen) setCarDropdownOpen(true); }}
                          onFocus={() => { setCarDropdownOpen(true); setCarSearch(''); }}
                          autoComplete="off"
                        />
                        {form.voiture && !carDropdownOpen && (
                          <button type="button" className="search-select-clear" onClick={() => { setForm((p) => ({ ...p, voiture: '', prix_journalier: '' })); setCarSearch(''); }}>✕</button>
                        )}
                        {carDropdownOpen && (
                          <div className="search-select-dropdown">
                            {filteredCars.length === 0 ? (
                              <div className="search-select-empty">Aucun véhicule trouvé</div>
                            ) : filteredCars.map((car) => (
                              <div
                                key={car.id}
                                className={`search-select-option ${String(car.id) === String(form.voiture) ? 'selected' : ''}`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  const ev = { target: { value: String(car.id) } };
                                  handleCarChange(ev);
                                  setCarDropdownOpen(false);
                                  setCarSearch('');
                                }}
                              >
                                <span className="search-select-opt-label">{car.immatriculation || 'N/A'} — {car.marque || ''} {car.modele || ''}</span>
                                <span className="search-select-opt-sub">{car.prix_journalier != null ? formatMoney(car.prix_journalier) + ' DH/j' : ''}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {errors.voiture && <span className="error-text">{errors.voiture}</span>}
                      {!isEdit && carOptions.length === 0 && (
                        <small className="field-hint">Aucune voiture libre n'est disponible.</small>
                      )}
                      {renderCarSummary(false)}
                    </div>

                    {/* Client — Recherche */}
                    <div className="form-field">
                      <label>Client <span className="required">*</span></label>
                      <div className="search-select" ref={clientRef}>
                        <input
                          type="text"
                          className="input-enhanced"
                          placeholder="🔍 Rechercher nom, prénom, téléphone, CIN..."
                          value={clientDropdownOpen ? clientSearch : (selectedClient ? `${selectedClient.nom || ''} ${selectedClient.prenom || ''} — ${selectedClient.telephone || ''}` : '')}
                          onChange={(e) => { setClientSearch(e.target.value); if (!clientDropdownOpen) setClientDropdownOpen(true); }}
                          onFocus={() => { setClientDropdownOpen(true); setClientSearch(''); }}
                          disabled={isEdit}
                          autoComplete="off"
                        />
                        {form.client && !clientDropdownOpen && !isEdit && (
                          <button type="button" className="search-select-clear" onClick={() => { setForm((p) => ({ ...p, client: '' })); setClientSearch(''); }}>✕</button>
                        )}
                        {clientDropdownOpen && !isEdit && (
                          <div className="search-select-dropdown">
                            {filteredClients.length === 0 ? (
                              <div className="search-select-empty">Aucun client trouvé</div>
                            ) : filteredClients.map((client) => (
                              <div
                                key={client.id}
                                className={`search-select-option ${String(client.id) === String(form.client) ? 'selected' : ''}`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setForm((p) => ({ ...p, client: String(client.id) }));
                                  setClientDropdownOpen(false);
                                  setClientSearch('');
                                  if (errors.client) setErrors((p) => ({ ...p, client: null }));
                                }}
                              >
                                <span className="search-select-opt-label">{client.nom || ''} {client.prenom || ''}</span>
                                <span className="search-select-opt-sub">{client.telephone || ''} {client.cin || client.cin_numero || ''}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {errors.client && <span className="error-text">{errors.client}</span>}
                      {isEdit && <small className="field-hint locked-hint">🔒 Non modifiable sur une réservation existante.</small>}
                      {renderClientSummary(false)}
                    </div>
                  </div>

                  {/* Conducteur secondaire */}
                  <div className="secondary-block">
                    <div className="secondary-header">
                      <span>Conducteur secondaire (optionnel)</span>
                    </div>
                    <div className="search-select" ref={secondaryRef}>
                      <input
                        type="text"
                        className="input-enhanced"
                        placeholder="🔍 Rechercher un conducteur secondaire..."
                        value={secondaryDropdownOpen ? secondarySearch : (secondaryDriver ? `${secondaryDriver.nom || ''} ${secondaryDriver.prenom || ''}` : '')}
                        onChange={(e) => { setSecondarySearch(e.target.value); if (!secondaryDropdownOpen) setSecondaryDropdownOpen(true); }}
                        onFocus={() => { setSecondaryDropdownOpen(true); setSecondarySearch(''); }}
                        autoComplete="off"
                      />
                      {form.conducteur_secondaire && !secondaryDropdownOpen && (
                        <button type="button" className="search-select-clear" onClick={() => { setForm((p) => ({ ...p, conducteur_secondaire: '' })); setSecondarySearch(''); }}>✕</button>
                      )}
                      {secondaryDropdownOpen && (
                        <div className="search-select-dropdown">
                          {filteredSecondary.length === 0 ? (
                            <div className="search-select-empty">Aucun conducteur trouvé</div>
                          ) : filteredSecondary.map((client) => (
                            <div
                              key={client.id}
                              className={`search-select-option ${String(client.id) === String(form.conducteur_secondaire) ? 'selected' : ''}`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setForm((p) => ({ ...p, conducteur_secondaire: String(client.id) }));
                                setSecondaryDropdownOpen(false);
                                setSecondarySearch('');
                              }}
                            >
                              <span className="search-select-opt-label">{client.nom || ''} {client.prenom || ''}</span>
                              <span className="search-select-opt-sub">{client.telephone || ''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {secondaryDriver && renderSecondarySummary(false, 'secondary-summary')}
                  </div>
                </div>

                {/* ═══════ CARTE 2 — PÉRIODE DE LOCATION ═══════ */}
                <div className="form-step">
                  <div className="step-header"><h3>📅 Période de location</h3></div>
                  <div className="form-grid-2" style={{ gap: '16px' }}>
                    <div className="form-field">
                      <FormInput
                        type="date"
                        label={<>Date de début <span className="required">*</span></>}
                        name="date_debut"
                        value={form.date_debut}
                        onChange={handleChange}
                        required
                        className="input-enhanced"
                      />
                      {errors.date_debut && <span className="error-text">{errors.date_debut}</span>}
                    </div>
                    <div className="form-field">
                      <FormInput
                        type="date"
                        label="Date de fin (optionnelle)"
                        name="date_fin"
                        value={form.date_fin}
                        onChange={handleChange}
                        disabled={form.long_duration}
                        min={form.long_duration ? undefined : form.date_debut || today}
                        className="input-enhanced"
                      />
                      {errors.date_fin && <span className="error-text">{errors.date_fin}</span>}
                      <small className="field-hint">
                        {form.long_duration ? 'Calculée automatiquement selon la durée longue durée.' : 'Ajuste automatiquement le nombre de jours.'}
                      </small>
                    </div>
                  </div>
                  <div className="form-grid-2" style={{ gap: '16px', marginTop: '12px' }}>
                    <div className="form-field">
                      <FormInput
                        type="time"
                        label="⏰ Heure de départ"
                        name="heure_depart"
                        value={form.heure_depart}
                        onChange={handleChange}
                        className="input-enhanced"
                        placeholder="00:00"
                      />
                    </div>
                    <div className="form-field">
                      <FormInput
                        type="time"
                        label="⏰ Heure de retour"
                        name="heure_retour"
                        id="heure_retour"
                        value={form.heure_retour}
                        onChange={handleChange}
                        className={`input-enhanced${location?.state?.focusRetour ? ' input-highlight-retour' : ''}`}
                        placeholder="00:00"
                        autoFocus={!!location?.state?.focusRetour}
                      />
                    </div>
                  </div>
                  <div className="form-grid-2" style={{ gap: '16px', marginTop: '12px' }}>
                    <div className="form-field">
                      <label>Nombre de jours <span className="required">*</span></label>
                      <div className="input-with-buttons">
                        <button type="button" className="btn-decrement" onClick={() => setForm((prev) => {
                          const days = Math.max(1, (parseInt(prev.nombre_jours, 10) || 1) - 1);
                          const dateFin = prev.date_debut && !prev.long_duration ? new Date(new Date(prev.date_debut).setHours(0,0,0,0) + days * DAY_MS).toISOString().split('T')[0] : prev.date_fin;
                          return { ...prev, nombre_jours: String(days), date_fin: dateFin, jours_prolongation: '0' };
                        })}>-</button>
                        <input
                          type="number"
                          min={1}
                          name="nombre_jours"
                          value={form.nombre_jours}
                          onWheel={preventNumberScroll}
                          onWheelCapture={preventNumberScroll}
                          onChange={handleChange}
                          required
                          className="input-enhanced input-center"
                        />
                        <button type="button" className="btn-increment" onClick={() => setForm((prev) => {
                          const days = (parseInt(prev.nombre_jours, 10) || 0) + 1;
                          const dateFin = prev.date_debut && !prev.long_duration ? new Date(new Date(prev.date_debut).setHours(0,0,0,0) + days * DAY_MS).toISOString().split('T')[0] : prev.date_fin;
                          return { ...prev, nombre_jours: String(days), date_fin: dateFin, jours_prolongation: '0' };
                        })}>+</button>
                      </div>
                      {errors.nombre_jours && <span className="error-text">{errors.nombre_jours}</span>}
                    </div>
                    <div className="prolongation-block">
                      <div className="form-field">
                        <label>Prolongation (optionnelle)</label>
                        <div className="prolongation-toggle">
                          <button type="button" className={`toggle-chip ${hasProlongation ? 'active' : ''}`} onClick={handleEnableProlongation}>
                            {hasProlongation ? 'Prolongation activée' : 'Ajouter une prolongation'}
                          </button>
                          {hasProlongation && (
                            <FormInput
                              type="number"
                              min="1"
                              name="jours_prolongation"
                              value={form.jours_prolongation}
                              onWheel={preventNumberScroll}
                              onWheelCapture={preventNumberScroll}
                              onChange={handleChange}
                              className="input-enhanced"
                            />
                          )}
                        </div>
                        {errors.jours_prolongation && <span className="error-text">{errors.jours_prolongation}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Longue durée */}
                  <div className="form-grid-2" style={{ gap: '16px', marginTop: '12px' }}>
                    <div className="form-field">
                      <label>Location longue durée</label>
                      <div className="prolongation-toggle">
                        <button type="button" className={`toggle-chip ${form.long_duration ? 'active' : ''}`} onClick={toggleLongDuration}>
                          {form.long_duration ? 'Longue durée activée' : 'Marquer en longue durée'}
                        </button>
                      </div>
                      {form.long_duration && (
                        <div className="form-grid-2 responsive-grid-220" style={{ gap: '8px', marginTop: '8px' }}>
                          <FormInput
                            type="number"
                            min="1"
                            name="long_duration_count"
                            value={form.long_duration_count}
                            onWheel={preventNumberScroll}
                            onWheelCapture={preventNumberScroll}
                            onChange={handleChange}
                            className="input-enhanced"
                          />
                          <select name="long_duration_unit" value={form.long_duration_unit} onChange={handleChange} className="select-enhanced">
                            <option value="YEARS">Année(s)</option>
                            <option value="MONTHS">Mois</option>
                          </select>
                        </div>
                      )}
                      <small className="field-hint">Durée libre : mois ou années.</small>
                    </div>
                  </div>

                  <div className="info-chips">
                    <span className="info-chip">📆 {calculatedValues.totalJours} jour(s)</span>
                    {formattedEndDateShort !== '—' ? (
                      <span className="info-chip">📅 Fin prévue : {formattedEndDateShort}</span>
                    ) : (
                      form.long_duration && <span className="info-chip">📅 Fin ouverte</span>
                    )}
                    {form.long_duration && <span className="info-chip">⏳ Longue durée</span>}
                  </div>

                  {formattedEndDateLong && (
                    <div className="info-box">
                      <span className="info-icon">ℹ️</span>
                      <div className="info-content">
                        <strong>Date de fin prévue :</strong> {formattedEndDateLong}
                      </div>
                    </div>
                  )}

                  {form.long_duration && longDurationMilestones && (
                    <div className="info-box">
                      <span className="info-icon">⏳</span>
                      <div className="info-content">
                        <strong>Cycle longue duree ({longDurationMilestones.durationLabel}):</strong> 1er mois se termine le {longDurationMilestones.firstMonthEndLabel}, puis echeance chaque {longDurationMilestones.monthlyDay} du mois jusqu'au {longDurationMilestones.contractEndLabel}.
                      </div>
                    </div>
                  )}
                </div>

                {/* ═══════ CARTE 3 — TARIFICATION ═══════ */}
                <div className="form-step">
                  <div className="step-header"><h3>💰 Tarification</h3></div>
                  <div className="form-grid-2" style={{ gap: '16px' }}>
                    <div className="form-field">
                      <label>Mode de facturation</label>
                      <select name="billing_mode" value={form.billing_mode} onChange={handleChange} className="select-enhanced">
                        <option value="JOURNALIER">Journalier (prix × jours)</option>
                        <option value="FORFAIT">Forfait (montant global)</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <FormInput
                        label={<span style={{ fontWeight: 'bold' }}>Prix journalier (DH) <span className="required">*</span></span>}
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        name="prix_journalier"
                        value={form.prix_journalier}
                        onWheel={preventNumberScroll}
                        onWheelCapture={preventNumberScroll}
                        onChange={handleChange}
                        required
                        className="input-enhanced price-field"
                        placeholder="0,00"
                      />
                      {errors.prix_journalier && <span className="error-text">{errors.prix_journalier}</span>}
                    </div>
                  </div>
                  <div className="form-grid-2" style={{ gap: '16px', marginTop: '12px' }}>
                    <div className="form-field">
                      <FormInput
                        type="text"
                        label="💰 Tarif spécial / Forfait (DH)"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        name="tarif_special"
                        value={form.tarif_special}
                        onWheel={preventNumberScroll}
                        onWheelCapture={preventNumberScroll}
                        onChange={handleChange}
                        placeholder="Optionnel — remplace le calcul auto"
                        className="input-enhanced price-field"
                      />
                      {errors.tarif_special && <span className="error-text">{errors.tarif_special}</span>}
                      <small className="field-hint">Si renseigné, remplace le calcul (prix × jours). En longue durée, c'est le tarif mensuel.</small>
                    </div>
                  </div>

                  <div className="info-chips">
                    <span className="info-chip">🧮 Mode : {billingModeLabel}</span>
                    {form.prix_journalier && <span className="info-chip">💰 Total estimé : {totalFormatted}</span>}
                  </div>
                </div>

                {/* ═══════ CARTE 4 — PAIEMENT ═══════ */}
                <div className="form-step">
                  <div className="step-header"><h3>💳 Paiement</h3></div>
                  <div className="form-grid-2" style={{ gap: '16px' }}>
                    <div className="form-field">
                      <FormInput
                        type="text"
                        label="Numéro de contrat"
                        name="numero_contrat"
                        value={form.numero_contrat}
                        onChange={handleChange}
                        className="input-enhanced"
                        placeholder="Ex: LOC-2025-00123"
                      />
                      <small className="field-hint">Identifiant administratif (optionnel).</small>
                    </div>
                    <div className="form-field">
                      <label>Méthode de paiement</label>
                      <select name="methode_paiement" value={form.methode_paiement} onChange={handleChange} className="select-enhanced">
                        <option value="CASH">💵 Espèces</option>
                        <option value="CARD">💳 Carte Bancaire</option>
                        <option value="CHEQUE">📋 Chèque</option>
                        <option value="TPE">💳 TPE</option>
                        <option value="TRANSFER">🏦 Virement</option>
                        <option value="OTHER">🗒️ Autre</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-grid-2" style={{ gap: '16px', marginTop: '12px' }}>
                    <div className="form-field">
                      <FormInput
                        type="text"
                        label="Avance (DH)"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        max={parseFloat(calculatedValues.montantTotal) || undefined}
                        name="avance"
                        value={form.avance}
                        onWheel={preventNumberScroll}
                        onWheelCapture={preventNumberScroll}
                        onChange={handleChange}
                        className="input-enhanced"
                      />
                      {errors.avance && <span className="error-text">{errors.avance}</span>}
                      <small className="field-hint">Montant déjà perçu auprès du client.</small>
                    </div>
                    <div className="form-field">
                      <FormInput
                        type="text"
                        label="Franchise (DH)"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        name="franchise"
                        value={form.franchise}
                        onWheel={preventNumberScroll}
                        onWheelCapture={preventNumberScroll}
                        onChange={handleChange}
                        className="input-enhanced"
                      />
                      <small className="field-hint">Franchise à appliquer (si applicable).</small>
                    </div>
                  </div>
                </div>

                {errors.general && (
                  <div className="error-banner">
                    <span className="error-icon">⚠️</span>
                    {errors.general}
                  </div>
                )}

              </div>
            </div>

            <div className="form-actions-modern">

              <button type="button" className="btn-cancel-modern" onClick={() => navigate('/admin/reservations')}>

                Annuler

              </button>

              <div style={{ flex: 1 }} />

              <button type="submit" className="btn-submit-modern" disabled={loading}>

                {loading ? (

                  <>

                    <span className="spinner" />

                    Enregistrement...

                  </>

                ) : (

                  <>

                    <span className="icon">{isEdit ? '📝' : '📋'}</span>

                    {isEdit ? 'Modifier la Réservation' : 'Créer la Réservation'}

                  </>

                )}

              </button>

            </div>

          </form>

        </div>

      </div>

    </div>

  );

}



export default AddReservation;

