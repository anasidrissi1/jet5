import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import Loader from '../components/Loader';
import PageHeader from '../components/PageHeader';
import '../styles/pages.css';
import '../styles/cars.css';
import './entretiens-detail.css';

const TYPE_LABELS = {
  vidange: 'Vidange',
  pneus: 'Changement de pneus',
  freins: 'Révision des freins',
  batterie: 'Batterie',
  autre: 'Révision générale',
};

// Construit les sections d'opérations à partir de l'objet entretien
const buildOperationSections = (entretien) => {
  if (!entretien) return [];

  const sections = [];
  const type = (entretien.type_entretien || '').toLowerCase();

  // Vidange : huile + filtres
  const vidangeItems = [];
  if (type === 'vidange') {
    vidangeItems.push('Huile moteur');
  }
  const v = entretien.vidange;
  if (v) {
    if (v.filtre_huile) vidangeItems.push('Filtre à huile');
    if (v.filtre_air) vidangeItems.push('Filtre à air');
    if (v.filtre_carburant) vidangeItems.push('Filtre à carburant');
  }
  if (vidangeItems.length) {
    sections.push({ title: 'Vidange', items: vidangeItems });
  }

  // Pneus : une ligne par position
  const pneusItems = [];
  if (Array.isArray(entretien.pneus)) {
    entretien.pneus.forEach((p) => {
      const pos = p.position_display || p.position || '';
      if (pos) pneusItems.push(pos);
    });
  }
  if (pneusItems.length) {
    sections.push({ title: 'Pneus', items: pneusItems });
  }

  // Freins : une ligne par type de frein
  const freinsItems = [];
  if (Array.isArray(entretien.freins)) {
    entretien.freins.forEach((f) => {
      const label = f.type_display || f.type_frein || '';
      if (label) freinsItems.push(label);
    });
  }
  if (freinsItems.length) {
    sections.push({ title: 'Freins', items: freinsItems });
  }

  // Batterie
  if (entretien.batterie) {
    sections.push({ title: 'Batterie', items: ['Batterie remplacée'] });
  }

  // Révision générale / autre
  const r = entretien.revision;
  const revisionItems = [];
  if (r) {
    if (r.controle_freins) revisionItems.push('Contrôle des freins');
    if (r.controle_suspension) revisionItems.push('Contrôle de la suspension');
    if (r.controle_direction) revisionItems.push('Contrôle de la direction');
    if (r.controle_climatisation) revisionItems.push('Contrôle de la climatisation');
    if (r.diagnostic_electronique) revisionItems.push('Diagnostic électronique');
  }
  if (revisionItems.length) {
    sections.push({ title: 'Révision générale', items: revisionItems });
  }

  return sections;
};

const EntretienDetail = () => {
  const { id } = useParams();
  const [entretien, setEntretien] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/cars/entretiens/${id}/`);
        if (!mounted) return;
        setEntretien(res.data);
      } catch (err) {
        console.error('Erreur chargement entretien', err);
        if (!mounted) return;
        setError("Impossible de charger l'entretien.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="page-container">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="cars-page">
        <PageHeader
          title="Détails de l'entretien"
          subtitle="Impossible de charger l'entretien"
          backUrl="/admin/entretiens"
        />
        <div className="cars-body">
          <p className="entretien-error">{error}</p>
        </div>
      </div>
    );
  }

  const car = entretien?.voiture_details || entretien?.car || null;
  const sections = buildOperationSections(entretien);

  const formatCost = (value) => {
    if (value == null) return '-';
    const num = parseFloat(value);
    if (Number.isNaN(num)) return '-';
    return `${num.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`;
  };

  return (
    <div className="cars-page">
      <PageHeader
        title="Détails de l'entretien"
        subtitle="Visualisez le détail pour ce véhicule"
        backUrl="/admin/entretiens"
      />

      <div className="cars-body">
        <div className="entretien-detail-card entretien-detail-card--highlight">
          <div className="entretien-detail-grid">
            <div className="entretien-detail-block">
              <h3 className="entretien-block-title">Véhicule</h3>
              <div className="entretien-summary-grid">
                <div className="entretien-summary-item">
                  <div className="entretien-summary-label">Marque</div>
                  <div className="entretien-summary-value">{car?.marque || '-'}</div>
                </div>
                <div className="entretien-summary-item">
                  <div className="entretien-summary-label">Modèle</div>
                  <div className="entretien-summary-value">{car?.modele || '-'}</div>
                </div>
                <div className="entretien-summary-item">
                  <div className="entretien-summary-label">Immatriculation</div>
                  <div className="entretien-summary-value">{car?.immatriculation || '-'}</div>
                </div>
              </div>
            </div>

            <div className="entretien-detail-block">
              <h3 className="entretien-block-title">Résumé de l'entretien</h3>
              <div className="entretien-summary-grid">
                <div className="entretien-summary-item">
                  <div className="entretien-summary-label">Type</div>
                  <div className="entretien-summary-chip">
                    {TYPE_LABELS[entretien?.type_entretien] || entretien?.type_entretien || '-'}
                  </div>
                </div>
                <div className="entretien-summary-item">
                  <div className="entretien-summary-label">Date</div>
                  <div className="entretien-summary-value">{entretien?.date_entretien || '-'}</div>
                </div>
                <div className="entretien-summary-item">
                  <div className="entretien-summary-label">Coût</div>
                  <div className="entretien-summary-cost">{formatCost(entretien?.cout)}</div>
                </div>
              </div>
            </div>
          </div>

          {entretien?.description && (
            <div className="entretien-detail-block">
              <h3 className="entretien-block-title">Commentaire</h3>
              <p className="entretien-description">{entretien.description}</p>
            </div>
          )}

          {sections.length > 0 && (
            <div className="entretien-detail-block">
              <h3 className="entretien-block-title">Détail des opérations</h3>
              <div className="entretien-operations-table">
                <div className="entretien-operations-header">
                  <div>Catégorie</div>
                  <div>Éléments concernés</div>
                </div>
                {sections.map((section) => (
                  <div
                    key={section.title}
                    className="entretien-operations-row"
                  >
                    <div className="entretien-operations-category">{section.title}</div>
                    <div className="entretien-operations-items">
                      {section.items.map((label, index) => (
                        <span
                          key={`${section.title}-${index}`}
                          className="entretien-tag"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EntretienDetail;
