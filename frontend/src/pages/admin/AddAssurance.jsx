import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { carsService, assurancesService } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import Loader from "../../components/Loader";
import PageHeader from "../../components/PageHeader";
import FormInput from "../../components/FormInput";
import "../../styles/autorisations.css";
import MultiSelect from "../../components/forms/MultiSelect";
import VehicleSelectionBar from "../../components/forms/VehicleSelectionBar";

const normalizeDateInput = (value) => {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }
    return value.toISOString().split("T")[0];
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return "";
  }

  const isoMatch = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const frMatch = stringValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (frMatch) {
    const [, day, month, year] = frMatch;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(stringValue);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().split("T")[0];
};

const parseInputDate = (value) => {
  const normalized = normalizeDateInput(value);
  if (!normalized) {
    return null;
  }
  const [year, month, day] = normalized.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const isValidDateRange = (start, end) => {
  const startDate = parseInputDate(start);
  const endDate = parseInputDate(end);
  if (!startDate || !endDate) {
    return false;
  }
  return endDate.getTime() >= startDate.getTime();
};

function AddAssurance() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotification } = useNotification();

  const assuranceToEdit = location.state?.assuranceToEdit;
  const isEditMode = !!assuranceToEdit;

  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoitures, setSelectedVoitures] = useState(
    isEditMode && assuranceToEdit?.voiture ? [String(assuranceToEdit.voiture)] : []
  );
  const [formData, setFormData] = useState(() => {
    const fallbackStart = normalizeDateInput(new Date());
    const fallbackEnd = normalizeDateInput(
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    );

    const initialStart = isEditMode
      ? normalizeDateInput(assuranceToEdit?.date_debut) || fallbackStart
      : fallbackStart;

    const rawInitialEnd = isEditMode
      ? normalizeDateInput(assuranceToEdit?.date_expiration) || fallbackEnd
      : fallbackEnd;

    const initialEnd = isValidDateRange(initialStart, rawInitialEnd)
      ? rawInitialEnd
      : initialStart;

    return {
      compagnie: isEditMode ? assuranceToEdit?.compagnie || "" : "",
      numero_contrat: isEditMode ? assuranceToEdit?.numero_contrat || "" : "",
      date_debut: initialStart,
      date_expiration: initialEnd,
      montant: isEditMode ? assuranceToEdit?.montant || "" : "",
      document_pdf: null,
    };
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const carsRes = await carsService.list();
        const carsPayload = carsRes.data;
        const carsList = Array.isArray(carsPayload)
          ? carsPayload
          : carsPayload?.results ?? carsPayload?.items ?? [];

        const assurRes = await assurancesService.list();
        const assurPayload = assurRes.data;
        const assurList = Array.isArray(assurPayload)
          ? assurPayload
          : assurPayload?.results ?? assurPayload?.items ?? [];

        const carsWithValidInsurance = assurList
          .filter((assur) => {
            const today = new Date();
            const exp = new Date(assur.date_expiration);
            return exp > today;
          })
          .map((assur) => assur.voiture);

        const availableCars = carsList.filter(
          (car) => !carsWithValidInsurance.includes(car.id)
        );
        setCars(availableCars || []);
      } catch (err) {
        console.error("Erreur lors du chargement des données :", err);
        addNotification(
          err.response?.data?.detail || "Erreur lors du chargement",
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [addNotification]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedVoitures.length === 0 && !isEditMode) {
      addNotification("Veuillez sélectionner au moins une voiture", "error");
      return;
    }

    if (!formData.date_debut || !formData.date_expiration) {
      addNotification("Veuillez renseigner les dates", "error");
      return;
    }

    if (!isValidDateRange(formData.date_debut, formData.date_expiration)) {
      addNotification("La date d'expiration doit être postérieure à la date de début", "error");
      return;
    }

    try {
      if (isEditMode) {
        const formDataToSend = new FormData();
        const targetId =
          assuranceToEdit?.voiture ??
          selectedVoitures[0] ??
          assuranceToEdit?.car?.id;
        if (targetId) {
          formDataToSend.append("voiture", parseInt(targetId, 10));
        }
        formDataToSend.append("date_debut", formData.date_debut);
        formDataToSend.append("date_expiration", formData.date_expiration);

        if (formData.compagnie) formDataToSend.append("compagnie", formData.compagnie);
        if (formData.numero_contrat) formDataToSend.append("numero_contrat", formData.numero_contrat);
        if (formData.montant) formDataToSend.append("montant", formData.montant);
        if (formData.document_pdf) formDataToSend.append("document_pdf", formData.document_pdf);

        await assurancesService.update(assuranceToEdit.id, formDataToSend);

        addNotification("Assurance modifiée avec succès", "success");
        navigate("/admin/assurances");
      } else {
        const promises = selectedVoitures.map((voitureId) => {
          const formDataToSend = new FormData();
          formDataToSend.append("voiture", parseInt(voitureId, 10));
          formDataToSend.append("date_debut", formData.date_debut);
          formDataToSend.append("date_expiration", formData.date_expiration);

          if (formData.compagnie) formDataToSend.append("compagnie", formData.compagnie);
          if (formData.numero_contrat) formDataToSend.append("numero_contrat", formData.numero_contrat);
          if (formData.montant) formDataToSend.append("montant", formData.montant);
          if (formData.document_pdf) formDataToSend.append("document_pdf", formData.document_pdf);

          return assurancesService.create(formDataToSend);
        });

        await Promise.all(promises);

        const message =
          selectedVoitures.length === 1
            ? "Assurance ajoutée avec succès"
            : `${selectedVoitures.length} assurances ajoutées avec succès`;

        addNotification(message, "success");
        navigate("/admin/assurances");
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement :", err);
      addNotification(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          "Erreur lors de l'enregistrement",
        "error"
      );
    }
  };

  const selectedVehicles = useMemo(() => {
    if (isEditMode) {
      return assuranceToEdit?.car ? [assuranceToEdit.car] : [];
    }
    return cars.filter((car) => selectedVoitures.includes(String(car.id)));
  }, [isEditMode, assuranceToEdit, cars, selectedVoitures]);

  const existingDocumentInfo = useMemo(() => {
    if (!isEditMode) {
      return null;
    }

    const docSource =
      assuranceToEdit?.document_pdf_url ??
      assuranceToEdit?.document_pdf ??
      assuranceToEdit?.document_url ??
      null;

    if (!docSource) {
      return null;
    }

    if (typeof docSource === "string") {
      const cleaned = docSource.split("?")[0];
      const name = cleaned.split("/").filter(Boolean).pop() || "Document actuel";
      const isHttp = /^https?:\/\//i.test(docSource);
      return { name, url: isHttp ? docSource : null };
    }

    if (typeof docSource === "object") {
      const name =
        docSource.name ||
        docSource.filename ||
        (typeof docSource.path === "string"
          ? docSource.path.split("/").filter(Boolean).pop()
          : "Document actuel");
      const rawUrl = docSource.url || docSource.path || null;
      const url =
        typeof rawUrl === "string" && /^https?:\/\//i.test(rawUrl) ? rawUrl : null;
      return { name, url };
    }

    return null;
  }, [assuranceToEdit, isEditMode]);

  if (loading) {
    return (
      <div className="cars-page">
        <Loader />
      </div>
    );
  }

  return (
    <div className="cars-page">
      <PageHeader
        title={isEditMode ? "✏️ Modifier l'Assurance" : "🛡️ Nouvelle Assurance"}
        subtitle={
          isEditMode
            ? "Modifier l'assurance automobile"
            : "Enregistrer une nouvelle assurance automobile"
        }
      />
      <div className="cars-body">
        <div className="assurance-form-card">
          <div className="assurance-form-layout single-page">
            <div className="assurance-form-area">
              <form onSubmit={handleSubmit}>
                <div className="assurance-step-wrapper">
                  <section className="assurance-step-card">
                    <h3 className="assurance-step-title">🚗 Sélection du véhicule</h3>
                    <p className="assurance-step-intro">
                      Sélectionnez le véhicule concerné. Les voitures déjà couvertes
                      n'apparaissent plus dans la liste.
                    </p>
                    <div className="form-group">
                      <label>Voitures *</label>
                      {isEditMode ? (
                            <FormInput
                              type="text"
                              value={`${assuranceToEdit.car?.marque || ""} ${
                                assuranceToEdit.car?.modele || ""
                              } - ${assuranceToEdit.car?.immatriculation || ""}`}
                              disabled
                              style={{
                                background: "var(--bg-secondary)",
                                cursor: "not-allowed",
                              }}
                            />
                          ) : (
                            <>
                              <MultiSelect
                                options={cars}
                                selectedValues={selectedVoitures}
                                onChange={setSelectedVoitures}
                                placeholder="-- Sélectionner des voitures --"
                                labelKey={(car) =>
                                  `${car.marque || ""} ${car.modele || ""}`.trim() ||
                                  car.immatriculation
                                }
                                secondaryLabelKey={(car) =>
                                  `📋 ${car.immatriculation || "Immatriculation inconnue"}`
                                }
                                emptyState="🚗 Aucune voiture disponible"
                              />
                              <VehicleSelectionBar
                                vehicles={cars}
                                selectedIds={selectedVoitures}
                                onRemove={(id) =>
                                  setSelectedVoitures((prev) => prev.filter((item) => item !== id))
                                }
                                onClear={() => setSelectedVoitures([])}
                              />
                            </>
                          )}
                          {!isEditMode && cars.length === 0 && (
                            <p className="form-error">
                              ⚠️ Aucune voiture disponible (toutes ont déjà une assurance
                              active)
                            </p>
                          )}
                        </div>

                        {selectedVehicles.length > 0 && (
                          <div className="assurance-selection-summary">
                            <div className="assurance-selection-title">
                              Véhicules sélectionnés
                            </div>
                            <div className="assurance-selection-chips">
                              {selectedVehicles.map((vehicle) => (
                                <span
                                  key={vehicle.id}
                                  className="assurance-selection-chip"
                                >
                                  🚗 {vehicle.marque} {vehicle.modele} • {vehicle.immatriculation}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </section>

                      <section className="assurance-step-card">
                        <h3 className="assurance-step-title">
                          📋 Informations de l'assurance
                        </h3>
                        <p className="assurance-step-intro">
                          Renseignez les données principales du contrat. Les champs
                          marqués d'un astérisque sont obligatoires.
                        </p>
                        <div className="form-row">
                          <div className="form-group">
                            <FormInput
                              label="Compagnie d'assurance"
                              name="compagnie"
                              value={formData.compagnie}
                              onChange={(e) =>
                                setFormData({ ...formData, compagnie: e.target.value })
                              }
                              placeholder="Ex: AXA, Wafa Assurance"
                            />
                          </div>
                          <div className="form-group">
                            <FormInput
                              label="Numéro de contrat"
                              name="numero_contrat"
                              value={formData.numero_contrat}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  numero_contrat: e.target.value,
                                })
                              }
                              placeholder="Ex: ASS-2024-001"
                            />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <FormInput
                              type="date"
                              label="Date de début *"
                              name="date_debut"
                              value={formData.date_debut}
                              onChange={(e) => {
                                const nextStart = normalizeDateInput(e.target.value);
                                setFormData((prev) => {
                                  const nextState = { ...prev, date_debut: nextStart };
                                  if (!isValidDateRange(nextStart, prev.date_expiration)) {
                                    nextState.date_expiration = nextStart;
                                  }
                                  return nextState;
                                });
                              }}
                              required
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <FormInput
                              type="date"
                              label="Date d'expiration *"
                              name="date_expiration"
                              value={formData.date_expiration}
                              onChange={(e) => {
                                const nextEnd = normalizeDateInput(e.target.value);
                                setFormData((prev) => ({
                                  ...prev,
                                  date_expiration: nextEnd,
                                }));
                              }}
                              required
                              min={formData.date_debut || undefined}
                              className="form-input"
                            />
                          </div>
                        </div>
                      </section>

                      <section className="assurance-step-card">
                        <h3 className="assurance-step-title">
                          💰 Montant et document
                        </h3>
                        <p className="assurance-step-intro">
                          Finalisez le dossier en indiquant le montant et en ajoutant le
                          justificatif si nécessaire.
                        </p>
                        <div className="form-group">
                          <FormInput
                            type="number"
                            step="0.01"
                            label="Montant (MAD)"
                            name="montant"
                            value={formData.montant}
                            onChange={(e) =>
                              setFormData({ ...formData, montant: e.target.value })
                            }
                            placeholder="Ex: 5000.00"
                          />
                          <small className="form-hint">
                            💡 Montant en dirhams marocains
                          </small>
                        </div>
                        <div className="form-group">
                          <FormInput
                            type="file"
                            label="Document PDF (optionnel)"
                            accept=".pdf"
                            onChange={(e) =>
                              setFormData({ ...formData, document_pdf: e.target.files[0] })
                            }
                            className="form-input"
                          />
                          {formData.document_pdf && (
                            <p className="form-file-name">✅ {formData.document_pdf.name}</p>
                          )}
                          {existingDocumentInfo && !formData.document_pdf && (
                            <div className="assurance-existing-file">
                              <span>📎 Document actuel :</span>
                              {existingDocumentInfo.url ? (
                                <a
                                  href={existingDocumentInfo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {existingDocumentInfo.name}
                                </a>
                              ) : (
                                <span>{existingDocumentInfo.name}</span>
                              )}
                            </div>
                          )}
                          <small className="form-hint">
                            📄 Format accepté: PDF uniquement
                          </small>
                        </div>
                        <div className="resume-card">
                          <h4 className="resume-title">📋 Résumé</h4>
                          <div className="resume-grid">
                            <div>
                              <span className="resume-label">Compagnie:</span>
                              <br />
                              <strong>{formData.compagnie || "-"}</strong>
                            </div>
                            <div>
                              <span className="resume-label">Contrat:</span>
                              <br />
                              <strong>{formData.numero_contrat || "-"}</strong>
                            </div>
                            <div>
                              <span className="resume-label">Période:</span>
                              <br />
                              <strong>
                                {formData.date_debut} → {formData.date_expiration}
                              </strong>
                            </div>
                            <div>
                              <span className="resume-label">Montant:</span>
                              <br />
                              <strong className="resume-montant">
                                {formData.montant
                                  ? `${parseFloat(formData.montant).toFixed(2)} MAD`
                                  : "-"}
                              </strong>
                            </div>
                            {selectedVehicles.length > 0 && (
                              <div className="assurance-resume-vehicles">
                                <span className="resume-label">Véhicules:</span>
                                <div className="assurance-selection-chips">
                                  {selectedVehicles.map((vehicle) => (
                                    <span
                                      key={vehicle.id}
                                      className="assurance-selection-chip"
                                    >
                                      🚗 {vehicle.marque} {vehicle.modele} • {vehicle.immatriculation}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </section>
                    </div>

                <div className="assurance-form-footer">
                  <button type="button" onClick={() => navigate("/admin/assurances")} className="btn-secondary">
                    ← Annuler
                  </button>
                  <div style={{ flex: 1 }}></div>
                  <button type="submit" className="btn-success">
                    ✅ {isEditMode ? "Modifier l'Assurance" : "Ajouter l'Assurance"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddAssurance;
