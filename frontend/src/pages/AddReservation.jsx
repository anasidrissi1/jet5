import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import apiClient from '../api/apiClient';
import PageHeader from '../components/PageHeader';
import Loader from '../components/Loader';
import { useNotification } from '../contexts/NotificationContext';
import '../styles/add-reservation.css';

const carsService = {
  list: (params = {}) => apiClient.get('/cars/voitures/', { params }),
};

const clientsService = {
  list: (params = {}) => apiClient.get('/clients/', { params }),
};

const reservationsService = {
  list: (params = {}) => apiClient.get('/reservations/', { params }),
  get: (id) => apiClient.get(`/reservations/${id}/`),
  create: (payload) => apiClient.post('/reservations/', payload),
  update: (id, payload) => apiClient.put(`/reservations/${id}/`, payload),
};

const CONTRACT_TAG = '__CONTRACT_JSON__:';

const emptyExtras = {
  locataire_nom: '',
  locataire_prenom: '',
  locataire_telephone: '',
  locataire_cin: '',
  locataire_adresse: '',
  locataire_expiration_permis: '',
  locataire_numero_permis: '',
  locataire_delivre_le: '',
  locataire_passport: '',

  secondaire_nom: '',
  secondaire_prenom: '',
  secondaire_cin: '',
  secondaire_adresse: '',
  secondaire_telephone: '',
  secondaire_expiration_permis: '',
  secondaire_numero_permis: '',
  secondaire_delivre_le: '',
  secondaire_passport: '',

  livraison_date: '',
  livraison_heure: '',
  livraison_km: '',
  livraison_lieu: '',

  recuperation_date: '',
  recuperation_heure: '',
  recuperation_km: '',
  recuperation_lieu: '',

  prolongation_date: '',
  prolongation_heure: '',
  prolongation_km: '',
  prolongation_lieu: '',

  depart_pneu_secours: false,
  depart_cric: false,
  depart_gilets: false,
  depart_tapis: false,
  depart_rayures: false,
  depart_aucun_dommage: false,
  depart_observation: '',
  depart_jauge: 'E',

  retour_pneu_secours: false,
  retour_cric: false,
  retour_gilets: false,
  retour_tapis: false,
  retour_rayures: false,
  retour_aucun_dommage: false,
  retour_observation: '',
  retour_jauge: 'E',

  signature_agent: '',
  signature_client: '',
  service_extra: '0',
  tva_rate: '20',
  notes: '',
};

const initialCore = {
  voiture: '',
  client: '',
  conducteur_secondaire: '',
  date_debut: '',
  heure_depart: '',
  date_fin: '',
  heure_retour: '',
  nombre_jours: '1',
  prix_journalier: '',
  avance: '0',
  franchise: '0',
  numero_contrat: '',
  methode_paiement: 'CASH',
};

const money = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
};

const displayMoney = (value) => `${Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-FR');
};

const toInputDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const firstDefined = (...values) => {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }
  return '';
};

const extractClientIdentity = (client) => {
  if (!client) {
    return {
      nom: '',
      prenom: '',
      telephone: '',
      cin: '',
      adresse: '',
      numeroPermis: '',
      dateDelivrance: '',
      dateExpiration: '',
      passport: '',
    };
  }

  const dateExpiration = toInputDate(firstDefined(client.permis_date_expiration, client.cin_date_expiration));
  const dateDelivrance = toInputDate(firstDefined(client.permis_date_delivrance));

  return {
    nom: firstDefined(client.nom),
    prenom: firstDefined(client.prenom),
    telephone: firstDefined(client.telephone, client.telephone_whatsapp),
    cin: firstDefined(client.cin_numero, client.cin),
    adresse: firstDefined(client.adresse, client.ville),
    numeroPermis: firstDefined(client.permis_numero, client.numero_permis),
    dateDelivrance,
    dateExpiration,
    passport: firstDefined(client.passeport_numero, client.passport_numero),
  };
};

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getClientSearchAliases = (client) => {
  const nom = client?.nom || '';
  const prenom = client?.prenom || '';
  return [
    `${nom} ${prenom}`,
    `${prenom} ${nom}`,
    nom,
    prenom,
  ].map(normalizeText).filter(Boolean);
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const computeNombreJours = (dateDebut, dateFin) => {
  if (!dateDebut || !dateFin) return null;
  const start = new Date(dateDebut);
  const end = new Date(dateFin);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)));
};

const computeDateFin = (dateDebut, nombreJours) => {
  if (!dateDebut) return null;
  const start = new Date(dateDebut);
  if (Number.isNaN(start.getTime())) return null;
  const days = Math.max(1, parseInt(nombreJours, 10) || 1);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return end.toISOString().slice(0, 10);
};

const parseContractData = (comment) => {
  if (!comment || typeof comment !== 'string') return null;
  if (!comment.startsWith(CONTRACT_TAG)) return null;
  try {
    return JSON.parse(comment.slice(CONTRACT_TAG.length));
  } catch (_) {
    return null;
  }
};

const buildContractComment = (extras) => `${CONTRACT_TAG}${JSON.stringify(extras)}`;

const clearSecondaryFields = {
  secondaire_nom: '',
  secondaire_prenom: '',
  secondaire_telephone: '',
  secondaire_cin: '',
  secondaire_adresse: '',
  secondaire_expiration_permis: '',
  secondaire_numero_permis: '',
  secondaire_delivre_le: '',
  secondaire_passport: '',
};

function AddReservation() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [loadingInit, setLoadingInit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contractBusy, setContractBusy] = useState(false);

  const [cars, setCars] = useState([]);
  const [clients, setClients] = useState([]);
  const [reservations, setReservations] = useState([]);

  const [core, setCore] = useState({ ...initialCore, date_debut: todayIso() });
  const [extras, setExtras] = useState({ ...emptyExtras });
  const [savedReservation, setSavedReservation] = useState(null);
  const [clientQuery, setClientQuery] = useState('');

  const selectedCar = useMemo(() => cars.find((c) => String(c.id) === String(core.voiture)) || null, [cars, core.voiture]);
  const selectedClient = useMemo(() => clients.find((c) => String(c.id) === String(core.client)) || null, [clients, core.client]);
  const selectedSecondaryClient = useMemo(
    () => clients.find((c) => String(c.id) === String(core.conducteur_secondaire)) || null,
    [clients, core.conducteur_secondaire],
  );
  const availableCars = useMemo(() => {
    const activeStatuses = new Set(['planifiee', 'en_cours']);
    const blockedCarIds = new Set(
      reservations
        .filter((reservation) => {
          const reservationId = String(reservation.id || '');
          if (isEdit && reservationId === String(id)) return false;
          return activeStatuses.has(String(reservation.statut || '').toLowerCase());
        })
        .map((reservation) => String(reservation.voiture)),
    );

    const filtered = cars.filter((car) => !blockedCarIds.has(String(car.id)));
    if (core.voiture && !filtered.some((car) => String(car.id) === String(core.voiture))) {
      const selected = cars.find((car) => String(car.id) === String(core.voiture));
      if (selected) filtered.push(selected);
    }
    return filtered;
  }, [cars, reservations, isEdit, id, core.voiture]);

  const clientLabelById = (idValue) => {
    const linked = clients.find((item) => String(item.id) === String(idValue));
    if (!linked) return '';
    return `${linked.nom || ''} ${linked.prenom || ''}`.trim();
  };

  useEffect(() => {
    const load = async () => {
      try {
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

        const [carsList, clientsList, reservationsList] = await Promise.all([
          fetchAllPages(carsService.list),
          fetchAllPages(clientsService.list),
          fetchAllPages(reservationsService.list),
        ]);
        setCars(carsList);
        setClients(clientsList);
        setReservations(reservationsList);

        if (isEdit) {
          const res = await reservationsService.get(id);
          const r = res.data;
          setSavedReservation(r);

          setCore((prev) => ({
            ...prev,
            voiture: r.voiture != null ? String(r.voiture) : '',
            client: r.client != null ? String(r.client) : '',
            conducteur_secondaire: r.conducteur_secondaire != null ? String(r.conducteur_secondaire) : '',
            date_debut: r.date_debut || prev.date_debut,
            heure_depart: r.heure_depart || '',
            date_fin: r.date_fin || '',
            heure_retour: r.heure_retour || '',
            nombre_jours: r.nombre_jours != null ? String(r.nombre_jours) : '1',
            prix_journalier: r.prix_journalier != null ? String(r.prix_journalier) : '',
            avance: r.avance != null ? String(r.avance) : '0',
            franchise: r.franchise != null ? String(r.franchise) : '0',
            numero_contrat: r.numero_contrat != null ? String(r.numero_contrat) : '',
            methode_paiement: r.methode_paiement || 'CASH',
          }));

          const contract = parseContractData(r.commentaire);
          if (contract) {
            setExtras((prev) => ({ ...prev, ...contract }));
          }
        }
      } catch (error) {
        console.error(error);
        addNotification('Impossible de charger les données du contrat.', 'error');
      } finally {
        setLoadingInit(false);
      }
    };

    load();
  }, [addNotification, id, isEdit]);

  useEffect(() => {
    if (!selectedClient) return;
    setExtras((prev) => {
      const info = extractClientIdentity(selectedClient);

      return {
        ...prev,
        locataire_nom: info.nom,
        locataire_prenom: info.prenom,
        locataire_telephone: info.telephone,
        locataire_cin: info.cin,
        locataire_adresse: info.adresse,
        locataire_numero_permis: info.numeroPermis,
        locataire_delivre_le: info.dateDelivrance,
        locataire_expiration_permis: info.dateExpiration,
        locataire_passport: info.passport,
      };
    });
  }, [selectedClient]);

  useEffect(() => {
    if (!core.client) {
      return;
    }
    const label = clientLabelById(core.client);
    if (label && label !== clientQuery) {
      setClientQuery(label);
    }
  }, [clients, core.client]);

  useEffect(() => {
    if (!core.conducteur_secondaire) {
      setExtras((prev) => ({ ...prev, ...clearSecondaryFields }));
      return;
    }

    if (!selectedSecondaryClient) return;
    setExtras((prev) => {
      const info = extractClientIdentity(selectedSecondaryClient);

      return {
        ...prev,
        secondaire_nom: info.nom,
        secondaire_prenom: info.prenom,
        secondaire_telephone: info.telephone,
        secondaire_cin: info.cin,
        secondaire_adresse: info.adresse,
        secondaire_numero_permis: info.numeroPermis,
        secondaire_delivre_le: info.dateDelivrance,
        secondaire_expiration_permis: info.dateExpiration,
        secondaire_passport: info.passport,
      };
    });
  }, [core.conducteur_secondaire, selectedSecondaryClient]);

  const totals = useMemo(() => {
    const days = Math.max(1, parseInt(core.nombre_jours, 10) || 1);
    const price = parseFloat(core.prix_journalier) || 0;
    const extra = parseFloat(extras.service_extra) || 0;
    const tva = parseFloat(extras.tva_rate) || 0;
    const ht = days * price + extra;
    const tvaValue = (ht * tva) / 100;
    const ttc = ht + tvaValue;
    const avance = parseFloat(core.avance) || 0;
    const reste = Math.max(0, ttc - avance);
    return { ht, tvaValue, ttc, reste };
  }, [core.avance, core.nombre_jours, core.prix_journalier, extras.service_extra, extras.tva_rate]);

  const reservationRef = savedReservation?.id || (isEdit ? Number(id) : null);

  const handleCore = (event) => {
    const { name, value } = event.target;
    setCore((prev) => {
      const next = { ...prev, [name]: value };

      if (name === 'date_fin') {
        const days = computeNombreJours(next.date_debut, next.date_fin);
        if (days !== null) {
          next.nombre_jours = String(days);
        }
      } else if (name === 'nombre_jours') {
        const dateFin = computeDateFin(next.date_debut, next.nombre_jours);
        if (dateFin) {
          next.date_fin = dateFin;
        }
      } else if (name === 'date_debut') {
        if (next.date_fin) {
          const days = computeNombreJours(next.date_debut, next.date_fin);
          if (days !== null) {
            next.nombre_jours = String(days);
          }
        } else if (next.nombre_jours) {
          const dateFin = computeDateFin(next.date_debut, next.nombre_jours);
          if (dateFin) {
            next.date_fin = dateFin;
          }
        }
      }

      return next;
    });
  };

  const handleClientSearchChange = (event) => {
    const value = event.target.value;
    setClientQuery(value);

    const normalized = normalizeText(value);
    if (!normalized) {
      setCore((prev) => ({ ...prev, client: '' }));
      return;
    }

    const exact = clients.find((client) => getClientSearchAliases(client).includes(normalized));

    let matchedClient = exact;
    if (!matchedClient) {
      const candidates = clients.filter((client) => {
        const aliases = getClientSearchAliases(client);
        return aliases.some((alias) => alias.includes(normalized));
      });
      if (candidates.length === 1) {
        matchedClient = candidates[0];
      }
    }

    if (matchedClient) {
      setCore((prev) => ({ ...prev, client: String(matchedClient.id) }));
    }
  };

  const handleExtras = (event) => {
    const { name, value, type, checked } = event.target;
    setExtras((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const validate = () => {
    if (!core.voiture || !core.client) {
      addNotification('Sélectionnez une voiture et un client.', 'warning');
      return false;
    }
    if (!core.date_debut) {
      addNotification('Date de début obligatoire.', 'warning');
      return false;
    }
    if (!core.prix_journalier) {
      addNotification('Prix journalier obligatoire.', 'warning');
      return false;
    }
    return true;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        voiture: parseInt(core.voiture, 10),
        client: parseInt(core.client, 10),
        conducteur_secondaire: core.conducteur_secondaire ? parseInt(core.conducteur_secondaire, 10) : null,
        date_debut: core.date_debut,
        heure_depart: core.heure_depart || null,
        date_fin: core.date_fin || null,
        heure_retour: core.heure_retour || null,
        nombre_jours: parseInt(core.nombre_jours, 10) || 1,
        jours_prolongation: 0,
        prix_journalier: parseFloat(core.prix_journalier) || 0,
        tarif_special: null,
        avance: parseFloat(core.avance) || 0,
        franchise: parseFloat(core.franchise) || 0,
        long_duration: false,
        billing_mode: 'JOURNALIER',
        numero_contrat: core.numero_contrat || '',
        methode_paiement: core.methode_paiement || 'CASH',
        commentaire: buildContractComment(extras),
      };

      const response = isEdit
        ? await reservationsService.update(id, payload)
        : await reservationsService.create(payload);

      setSavedReservation(response?.data || { id: Number(id), ...payload });
      addNotification('Contrat enregistré. Vous pouvez imprimer.', 'success');
      navigate('/admin/reservations');
    } catch (error) {
      console.error(error);
      addNotification('Erreur lors de l\'enregistrement du contrat.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const buildContractPrintHtml = () => {
    const clientName = `${selectedClient?.nom || extras.locataire_nom || ''} ${selectedClient?.prenom || extras.locataire_prenom || ''}`.trim();
    const secondaryName = `${selectedSecondaryClient?.nom || extras.secondaire_nom || ''} ${selectedSecondaryClient?.prenom || extras.secondaire_prenom || ''}`.trim();
    const carName = `${selectedCar?.marque || ''} ${selectedCar?.modele || ''}`.trim();
    const hasSecondary = Boolean(core.conducteur_secondaire);

    const yesNo = (v) => (v ? 'Oui' : 'Non');

    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Contrat de location ${core.numero_contrat || reservationRef || ''}</title>
<style>
@page { size: A4; margin: 10mm; }
body { font-family: Arial, sans-serif; color:#111; font-size:12px; }
.section { border: 1px solid #ccc; margin-bottom: 8px; }
.section h3 { margin:0; padding:6px 8px; background:#ef4444; color:white; text-transform:uppercase; font-size:12px; letter-spacing:.08em; }
.grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 12px; padding:8px; }
.row { display:grid; grid-template-columns:180px 1fr; gap:6px; }
.fact-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; padding:8px; }
.head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
.box { border:1px solid #666; padding:8px; min-width:220px; }
.bold { font-weight:700; }
</style>
</head>
<body>
<div class="head">
  <div>
    <div class="bold" style="font-size:20px;">LOCAMAX</div>
    <div>Location de voitures</div>
    <div>Téléphone: 05 22 47 47 88</div>
  </div>
  <div class="box">
    <div class="bold">CONTRAT DE LOCATION</div>
    <div><span class="bold">Numéro:</span> ${core.numero_contrat || reservationRef || '—'}</div>
    <div><span class="bold">Date:</span> ${formatDate(new Date())}</div>
  </div>
</div>

<div class="section">
  <h3>Locataire</h3>
  <div class="grid">
    <div class="row"><div>Nom/Prénom</div><div>${clientName || '—'}</div></div>
    <div class="row"><div>Téléphone</div><div>${selectedClient?.telephone || extras.locataire_telephone || '—'}</div></div>
    <div class="row"><div>C.I.N</div><div>${extras.locataire_cin || '—'}</div></div>
    <div class="row"><div>Adresse</div><div>${extras.locataire_adresse || '—'}</div></div>
    <div class="row"><div>Permis N°</div><div>${extras.locataire_numero_permis || '—'}</div></div>
    <div class="row"><div>Expiré le</div><div>${formatDate(extras.locataire_expiration_permis)}</div></div>
    <div class="row"><div>Délivré le</div><div>${formatDate(extras.locataire_delivre_le)}</div></div>
    <div class="row"><div>Passeport N°</div><div>${extras.locataire_passport || '—'}</div></div>
  </div>
</div>

${hasSecondary ? `
<div class="section">
  <h3>2ème Conducteur</h3>
  <div class="grid">
    <div class="row"><div>Nom/Prénom</div><div>${secondaryName || '—'}</div></div>
    <div class="row"><div>C.I.N</div><div>${extras.secondaire_cin || '—'}</div></div>
    <div class="row"><div>Adresse</div><div>${extras.secondaire_adresse || '—'}</div></div>
    <div class="row"><div>Permis N°</div><div>${extras.secondaire_numero_permis || '—'}</div></div>
    <div class="row"><div>Expiré le</div><div>${formatDate(extras.secondaire_expiration_permis)}</div></div>
    <div class="row"><div>Délivré le</div><div>${formatDate(extras.secondaire_delivre_le)}</div></div>
    <div class="row"><div>Passeport N°</div><div>${extras.secondaire_passport || '—'}</div></div>
  </div>
</div>
` : ''}

<div class="section">
  <h3>Véhicule</h3>
  <div class="grid">
    <div class="row"><div>Immatricule</div><div>${selectedCar?.immatriculation || '—'}</div></div>
    <div class="row"><div>Marque</div><div>${selectedCar?.marque || '—'}</div></div>
    <div class="row"><div>Modele</div><div>${selectedCar?.modele || '—'}</div></div>
    <div class="row"><div>Catégorie</div><div>${selectedCar?.categorie || '—'}</div></div>
    <div class="row"><div>Date livraison</div><div>${formatDate(extras.livraison_date)} ${extras.livraison_heure || ''}</div></div>
    <div class="row"><div>KM livraison</div><div>${extras.livraison_km || '—'}</div></div>
    <div class="row"><div>Lieu livraison</div><div>${extras.livraison_lieu || '—'}</div></div>
    <div class="row"><div>Date récupération</div><div>${formatDate(extras.recuperation_date || core.date_fin)} ${extras.recuperation_heure || core.heure_retour || ''}</div></div>
    <div class="row"><div>KM récupération</div><div>${extras.recuperation_km || '—'}</div></div>
    <div class="row"><div>Lieu récupération</div><div>${extras.recuperation_lieu || '—'}</div></div>
    <div class="row"><div>Prolongation</div><div>${formatDate(extras.prolongation_date)} ${extras.prolongation_heure || ''}</div></div>
    <div class="row"><div>KM Prolongation</div><div>${extras.prolongation_km || '—'}</div></div>
    <div class="row"><div>Lieu Prolongation</div><div>${extras.prolongation_lieu || '—'}</div></div>
  </div>
</div>

<div class="section">
  <h3>Départ / Retour</h3>
  <div class="grid">
    <div>
      <div class="bold">Départ</div>
      <div>Pneu secours: ${yesNo(extras.depart_pneu_secours)}</div>
      <div>Cric: ${yesNo(extras.depart_cric)}</div>
      <div>Gilets: ${yesNo(extras.depart_gilets)}</div>
      <div>Tapis: ${yesNo(extras.depart_tapis)}</div>
      <div>Rayures: ${yesNo(extras.depart_rayures)}</div>
      <div>Aucun dommage: ${yesNo(extras.depart_aucun_dommage)}</div>
      <div>Jauge: ${extras.depart_jauge}</div>
      <div>Observation: ${extras.depart_observation || '—'}</div>
    </div>
    <div>
      <div class="bold">Retour</div>
      <div>Pneu secours: ${yesNo(extras.retour_pneu_secours)}</div>
      <div>Cric: ${yesNo(extras.retour_cric)}</div>
      <div>Gilets: ${yesNo(extras.retour_gilets)}</div>
      <div>Tapis: ${yesNo(extras.retour_tapis)}</div>
      <div>Rayures: ${yesNo(extras.retour_rayures)}</div>
      <div>Aucun dommage: ${yesNo(extras.retour_aucun_dommage)}</div>
      <div>Jauge: ${extras.retour_jauge}</div>
      <div>Observation: ${extras.retour_observation || '—'}</div>
    </div>
  </div>
</div>

<div class="section">
  <h3>Facturation</h3>
  <div class="fact-grid">
    <div><span class="bold">Tarif/jour TTC</span><br/>${displayMoney(core.prix_journalier)}</div>
    <div><span class="bold">Durée</span><br/>${core.nombre_jours} jour(s)</div>
    <div><span class="bold">TVA ${extras.tva_rate}%</span><br/>${displayMoney(totals.tvaValue)}</div>
    <div><span class="bold">Total TTC</span><br/>${displayMoney(totals.ttc)}</div>
    <div><span class="bold">Avance</span><br/>${displayMoney(core.avance)}</div>
    <div><span class="bold">Reste</span><br/>${displayMoney(totals.reste)}</div>
    <div><span class="bold">Montant Franchise</span><br/>${displayMoney(core.franchise)}</div>
    <div><span class="bold">Service Extra</span><br/>${displayMoney(extras.service_extra)}</div>
  </div>
</div>

<div style="margin-top:12px; display:grid; grid-template-columns:1fr 1fr; gap:24px;">
  <div>Signature Agent: ${extras.signature_agent || '__________________'}</div>
  <div>Signature Client: ${extras.signature_client || '__________________'}</div>
</div>

<script>window.onload = () => window.print();</script>
</body>
</html>`;
  };

  const handlePrint = () => {
    if (!reservationRef) {
      addNotification('Enregistrez le contrat avant impression.', 'warning');
      return;
    }
    const w = window.open('', '_blank', 'width=1200,height=900');
    if (!w) {
      addNotification('Veuillez autoriser les popups.', 'warning');
      return;
    }
    w.document.write(buildContractPrintHtml());
    w.document.close();
  };

  const handlePdf = async () => {
    if (!reservationRef) {
      addNotification('Enregistrez le contrat avant PDF.', 'warning');
      return;
    }

    setContractBusy(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const lh = 6;
      let y = 10;

      const line = (label, value) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 12, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value || '—'), 58, y);
        y += lh;
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('CONTRAT DE LOCATION', 12, y);
      y += 8;

      line('Numero contrat', core.numero_contrat || reservationRef);
      line('Date', formatDate(new Date()));
      y += 2;

      doc.setFont('helvetica', 'bold');
      doc.text('LOCATAIRE', 12, y);
      y += lh;
      line('Nom/Prenom', `${selectedClient?.nom || extras.locataire_nom || ''} ${selectedClient?.prenom || extras.locataire_prenom || ''}`.trim());
      line('Telephone', selectedClient?.telephone || extras.locataire_telephone || '');
      line('CIN', extras.locataire_cin);
      line('Adresse', extras.locataire_adresse);
      line('Permis N', extras.locataire_numero_permis);
      line('Expire le', formatDate(extras.locataire_expiration_permis));
      line('Delivre le', formatDate(extras.locataire_delivre_le));
      line('Passeport', extras.locataire_passport);
      y += 2;

      if (core.conducteur_secondaire) {
        doc.setFont('helvetica', 'bold');
        doc.text('2EME CONDUCTEUR', 12, y);
        y += lh;
        line('Nom/Prenom', `${selectedSecondaryClient?.nom || extras.secondaire_nom || ''} ${selectedSecondaryClient?.prenom || extras.secondaire_prenom || ''}`.trim());
        line('CIN', extras.secondaire_cin);
        line('Adresse', extras.secondaire_adresse);
        line('Permis N', extras.secondaire_numero_permis);
        line('Expire le', formatDate(extras.secondaire_expiration_permis));
        line('Delivre le', formatDate(extras.secondaire_delivre_le));
        line('Passeport', extras.secondaire_passport);
      }

      if (y > 250) {
        doc.addPage();
        y = 12;
      }

      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.text('VEHICULE', 12, y);
      y += lh;
      line('Immatricule', selectedCar?.immatriculation || '');
      line('Marque', selectedCar?.marque || '');
      line('Modele', selectedCar?.modele || '');
      line('Categorie', selectedCar?.categorie || '');
      line('Livraison', `${formatDate(extras.livraison_date)} ${extras.livraison_heure}`.trim());
      line('KM livraison', extras.livraison_km);
      line('Lieu livraison', extras.livraison_lieu);
      line('Recuperation', `${formatDate(extras.recuperation_date || core.date_fin)} ${extras.recuperation_heure || core.heure_retour}`.trim());
      line('KM recuperation', extras.recuperation_km);
      line('Lieu recuperation', extras.recuperation_lieu);
      line('Prolongation', `${formatDate(extras.prolongation_date)} ${extras.prolongation_heure}`.trim());
      line('KM prolongation', extras.prolongation_km);
      line('Lieu prolongation', extras.prolongation_lieu);

      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.text('FACTURATION', 12, y);
      y += lh;
      line('Tarif jour TTC', displayMoney(core.prix_journalier));
      line('Duree location', `${core.nombre_jours} jour(s)`);
      line(`TVA ${extras.tva_rate}%`, displayMoney(totals.tvaValue));
      line('Total TTC', displayMoney(totals.ttc));
      line('Avance', displayMoney(core.avance));
      line('Reste', displayMoney(totals.reste));
      line('Montant franchise', displayMoney(core.franchise));
      line('Service extra', displayMoney(extras.service_extra));

      y += 4;
      line('Signature agent', extras.signature_agent || '__________________');
      line('Signature client', extras.signature_client || '__________________');

      const fileName = `Contrat_${core.numero_contrat || reservationRef}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error(error);
      addNotification('Erreur PDF contrat.', 'error');
    } finally {
      setContractBusy(false);
    }
  };

  if (loadingInit) {
    return (
      <div className="contract-page">
        <Loader />
      </div>
    );
  }

  return (
    <div className="contract-page">
      <PageHeader
        title={isEdit ? 'Contrat de location - Modification' : 'Contrat de location - Nouveau'}
        subtitle="Formulaire aligné sur le contrat papier"
        backUrl="/admin/reservations"
      />

      <form className="contract-form" onSubmit={handleSave}>
        <section className="contract-section">
          <h3>Locataire</h3>
          <div className="grid-4">
            <label>
              Client (compte) *
              <input
                type="text"
                name="client_search"
                list="clients-options"
                value={clientQuery}
                onChange={handleClientSearchChange}
                placeholder="Saisir ou sélectionner un nom client"
                autoComplete="off"
                required
              />
              <datalist id="clients-options">
                {clients.map((client) => (
                  <option key={client.id} value={`${client.prenom || ''} ${client.nom || ''}`.trim()}>
                    {client.telephone || ''}
                  </option>
                ))}
              </datalist>
              {!core.client && (
                <small className="field-hint">Choisissez un client existant depuis la liste proposée.</small>
              )}
            </label>
            <label>
              2ème conducteur (compte)
              <select name="conducteur_secondaire" value={core.conducteur_secondaire} onChange={handleCore}>
                <option value="">Aucun</option>
                {clients
                  .filter((c) => String(c.id) !== String(core.client))
                  .map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nom} {client.prenom}
                    </option>
                  ))}
              </select>
            </label>
            <label>CIN<input name="locataire_cin" value={extras.locataire_cin} onChange={handleExtras} /></label>
            <label>Adresse<input name="locataire_adresse" value={extras.locataire_adresse} onChange={handleExtras} /></label>
            <label>Permis N°<input name="locataire_numero_permis" value={extras.locataire_numero_permis} onChange={handleExtras} /></label>
            <label>Permis expiré le<input type="date" name="locataire_expiration_permis" value={extras.locataire_expiration_permis} onChange={handleExtras} /></label>
            <label>Permis délivré le<input type="date" name="locataire_delivre_le" value={extras.locataire_delivre_le} onChange={handleExtras} /></label>
            <label>Passeport N°<input name="locataire_passport" value={extras.locataire_passport} onChange={handleExtras} /></label>
          </div>
        </section>

        <section className="contract-section">
          <h3>2ème Conducteur</h3>
          <div className="grid-4">
            <label>CIN<input name="secondaire_cin" value={extras.secondaire_cin} onChange={handleExtras} disabled={!core.conducteur_secondaire} /></label>
            <label>Adresse<input name="secondaire_adresse" value={extras.secondaire_adresse} onChange={handleExtras} disabled={!core.conducteur_secondaire} /></label>
            <label>Permis N°<input name="secondaire_numero_permis" value={extras.secondaire_numero_permis} onChange={handleExtras} disabled={!core.conducteur_secondaire} /></label>
            <label>Permis expiré le<input type="date" name="secondaire_expiration_permis" value={extras.secondaire_expiration_permis} onChange={handleExtras} disabled={!core.conducteur_secondaire} /></label>
            <label>Permis délivré le<input type="date" name="secondaire_delivre_le" value={extras.secondaire_delivre_le} onChange={handleExtras} disabled={!core.conducteur_secondaire} /></label>
            <label>Passeport N°<input name="secondaire_passport" value={extras.secondaire_passport} onChange={handleExtras} disabled={!core.conducteur_secondaire} /></label>
            {!core.conducteur_secondaire && <small className="field-hint">Optionnel: choisissez un 2ème conducteur (compte) pour activer ces champs.</small>}
          </div>
        </section>

        <section className="contract-section">
          <h3>Véhicule / Délais</h3>
          <div className="grid-4">
            <label>
              Voiture (compte) *
              <select name="voiture" value={core.voiture} onChange={handleCore} required>
                <option value="">Sélectionner</option>
                {availableCars.map((car) => (
                  <option key={car.id} value={car.id}>
                    {car.immatriculation} - {car.marque} {car.modele}
                  </option>
                ))}
              </select>
            </label>
            <label>N° Contrat<input name="numero_contrat" value={core.numero_contrat} onChange={handleCore} placeholder="Ex: 0000362" /></label>
            <label>Date début *<input type="date" name="date_debut" value={core.date_debut} onChange={handleCore} required /></label>
            <label>Heure départ<input type="time" name="heure_depart" value={core.heure_depart} onChange={handleCore} /></label>
            <label>Date fin<input type="date" name="date_fin" value={core.date_fin} onChange={handleCore} /></label>
            <label>Heure retour<input type="time" name="heure_retour" value={core.heure_retour} onChange={handleCore} /></label>

            <label>Nombre jours<input type="number" min="1" name="nombre_jours" value={core.nombre_jours} onChange={handleCore} /></label>
          </div>
        </section>

        <section className="contract-section">
          <h3>Départ / Out</h3>
          <div className="grid-4">
            <label className="check"><input type="checkbox" name="depart_pneu_secours" checked={extras.depart_pneu_secours} onChange={handleExtras} />Pneu de secours</label>
            <label className="check"><input type="checkbox" name="depart_cric" checked={extras.depart_cric} onChange={handleExtras} />Cric</label>
            <label className="check"><input type="checkbox" name="depart_gilets" checked={extras.depart_gilets} onChange={handleExtras} />Gilets</label>
            <label className="check"><input type="checkbox" name="depart_tapis" checked={extras.depart_tapis} onChange={handleExtras} />Tapis</label>
            <label className="check"><input type="checkbox" name="depart_rayures" checked={extras.depart_rayures} onChange={handleExtras} />Rayures</label>
            <label className="check"><input type="checkbox" name="depart_aucun_dommage" checked={extras.depart_aucun_dommage} onChange={handleExtras} />Aucun dommage</label>
            <label>Jauge départ
              <select name="depart_jauge" value={extras.depart_jauge} onChange={handleExtras}>
                <option value="E">E</option><option value="1/4">1/4</option><option value="1/2">1/2</option><option value="3/4">3/4</option><option value="F">F</option>
              </select>
            </label>
            <label className="span-2">Observation départ<textarea name="depart_observation" value={extras.depart_observation} onChange={handleExtras} rows="2" /></label>
          </div>
        </section>

        <section className="contract-section">
          <h3>Retour / In</h3>
          <div className="grid-4">
            <label className="check"><input type="checkbox" name="retour_pneu_secours" checked={extras.retour_pneu_secours} onChange={handleExtras} />Pneu de secours</label>
            <label className="check"><input type="checkbox" name="retour_cric" checked={extras.retour_cric} onChange={handleExtras} />Cric</label>
            <label className="check"><input type="checkbox" name="retour_gilets" checked={extras.retour_gilets} onChange={handleExtras} />Gilets</label>
            <label className="check"><input type="checkbox" name="retour_tapis" checked={extras.retour_tapis} onChange={handleExtras} />Tapis</label>
            <label className="check"><input type="checkbox" name="retour_rayures" checked={extras.retour_rayures} onChange={handleExtras} />Rayures</label>
            <label className="check"><input type="checkbox" name="retour_aucun_dommage" checked={extras.retour_aucun_dommage} onChange={handleExtras} />Aucun dommage</label>
            <label>Jauge retour
              <select name="retour_jauge" value={extras.retour_jauge} onChange={handleExtras}>
                <option value="E">E</option><option value="1/4">1/4</option><option value="1/2">1/2</option><option value="3/4">3/4</option><option value="F">F</option>
              </select>
            </label>
            <label className="span-2">Observation retour<textarea name="retour_observation" value={extras.retour_observation} onChange={handleExtras} rows="2" /></label>
          </div>
        </section>

        <section className="contract-section">
          <h3>Facturation</h3>
          <div className="grid-4">
            <label>Tarif jour TTC *<input name="prix_journalier" value={core.prix_journalier} onChange={handleCore} required /></label>
            <label>TVA (%)<input name="tva_rate" value={extras.tva_rate} onChange={handleExtras} /></label>
            <label>Avance<input name="avance" value={core.avance} onChange={handleCore} /></label>
            <label>Franchise<input name="franchise" value={core.franchise} onChange={handleCore} /></label>
            <label>Service extra<input name="service_extra" value={extras.service_extra} onChange={handleExtras} /></label>
            <label>Methode paiement
              <select name="methode_paiement" value={core.methode_paiement} onChange={handleCore}>
                <option value="CASH">Espèces</option>
                <option value="CARD">Carte</option>
                <option value="CHEQUE">Chèque</option>
                <option value="TPE">TPE</option>
                <option value="TRANSFER">Virement</option>
                <option value="OTHER">Autre</option>
              </select>
            </label>
            <label className="readonly">Total HT<input value={displayMoney(totals.ht)} readOnly /></label>
            <label className="readonly">TVA valeur<input value={displayMoney(totals.tvaValue)} readOnly /></label>
            <label className="readonly">Total TTC<input value={displayMoney(totals.ttc)} readOnly /></label>
            <label className="readonly">Reste<input value={displayMoney(totals.reste)} readOnly /></label>
          </div>
        </section>

        <section className="contract-section">
          <h3>Signatures / Notes</h3>
          <div className="grid-4">
            <label>Signature Agent<input name="signature_agent" value={extras.signature_agent} onChange={handleExtras} /></label>
            <label>Signature Client<input name="signature_client" value={extras.signature_client} onChange={handleExtras} /></label>
            <label className="span-2">Notes<textarea name="notes" rows="2" value={extras.notes} onChange={handleExtras} /></label>
          </div>
        </section>

        <div className="contract-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/admin/reservations')}>Retour</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer Contrat'}</button>
        </div>
      </form>
    </div>
  );
}

export default AddReservation;
