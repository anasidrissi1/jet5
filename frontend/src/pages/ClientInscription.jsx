import React, { useMemo, useState } from "react";
import axios from "axios";
import PublicLayout from "../components/layout/PublicLayout";
import { getApiBaseUrl } from "../config/env";
import useScrollReveal from "../hooks/useScrollReveal";
import "../styles/public-luxury.css";

const API_BASE_URL = getApiBaseUrl();

const INITIAL_FORM = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  adresse: "",
  cin_numero: "",
  cin_date_expiration: "",
  permis_numero: "",
  permis_date_delivrance: "",
  passeport_numero: "",
  passeport_date_entree: "",
  passeport_date_sortie: "",
};

const INITIAL_FILES = {
  cin_document: null,
  permis_document: null,
  passeport_document: null,
};

function ClientInscription() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [files, setFiles] = useState(INITIAL_FILES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useScrollReveal([step, success, error]);

  const previews = useMemo(() => {
    const entries = Object.entries(files).map(([key, file]) => {
      if (!file || !file.type?.startsWith("image/")) return [key, ""];
      return [key, URL.createObjectURL(file)];
    });
    return Object.fromEntries(entries);
  }, [files]);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const updateFile = (name, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Chaque fichier doit etre inferieur a 5MB.");
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setError("Format autorise: PDF, JPG, JPEG, PNG.");
      return;
    }

    setFiles((prev) => ({ ...prev, [name]: file }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (String(value || "").trim() !== "") payload.append(key, String(value).trim());
      });
      Object.entries(files).forEach(([key, value]) => {
        if (value) payload.append(key, value);
      });

      await axios.post(`${API_BASE_URL}/clients/requests/`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess(true);
    } catch (err) {
      console.error("Erreur inscription client", err);
      if (err.response?.data && typeof err.response.data === "object") {
        const details = Object.entries(err.response.data)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
          .join(" | ");
        setError(details || "Erreur lors de l'envoi.");
      } else {
        setError("Erreur lors de l'envoi.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PublicLayout>
        <div className="jp-page">
          <section className="jp-section">
            <div className="jp-container">
              <article className="jp-card jp-confirm" data-reveal>
                <div className="jp-confirm__icon">OK</div>
                <h1 className="jp-title">Demande envoyee</h1>
                <p className="jp-muted">Votre inscription est en attente de validation par notre equipe.</p>
              </article>
            </div>
          </section>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="jp-page">
        <section className="jp-section">
          <div className="jp-container">
            <h1 className="jp-title" data-reveal>Inscription client</h1>

            <div className="jp-progress" data-reveal>
              <div className={`jp-progress__step ${step >= 1 ? "is-active" : ""}`}>1. Informations</div>
              <div className={`jp-progress__step ${step >= 2 ? "is-active" : ""}`}>2. Documents</div>
              <div className={`jp-progress__step ${step >= 3 ? "is-active" : ""}`}>3. Verification</div>
            </div>

            {error ? <article className="jp-card"><p className="jp-error">{error}</p></article> : null}

            <form onSubmit={handleSubmit} className="jp-card jp-form-card" data-reveal>
            {step === 1 && (
              <div className="jp-grid jp-grid--2">
                <input className="jp-input" placeholder="Nom" value={form.nom} onChange={(e) => updateField("nom", e.target.value)} required />
                <input className="jp-input" placeholder="Prenom" value={form.prenom} onChange={(e) => updateField("prenom", e.target.value)} required />
                <input className="jp-input" placeholder="Email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                <input className="jp-input" placeholder="Telephone" value={form.telephone} onChange={(e) => updateField("telephone", e.target.value)} required />
                <textarea className="jp-input" rows="3" placeholder="Adresse" value={form.adresse} onChange={(e) => updateField("adresse", e.target.value)} style={{ gridColumn: "1 / -1" }} />
              </div>
            )}

            {step === 2 && (
              <div style={{ display: "grid", gap: 12 }}>
                <div className="jp-upload">
                  <h3>CIN</h3>
                  <input className="jp-input" placeholder="Numero CIN" value={form.cin_numero} onChange={(e) => updateField("cin_numero", e.target.value)} required />
                  <input className="jp-input" type="date" value={form.cin_date_expiration} onChange={(e) => updateField("cin_date_expiration", e.target.value)} style={{ marginTop: 8 }} />
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateFile("cin_document", e.target.files?.[0])} style={{ marginTop: 8 }} />
                  {previews.cin_document && <div className="jp-upload__preview"><img src={previews.cin_document} alt="Apercu CIN" /></div>}
                </div>

                <div className="jp-upload">
                  <h3>Permis</h3>
                  <input className="jp-input" placeholder="Numero Permis" value={form.permis_numero} onChange={(e) => updateField("permis_numero", e.target.value)} required />
                  <input className="jp-input" type="date" value={form.permis_date_delivrance} onChange={(e) => updateField("permis_date_delivrance", e.target.value)} style={{ marginTop: 8 }} />
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateFile("permis_document", e.target.files?.[0])} style={{ marginTop: 8 }} />
                  {previews.permis_document && <div className="jp-upload__preview"><img src={previews.permis_document} alt="Apercu permis" /></div>}
                </div>

                <div className="jp-upload">
                  <h3>Passeport (optionnel)</h3>
                  <input className="jp-input" placeholder="Numero passeport" value={form.passeport_numero} onChange={(e) => updateField("passeport_numero", e.target.value)} />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
                    <input className="jp-input" type="date" value={form.passeport_date_entree} onChange={(e) => updateField("passeport_date_entree", e.target.value)} />
                    <input className="jp-input" type="date" value={form.passeport_date_sortie} onChange={(e) => updateField("passeport_date_sortie", e.target.value)} />
                  </div>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateFile("passeport_document", e.target.files?.[0])} style={{ marginTop: 8 }} />
                  {previews.passeport_document && <div className="jp-upload__preview"><img src={previews.passeport_document} alt="Apercu passeport" /></div>}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h3 className="jp-subtitle">Verification</h3>
                <ul className="jp-specs">
                  <li>Nom: {form.nom || "-"}</li>
                  <li>Prenom: {form.prenom || "-"}</li>
                  <li>Telephone: {form.telephone || "-"}</li>
                  <li>CIN: {form.cin_numero || "-"}</li>
                  <li>Permis: {form.permis_numero || "-"}</li>
                </ul>
                <p>En envoyant, vous acceptez la verification des informations transmises.</p>
              </div>
            )}

              <div className="jp-inline-actions" style={{ marginTop: 14 }}>
                {step > 1 ? <button type="button" className="jp-btn jp-btn--ghost" onClick={() => setStep((value) => value - 1)}>Precedent</button> : null}
                {step < 3 ? <button type="button" className="jp-btn jp-btn--gold" onClick={() => setStep((value) => value + 1)}>Suivant</button> : null}
                {step === 3 ? <button type="submit" className="jp-btn jp-btn--gold" disabled={loading}>{loading ? "Envoi en cours..." : "Envoyer la demande"}</button> : null}
              </div>
            </form>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

export default ClientInscription;
