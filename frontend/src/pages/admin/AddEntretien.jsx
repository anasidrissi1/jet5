import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { carsService, entretiensService } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import Loader from "../../components/Loader";
import PageHeader from "../../components/PageHeader";
import FormInput from "../../components/FormInput";
import SelectField from "../../components/SelectField";
function AddEntretien() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    voiture: "",
    type_entretien: "",
    date_entretien: new Date().toISOString().split("T")[0],
    prix_entretien: "",
    description: "",
  });

  // Cases cochées par type d'entretien
  const [checkedItems, setCheckedItems] = useState({}); // { type: { key: boolean } }

  const navigate = useNavigate();
  const { id } = useParams();
  const { addNotification } = useNotification();
  const isEditMode = Boolean(id);

  const typeEntretienChoices = [
    { value: "vidange", label: "Vidange" },
    { value: "pneus", label: "Changement de pneus" },
    { value: "freins", label: "Révision des freins" },
    { value: "batterie", label: "Batterie" },
    { value: "autre", label: "Révision générale" },
  ];

  // Configuration des éléments cochables par type
  const entretienItemsByType = {
    vidange: [
      { key: "huile", label: "Huile moteur" },
      { key: "filtre_huile", label: "Filtre à huile" },
      { key: "filtre_air", label: "Filtre à air" },
      { key: "filtre_carburant", label: "Filtre à carburant" },
    ],
    pneus: [
      { key: "avant_gauche", label: "Pneu avant gauche" },
      { key: "avant_droit", label: "Pneu avant droit" },
      { key: "arriere_gauche", label: "Pneu arrière gauche" },
      { key: "arriere_droit", label: "Pneu arrière droit" },
    ],
    freins: [
      { key: "plaquettes_avant", label: "Plaquettes avant" },
      { key: "plaquettes_arriere", label: "Plaquettes arrière" },
      { key: "disques_avant", label: "Disques avant" },
      { key: "disques_arriere", label: "Disques arrière" },
    ],
    batterie: [{ key: "batterie", label: "Batterie remplacée" }],
    autre: [
      { key: "controle_freins", label: "Contrôle des freins" },
      { key: "controle_suspension", label: "Contrôle de la suspension" },
      { key: "controle_direction", label: "Contrôle de la direction" },
      { key: "controle_climatisation", label: "Contrôle de la climatisation" },
      { key: "diagnostic_electronique", label: "Diagnostic électronique" },
    ],
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Voitures
        const carsRes = await carsService.list();
        const carsPayload = carsRes.data;
        const carsList = Array.isArray(carsPayload)
          ? carsPayload
          : carsPayload?.results ?? carsPayload?.items ?? [];
        setCars(carsList || []);

        // Edition : charger l'entretien existant
        if (isEditMode) {
          const entretienRes = await entretiensService.get(id);
          const entretien = entretienRes.data;

          setFormData({
            voiture: entretien.voiture || "",
            type_entretien: entretien.type_entretien || "",
            date_entretien: entretien.date_entretien || new Date().toISOString().split("T")[0],
            prix_entretien:
              entretien.cout != null
                ? String(entretien.cout)
                : entretien.main_oeuvre != null
                ? String(entretien.main_oeuvre)
                : "",
            description: entretien.description || "",
          });

          const initialChecks = {};

          // Pneus
          if (Array.isArray(entretien.pneus) && entretien.pneus.length > 0) {
            initialChecks.pneus = {};
            entretien.pneus.forEach((p) => {
              if (p.position) {
                initialChecks.pneus[p.position] = true;
              }
            });
          }

          // Freins
          if (Array.isArray(entretien.freins) && entretien.freins.length > 0) {
            initialChecks.freins = {};
            entretien.freins.forEach((f) => {
              if (f.type_frein) {
                initialChecks.freins[f.type_frein] = true;
              }
            });
          }

          // Batterie
          if (entretien.batterie) {
            initialChecks.batterie = { batterie: true };
          }

          // Vidange
          if (entretien.vidange) {
            const v = entretien.vidange;
            initialChecks.vidange = {
              huile: true,
              filtre_huile: !!v.filtre_huile,
              filtre_air: !!v.filtre_air,
              filtre_carburant: !!v.filtre_carburant,
            };
          }

          // Révision / autre
          if (entretien.revision) {
            const r = entretien.revision;
            initialChecks.autre = {
              controle_freins: !!r.controle_freins,
              controle_suspension: !!r.controle_suspension,
              controle_direction: !!r.controle_direction,
              controle_climatisation: !!r.controle_climatisation,
              diagnostic_electronique: !!r.diagnostic_electronique,
            };
          }

          setCheckedItems(initialChecks);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données :", err);
        addNotification(
          err.response?.data?.detail || "Erreur lors du chargement des données",
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditMode, addNotification]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleItem = (type, key) => {
    setCheckedItems((prev) => {
      const typeState = { ...(prev[type] || {}) };
      typeState[key] = !typeState[key];
      return { ...prev, [type]: typeState };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.voiture || !formData.type_entretien || !formData.date_entretien) {
      addNotification("Veuillez remplir tous les champs obligatoires", "error");
      return;
    }

    if (!formData.prix_entretien) {
      addNotification("Veuillez saisir le prix de l'entretien", "error");
      return;
    }

    setSubmitting(true);
    try {
      const prix = parseFloat(formData.prix_entretien) || 0;
      const dataToSend = {
        voiture: parseInt(formData.voiture, 10),
        type_entretien: formData.type_entretien,
        date_entretien: formData.date_entretien,
        // Prix global : utilisé pour main_oeuvre et cout (requis par le backend)
        main_oeuvre: prix,
        cout: prix,
        description: formData.description ? formData.description.trim() : "",
      };

      const type = formData.type_entretien;
      const typeChecks = checkedItems[type] || {};

      // PNEUS : créer des enregistrements par position cochée (prix à 0)
      if (type === "pneus") {
        const pneusConfig = entretienItemsByType.pneus;
        const pneus = pneusConfig
          .filter((item) => typeChecks[item.key])
          .map((item) => ({
            position: item.key,
            marque: "N/A",
            modele: "N/A",
            prix_unitaire: 0,
          }));
        if (pneus.length > 0) {
          dataToSend.pneus = pneus;
        }
      }

      // FREINS : un enregistrement par type de frein coché (prix à 0)
      if (type === "freins") {
        const freinsConfig = entretienItemsByType.freins;
        const freins = freinsConfig
          .filter((item) => typeChecks[item.key])
          .map((item) => ({
            type_frein: item.key,
            prix_unitaire: 0,
          }));
        if (freins.length > 0) {
          dataToSend.freins = freins;
        }
      }

      // BATTERIE : créer un enregistrement si coché
      if (type === "batterie" && typeChecks.batterie) {
        dataToSend.batterie = {
          marque: "N/A",
          modele: "N/A",
          prix: 0,
        };
      }

      // VIDANGE : créer un bloc vidange minimal avec filtres cochés
      if (type === "vidange") {
        const vChecks = checkedItems.vidange || {};
        const hasAny =
          vChecks.huile || vChecks.filtre_huile || vChecks.filtre_air || vChecks.filtre_carburant;
        if (hasAny) {
          dataToSend.vidange = {
            type_huile: "N/A",
            quantite_litres: 0,
            prix_total: 0,
            filtre_huile: !!vChecks.filtre_huile,
            prix_filtre_huile: null,
            filtre_air: !!vChecks.filtre_air,
            prix_filtre_air: null,
            filtre_carburant: !!vChecks.filtre_carburant,
            prix_filtre_carburant: null,
          };
        }
      }

      // AUTRE (révision générale) : créer une révision avec booléens
      if (type === "autre") {
        const rChecks = checkedItems.autre || {};
        const hasAny = Object.values(rChecks).some(Boolean);
        if (hasAny) {
          dataToSend.revision = {
            controle_freins: !!rChecks.controle_freins,
            prix_controle_freins: null,
            controle_suspension: !!rChecks.controle_suspension,
            prix_controle_suspension: null,
            controle_direction: !!rChecks.controle_direction,
            prix_controle_direction: null,
            controle_climatisation: !!rChecks.controle_climatisation,
            prix_controle_climatisation: null,
            diagnostic_electronique: !!rChecks.diagnostic_electronique,
            prix_diagnostic_electronique: null,
            pieces: [],
          };
        }
      }

      if (isEditMode) {
        await entretiensService.update(id, dataToSend);
        addNotification("Entretien modifié avec succès", "success");
      } else {
        await entretiensService.create(dataToSend);
        addNotification("Entretien ajouté avec succès", "success");
      }

      navigate("/admin/entretiens");
    } catch (err) {
      let apiError = "Erreur lors de l'enregistrement";
      if (err.response?.data) {
        apiError += " : " + JSON.stringify(err.response.data);
      }
      addNotification(apiError, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const currentTypeItems = entretienItemsByType[formData.type_entretien] || [];

  if (loading) {
    return (
      <div className="page-container">
        <Loader />
      </div>
    );
  }

  return (
    <div className="cars-page">
      <PageHeader
        title={isEditMode ? "Modifier l'entretien" : "Nouvel entretien"}
        subtitle={
          isEditMode
            ? "Modifiez les informations de l'entretien"
            : "Enregistrez un entretien de manière simple et rapide"
        }
        backUrl="/admin/entretiens"
      />

      <div className="cars-body" style={{ padding: "0 20px" }}>
        <div
          className="modal-content-large"
          style={{ margin: "0 auto", maxWidth: "900px", padding: "20px" }}
        >
          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ padding: 0 }}>
              {/* Informations de base */}
              <div className="step-content" style={{ marginBottom: "20px" }}>
                <h3 className="step-title" style={{ fontSize: "16px", marginBottom: "12px" }}>
                  Informations de base
                </h3>
                <div className="responsive-grid-240">
                  <SelectField
                    label="Voiture"
                    name="voiture"
                    value={formData.voiture}
                    onChange={handleChange}
                    required
                    placeholder="Sélectionner une voiture"
                    options={cars}
                    renderOption={(car) => (
                      <option key={car.id} value={car.id}>
                        {car.immatriculation} - {car.marque} {car.modele}
                      </option>
                    )}
                  />

                  <FormInput
                    type="date"
                    label={
                      <>
                        Date d'entretien <span style={{ color: "#ef4444" }}>*</span>
                      </>
                    }
                    name="date_entretien"
                    value={formData.date_entretien}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="responsive-grid-240" style={{ marginTop: "12px" }}>
                  <SelectField
                    label="Type d'entretien"
                    name="type_entretien"
                    value={formData.type_entretien}
                    onChange={handleChange}
                    required
                    placeholder="Sélectionner un type"
                    options={typeEntretienChoices}
                    renderOption={(type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    )}
                  />

                  <FormInput
                    type="number"
                    step="0.01"
                    min="0"
                    label={
                      <>
                        Prix de l'entretien (MAD)
                        <span style={{ color: "#ef4444" }}>*</span>
                      </>
                    }
                    name="prix_entretien"
                    value={formData.prix_entretien}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Ex: 500.00"
                    required
                  />
                </div>
              </div>

              {/* Éléments changés */}
              <div className="step-content" style={{ marginBottom: "20px" }}>
                <h3 className="step-title" style={{ fontSize: "16px", marginBottom: "12px" }}>
                  Éléments qui ont changé
                </h3>
                {formData.type_entretien ? (
                  currentTypeItems.length > 0 ? (
                    <div className="form-group" style={{ display: "grid", gap: "8px" }}>
                      {currentTypeItems.map((item) => (
                        <div
                          key={item.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <input
                            type="checkbox"
                            style={{ width: "auto", margin: 0 }}
                            checked={!!(checkedItems[formData.type_entretien] || {})[item.key]}
                            onChange={() => toggleItem(formData.type_entretien, item.key)}
                          />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                      Aucun élément spécifique pour ce type d'entretien.
                    </p>
                  )
                ) : (
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                    Choisissez d'abord un type d'entretien pour voir les éléments à cocher.
                  </p>
                )}
              </div>

              {/* Commentaire */}
              <div className="step-content" style={{ marginBottom: "20px" }}>
                <h3 className="step-title" style={{ fontSize: "16px", marginBottom: "12px" }}>
                  Commentaire (optionnel)
                </h3>
                <FormInput
                  type="textarea"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Notes ou remarques sur l'entretien"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-footer-responsive" style={{ paddingTop: "12px" }}>
              <button
                type="button"
                className="btn"
                onClick={() => navigate("/admin/entretiens")}
                disabled={submitting}
              >
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting
                  ? "Enregistrement..."
                  : isEditMode
                  ? "Mettre à jour l'entretien"
                  : "Enregistrer l'entretien"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddEntretien;
