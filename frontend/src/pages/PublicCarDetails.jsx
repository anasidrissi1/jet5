import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Fuel, Settings, Users,
  Tag, CheckCircle, XCircle, ChevronLeft, ChevronRight, Check, CalendarDays,
} from "lucide-react";
import apiClient from "../api/apiClient";
import { buildMediaUrl } from "../config/env";
import PublicLayout from "../components/layout/PublicLayout";
import "../styles/public-car-details.css";

const FAQ_ITEMS = [
  {
    question: "Quels documents sont nécessaires pour louer un véhicule ?",
    answer: "Une pièce d'identité, un permis de conduire en cours de validité et un moyen de paiement au même nom sont requis.",
  },
  {
    question: "Proposez-vous la livraison du véhicule ?",
    answer: "Oui, nous pouvons livrer le véhicule à votre domicile, hôtel ou aéroport, selon votre localisation.",
  },
  {
    question: "Comment se passe le dépôt de garantie ?",
    answer: "Le dépôt est bloqué par empreinte bancaire au moment de la prise du véhicule et libéré après son retour et contrôle.",
  },
  {
    question: "Puis-je annuler ou modifier ma réservation ?",
    answer: "Oui, les annulations et modifications sont possibles jusqu'à 24h avant la date de prise du véhicule, sans frais.",
  },
];

function PublicCarDetails() {
  const { id } = useParams();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => setOpenFaq(openFaq === index ? null : index);

  useEffect(() => {
    const fetchCar = async () => {
      try {
        const response = await apiClient.get(`/cars/voitures/${id}/public/`);
        setCar(response.data);
      } catch (err) {
        console.error("Erreur lors du chargement de la voiture publique", err);
        if (err.response?.status === 404) {
          setError("Voiture introuvable ou non publique.");
        } else {
          setError("Impossible de charger la voiture. Veuillez réessayer plus tard.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCar();
  }, [id]);

  const getAllImages = () => {
    if (!car) return [];
    const imgs = [];
    if (car.image_principale) imgs.push(buildMediaUrl(car.image_principale));
    if (Array.isArray(car.images)) {
      car.images.forEach((img) => imgs.push(buildMediaUrl(img.image)));
    }
    return imgs;
  };

  const images = getAllImages();

  const prevImage = () => setActiveImage((i) => (i === 0 ? images.length - 1 : i - 1));
  const nextImage = () => setActiveImage((i) => (i === images.length - 1 ? 0 : i + 1));

  const equipements = car?.equipements
    ? car.equipements.split(",").map((e) => e.trim()).filter(Boolean)
    : [];

  return (
    <PublicLayout>
      <div className="pcd">
        {loading && (
          <div className="pcd__loader">
            <div className="pcd__spinner" />
            <p>Chargement...</p>
          </div>
        )}

        {error && (
          <div className="pcd__error">
            <XCircle size={48} />
            <p>{error}</p>
            <Link to="/cars" className="pcd__back-link">
              <ArrowLeft size={18} /> Retour aux voitures
            </Link>
          </div>
        )}

        {!loading && !error && car && (
          <div className="pcd__layout">
            {/* Left — Image */}
            <div className="pcd__image-col">
              <div className="pcd__gallery-main">
                {images.length > 0 ? (
                  <>
                    <img
                      src={images[activeImage]}
                      alt={`${car.marque} ${car.modele}`}
                      className="pcd__gallery-image"
                    />
                    {images.length > 1 && (
                      <>
                        <button className="pcd__gallery-nav pcd__gallery-nav--prev" onClick={prevImage} aria-label="Image précédente">
                          <ChevronLeft size={22} />
                        </button>
                        <button className="pcd__gallery-nav pcd__gallery-nav--next" onClick={nextImage} aria-label="Image suivante">
                          <ChevronRight size={22} />
                        </button>
                        <div className="pcd__gallery-counter">
                          {activeImage + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="pcd__gallery-placeholder">
                    <span>JET5</span>
                    <p>Image bientôt disponible</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right — Info */}
            <div className="pcd__info-col">
              {/* Brand */}
              <span className="pcd__brand">{car.marque}</span>

              {/* Model */}
              <h1 className="pcd__title">{car.modele}</h1>

              {/* Badge row */}
              <div className="pcd__badge-row">
                <span className={`pcd__status ${car.is_available ? "pcd__status--available" : "pcd__status--unavailable"}`}>
                  {car.is_available ? "Disponible" : "Indisponible"}
                </span>
                {car.annee && <span className="pcd__meta">{car.annee}</span>}
                {car.categorie_label && (
                  <>
                    <span className="pcd__meta-dot">•</span>
                    <span className="pcd__meta">{car.categorie_label}</span>
                  </>
                )}
              </div>

              {/* Description */}
              {car.description && (
                <p className="pcd__description">{car.description}</p>
              )}

              {/* Spec cards */}
              <div className="pcd__specs-row">
                {car.nombre_places && (
                  <div className="pcd__spec-card">
                    <Users size={22} className="pcd__spec-icon" />
                    <span className="pcd__spec-value">{car.nombre_places}</span>
                    <span className="pcd__spec-label">Places</span>
                  </div>
                )}
                {car.carburant && (
                  <div className="pcd__spec-card">
                    <Fuel size={22} className="pcd__spec-icon" />
                    <span className="pcd__spec-value">{car.carburant}</span>
                    <span className="pcd__spec-label">Carburant</span>
                  </div>
                )}
                {car.transmission_label && (
                  <div className="pcd__spec-card">
                    <Settings size={22} className="pcd__spec-icon" />
                    <span className="pcd__spec-value">{car.transmission_label}</span>
                    <span className="pcd__spec-label">Boîte</span>
                  </div>
                )}
              </div>

              {/* Équipements */}
              {equipements.length > 0 && (
                <div className="pcd__equipements">
                  <h2 className="pcd__section-title">Équipements</h2>
                  <ul className="pcd__equip-list">
                    {equipements.map((item, i) => (
                      <li key={i} className="pcd__equip-item">
                        <Check size={16} className="pcd__equip-check" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Price bar */}
              <div className="pcd__price-bar">
                <div className="pcd__price">
                  {car.prix_journalier}<span className="pcd__price-currency">DH</span>
                  <span className="pcd__price-per"> / jour</span>
                </div>
                {car.is_available ? (
                  <Link to={`/booking/${car.id}`} className="pcd__btn pcd__btn--primary">
                    <CalendarDays size={18} /> Réserver
                  </Link>
                ) : (
                  <Link to="/cars" className="pcd__btn pcd__btn--secondary">
                    Voir d'autres voitures <ArrowRight size={18} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FAQ Section — full width below layout */}
        {!loading && !error && car && (
          <section className="pcd__faq">
            <h2 className="pcd__faq-title">Questions fréquentes</h2>
            <div className="pcd__faq-list">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className={`pcd__faq-item ${openFaq === i ? "pcd__faq-item--open" : ""}`}>
                  <button className="pcd__faq-question" onClick={() => toggleFaq(i)}>
                    <span>{item.question}</span>
                    <ChevronRight size={20} className="pcd__faq-arrow" />
                  </button>
                  {openFaq === i && (
                    <div className="pcd__faq-answer">
                      <p>{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </PublicLayout>
  );
}

export default PublicCarDetails;
