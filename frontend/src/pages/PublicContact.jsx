import React, { useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { HiOutlineEnvelope, HiOutlinePhone } from "react-icons/hi2";
import { MapPinned } from "lucide-react";
import PublicLayout from "../components/layout/PublicLayout";
import apiClient from "../api/apiClient";
import "../styles/public-contact.css";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

const CONTACT_PHONE_DISPLAY = "06 25 99 07 09";
const CONTACT_PHONE_LINK = "+212625990709";
const CONTACT_EMAIL = "jet5.casa@gmail.com";
const CONTACT_WHATSAPP_LINK = `https://wa.me/${CONTACT_PHONE_LINK.replace("+", "")}`;
const AGENCY_ADDRESS = "11 Rue du Liban, Casablanca 20250";
const AGENCY_MAP_QUERY = "JET5, 11 Rue du Liban, Casablanca 20250";
const GOOGLE_MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(AGENCY_MAP_QUERY)}`;
const GOOGLE_MAPS_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(AGENCY_MAP_QUERY)}&output=embed&hl=fr`;

function PublicContact() {
  const [form, setForm] = useState(initialForm);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await apiClient.post("/dashboard/contact/", form);
      setSent(true);
      setForm(initialForm);
    } catch (err) {
      console.error("Erreur lors de l'envoi du message de contact", err);
      setError("Impossible d'envoyer le message. Veuillez réessayer plus tard.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="public-contact-page">
        <header className="public-contact-header">
          <span className="public-contact-header__eyebrow">Contact direct</span>
          <h1>Contact</h1>
          <p>Une question sur une location ou notre flotte&nbsp;? Envoyez-nous un message.</p>
        </header>

        <section className="public-contact-info-grid">
          <a className="public-contact-info-card" href={`tel:${CONTACT_PHONE_LINK}`} aria-label={`Appeler le ${CONTACT_PHONE_DISPLAY}`}>
            <span className="public-contact-info-card__icon">
              <HiOutlinePhone size={20} />
            </span>
            <div>
              <strong>Appels</strong>
              <span>{CONTACT_PHONE_DISPLAY}</span>
            </div>
          </a>

          <a className="public-contact-info-card" href={CONTACT_WHATSAPP_LINK} target="_blank" rel="noreferrer" aria-label={`Ouvrir WhatsApp pour ${CONTACT_PHONE_DISPLAY}`}>
            <span className="public-contact-info-card__icon">
              <FaWhatsapp size={20} />
            </span>
            <div>
              <strong>WhatsApp</strong>
              <span>{CONTACT_PHONE_DISPLAY}</span>
            </div>
          </a>

          <a className="public-contact-info-card" href={`mailto:${CONTACT_EMAIL}`} aria-label={`Envoyer un email a ${CONTACT_EMAIL}`}>
            <span className="public-contact-info-card__icon">
              <HiOutlineEnvelope size={20} />
            </span>
            <div>
              <strong>Email</strong>
              <span>{CONTACT_EMAIL}</span>
            </div>
          </a>
        </section>

        <section className="public-contact-map-card">
          <div className="public-contact-map-card__header">
            <div className="public-contact-map-card__title">
              <span className="public-contact-map-card__icon">
                <MapPinned size={18} />
              </span>
              <div>
                <strong>Agence JET5</strong>
                <p>{AGENCY_ADDRESS}</p>
              </div>
            </div>
            <a href={GOOGLE_MAPS_LINK} target="_blank" rel="noreferrer" className="public-contact-map-card__link">
              Ouvrir dans Maps
            </a>
          </div>

          <div className="public-contact-map-frame">
            <iframe
              title="Localisation de l'agence JET5"
              src={GOOGLE_MAPS_EMBED}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>

        {sent && (
          <p className="public-contact-success">
            Votre message a été envoyé. Nous vous répondrons dans les plus brefs délais.
          </p>
        )}

        {error && (
          <p className="public-contact-error">{error}</p>
        )}

        <form className="public-contact-form" onSubmit={handleSubmit}>
          <label>
            Nom complet
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
            />
          </label>
          <label>
            Téléphone
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Message
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows={4}
              required
            />
          </label>
          <div className="public-contact-actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Envoi..." : "Envoyer"}
            </button>
          </div>
        </form>
      </div>
    </PublicLayout>
  );
}

export default PublicContact;
