import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CalendarDays, CheckCircle2, ChevronRight, CreditCard, MapPin, ShieldCheck, UserRound } from "lucide-react";
import apiClient from "../api/apiClient";
import PublicLayout from "../components/layout/PublicLayout";
import { buildMediaUrl } from "../config/env";
import "../styles/public-booking.css";

const initialForm = {
  start_date: "",
  end_date: "",
  pickup_location: "",
  dropoff_location: "",
  payment_method: "pay_on_site",
  customer: {
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    date_naissance: "",
    ville: "",
    adresse: "",
  },
};

const AIRPORT_OPTIONS = [
  "Aeroport Mohammed V - Casablanca",
  "Aeroport Marrakech Menara - Marrakech",
  "Aeroport Rabat-Sale - Rabat",
  "Aeroport Tanger Ibn Battouta - Tanger",
  "Aeroport Fes Saiss - Fes",
  "Aeroport Agadir Al Massira - Agadir",
  "Aeroport Oujda Angads - Oujda",
  "Aeroport Nador Al Aroui - Nador",
  "Aeroport Al Hoceima Cherif Al Idrissi - Al Hoceima",
  "Aeroport Dakhla - Dakhla",
  "Aeroport Laayoune Hassan Ier - Laayoune",
];

function PublicBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [sameDropoff, setSameDropoff] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCar = async () => {
      try {
        const response = await apiClient.get("/cars/voitures/public/");
        const cars = response.data || [];
        const found = cars.find((c) => String(c.id) === String(id));
        if (found) {
          setCar(found);
        }
      } catch (err) {
        console.error("Erreur lors du chargement de la voiture pour la réservation", err);
      }
    };

    fetchCar();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("customer.")) {
      const key = name.split(".")[1];
      setForm((prev) => ({
        ...prev,
        customer: {
          ...prev.customer,
          [key]: value,
        },
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handlePickupChange = (e) => {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      pickup_location: value,
      dropoff_location: sameDropoff ? value : prev.dropoff_location,
    }));
  };

  const handleSameDropoffChange = (event) => {
    const checked = event.target.checked;
    setSameDropoff(checked);
    setForm((prev) => ({
      ...prev,
      dropoff_location: checked ? prev.pickup_location : prev.dropoff_location,
    }));
  };

  const bookingDays = useMemo(() => {
    if (!form.start_date || !form.end_date) {
      return null;
    }

    const start = new Date(`${form.start_date}T00:00:00`);
    const end = new Date(`${form.end_date}T00:00:00`);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : null;
  }, [form.end_date, form.start_date]);

  const estimatedTotal = useMemo(() => {
    if (!car?.prix_journalier || !bookingDays) {
      return null;
    }
    return Number(car.prix_journalier) * bookingDays;
  }, [bookingDays, car?.prix_journalier]);

  const dateError = useMemo(() => {
    if (!form.start_date || !form.end_date) {
      return null;
    }

    const start = new Date(`${form.start_date}T00:00:00`);
    const end = new Date(`${form.end_date}T00:00:00`);
    if (end < start) {
      return "La date de fin doit etre posterieure a la date de debut.";
    }
    return null;
  }, [form.end_date, form.start_date]);

  const cardImage = useMemo(() => {
    if (!car) {
      return null;
    }
    if (car.image_principale) {
      return buildMediaUrl(car.image_principale);
    }
    if (Array.isArray(car.images) && car.images.length > 0) {
      return buildMediaUrl(car.images[0].image);
    }
    return null;
  }, [car]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (dateError) {
      setError(dateError);
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        car_id: id,
        start_date: form.start_date,
        end_date: form.end_date,
        pickup_location: form.pickup_location,
        dropoff_location: sameDropoff ? form.pickup_location : form.dropoff_location,
        payment_method: form.payment_method,
        customer: form.customer,
      };

      const response = await apiClient.post("/reservations/public/", payload);
      const reservationId = response.data?.reservation_id;
      const carLabel = car ? `${car.marque} ${car.modele}` : `Voiture ${id}`;
      const dates = `${form.start_date} → ${form.end_date}`;
      setSuccess("Réservation enregistrée. Nous vous contacterons pour confirmation.");
      setForm(initialForm);
      setSameDropoff(true);

      if (reservationId) {
        navigate(`/booking-confirmation/${reservationId}`, {
          state: {
            summary: {
              carLabel,
              dates,
            },
          },
        });
      }
    } catch (err) {
      const apiError =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        (Array.isArray(err.response?.data?.non_field_errors)
          ? err.response.data.non_field_errors[0]
          : null) ||
        (typeof err.response?.data === "string" ? err.response.data : null);

      if (err.response?.status >= 500) {
        console.error("Erreur serveur lors de la création de la réservation publique", err);
      } else {
        console.warn("Réservation publique refusée", {
          status: err.response?.status,
          data: err.response?.data,
        });
      }

      setError(apiError || "Impossible de créer la réservation. Vérifiez les informations et réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="public-booking-page">
        <header className="public-booking-header">
          <div>
            <span className="public-booking-header__eyebrow">Reservation en ligne JET5</span>
            <h1>Réserver un véhicule</h1>
            {car && (
              <p className="public-booking-subtitle">
                {car.marque} {car.modele} · {car.prix_journalier} DH / jour
              </p>
            )}
            {!car && (
              <p className="public-booking-subtitle">
                Chargement des informations du vehicule selectionne...
              </p>
            )}
          </div>
        </header>

        {success && <p className="public-booking-success">{success}</p>}
        {error && <p className="public-booking-error">{error}</p>}

        <form className="public-booking-form" onSubmit={handleSubmit}>
          <div className="public-booking-layout">
            <div className="public-booking-main">
              <section className="public-booking-panel">
                <div className="public-booking-panel__header">
                  <div className="public-booking-panel__icon">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <h2>Détails de la location</h2>
                    <p>Choisissez vos dates et indiquez simplement le trajet souhaité.</p>
                  </div>
                </div>

                <div className="public-booking-fields public-booking-fields--two">
                  <label>
                    Date de début
                    <input
                      type="date"
                      name="start_date"
                      value={form.start_date}
                      onChange={handleChange}
                      required
                    />
                  </label>
                  <label>
                    Date de fin
                    <input
                      type="date"
                      name="end_date"
                      value={form.end_date}
                      onChange={handleChange}
                      required
                    />
                  </label>
                </div>

                {dateError && <p className="public-booking-inline-error">{dateError}</p>}

                <div className="public-booking-fields">
                  <label>
                    Lieu de prise en charge
                    <select
                      name="pickup_location"
                      value={form.pickup_location}
                      onChange={handlePickupChange}
                      required
                    >
                      <option value="">Selectionnez un aeroport</option>
                      {AIRPORT_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="public-booking-check">
                  <input
                    type="checkbox"
                    checked={sameDropoff}
                    onChange={handleSameDropoffChange}
                  />
                  <span>Je restitue le vehicule au meme endroit</span>
                </label>

                <div className="public-booking-fields">
                  <label>
                    Lieu de restitution
                    <select
                      name="dropoff_location"
                      value={sameDropoff ? form.pickup_location : form.dropoff_location}
                      onChange={handleChange}
                      required
                      disabled={sameDropoff}
                    >
                      <option value="">Selectionnez un aeroport</option>
                      {AIRPORT_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="public-booking-payment">
                  <span className="public-booking-payment__label">Mode de paiement</span>
                  <div className="public-booking-payment__options">
                    <label className={`public-booking-choice ${form.payment_method === "pay_on_site" ? "is-active" : ""}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="pay_on_site"
                        checked={form.payment_method === "pay_on_site"}
                        onChange={handleChange}
                      />
                      <CreditCard size={18} />
                      <div>
                        <strong>Paiement sur place</strong>
                        <span>Confirmation rapide par l'agence</span>
                      </div>
                    </label>
                    <label className={`public-booking-choice ${form.payment_method === "card" ? "is-active" : ""}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="card"
                        checked={form.payment_method === "card"}
                        onChange={handleChange}
                      />
                      <ShieldCheck size={18} />
                      <div>
                        <strong>Carte bancaire</strong>
                        <span>Votre demande sera finalisee apres validation</span>
                      </div>
                    </label>
                  </div>
                </div>
              </section>

              <section className="public-booking-panel">
                <div className="public-booking-panel__header">
                  <div className="public-booking-panel__icon">
                    <UserRound size={18} />
                  </div>
                  <div>
                    <h2>Informations client</h2>
                    <p>Entrez uniquement les informations utiles pour vous recontacter.</p>
                  </div>
                </div>

                <div className="public-booking-fields public-booking-fields--two">
                  <label>
                    Nom
                    <input
                      type="text"
                      name="customer.nom"
                      value={form.customer.nom}
                      onChange={handleChange}
                      required
                    />
                  </label>
                  <label>
                    Prénom
                    <input
                      type="text"
                      name="customer.prenom"
                      value={form.customer.prenom}
                      onChange={handleChange}
                      required
                    />
                  </label>
                </div>

                <div className="public-booking-fields public-booking-fields--two">
                  <label>
                    Téléphone
                    <input
                      type="tel"
                      name="customer.telephone"
                      value={form.customer.telephone}
                      onChange={handleChange}
                      placeholder="06 00 00 00 00"
                      required
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      name="customer.email"
                      value={form.customer.email}
                      onChange={handleChange}
                      placeholder="exemple@email.com"
                    />
                  </label>
                </div>

                <div className="public-booking-fields public-booking-fields--two">
                  <label>
                    Date de naissance
                    <input
                      type="date"
                      name="customer.date_naissance"
                      value={form.customer.date_naissance}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Ville
                    <input
                      type="text"
                      name="customer.ville"
                      value={form.customer.ville}
                      onChange={handleChange}
                      placeholder="Casablanca"
                    />
                  </label>
                </div>

                <div className="public-booking-fields">
                  <label>
                    Adresse
                    <input
                      type="text"
                      name="customer.adresse"
                      value={form.customer.adresse}
                      onChange={handleChange}
                      placeholder="Adresse complete"
                    />
                  </label>
                </div>
              </section>
            </div>

            <aside className="public-booking-aside">
              <div className="public-booking-summary-card">
                <div className="public-booking-summary-card__media">
                  {cardImage ? (
                    <img src={cardImage} alt={`${car?.marque || "Vehicule"} ${car?.modele || ""}`} />
                  ) : (
                    <div className="public-booking-summary-card__placeholder">
                      <span>JET5</span>
                    </div>
                  )}
                </div>

                <div className="public-booking-summary-card__body">
                  <span className="public-booking-summary-card__badge">Votre selection</span>
                  <h3>{car ? `${car.marque} ${car.modele}` : "Vehicule"}</h3>
                  <p>{car ? `${car.prix_journalier} DH / jour` : "Tarif sur demande"}</p>

                  <ul className="public-booking-summary-list">
                    <li>
                      <CheckCircle2 size={16} />
                      <span>Traitement rapide de votre demande</span>
                    </li>
                    <li>
                      <CheckCircle2 size={16} />
                      <span>Confirmation de disponibilite par l'agence</span>
                    </li>
                    <li>
                      <CheckCircle2 size={16} />
                      <span>Accompagnement pour le retrait et la restitution</span>
                    </li>
                  </ul>

                  <div className="public-booking-estimate">
                    <div>
                      <span>Duree estimee</span>
                      <strong>{bookingDays ? `${bookingDays} jour${bookingDays > 1 ? "s" : ""}` : "A definir"}</strong>
                    </div>
                    <div>
                      <span>Budget indicatif</span>
                      <strong>{estimatedTotal ? `${estimatedTotal.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH` : "Renseignez vos dates"}</strong>
                    </div>
                  </div>

                  <div className="public-booking-summary-note">
                    <MapPin size={16} />
                    <span>Nous vous recontacterons pour confirmer la disponibilite et finaliser la reservation.</span>
                  </div>

                  <div className="public-booking-actions">
                    <button type="submit" className="public-booking-submit" disabled={submitting || Boolean(dateError)}>
                      <span>{submitting ? "Enregistrement..." : "Envoyer la demande"}</span>
                      {!submitting && <ChevronRight size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </PublicLayout>
  );
}

export default PublicBooking;
