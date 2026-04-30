import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarRange, SlidersHorizontal, Fuel, Settings } from "lucide-react";
import apiClient from "../api/apiClient";
import { buildMediaUrl } from "../config/env";
import PublicLayout from "../components/layout/PublicLayout";
import heroImage from "../assets/webjet5.png";
import "../styles/public-cars.css";

function PublicCars() {
  const [cars, setCars] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: "",
    transmission: "",
  });

  const transmissionOptions = ["manuelle", "automatique"];

  const formatCategoryLabel = (value = "") => {
    if (!value) return "";
    return value
      .toString()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const hydrateCategoryOptions = (carsList = []) => {
    const uniqueCategories = new Map();

    carsList.forEach((car) => {
      const value = (car.categorie || "").toString().trim();
      if (!value) return;

      const label = (car.categorie_label || "").toString().trim() || formatCategoryLabel(value);
      if (!uniqueCategories.has(value)) {
        uniqueCategories.set(value, { value, label });
      }
    });

    const sortedOptions = Array.from(uniqueCategories.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "fr", { sensitivity: "base" })
    );

    setCategoryOptions(sortedOptions);
  };

  const fetchCategoryOptions = async () => {
    try {
      const response = await apiClient.get("/cars/voitures/public/");
      const list = Array.isArray(response.data) ? response.data : [];
      hydrateCategoryOptions(list);
    } catch (err) {
      console.error("Erreur lors du chargement des categories publiques", err);
      setCategoryOptions([]);
    }
  };

  const fetchCars = async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          searchParams.append(key, value);
        }
      });
      const query = searchParams.toString();
      const url = query ? `/cars/voitures/public/?${query}` : "/cars/voitures/public/";
      const response = await apiClient.get(url);
      setCars(response.data || []);
    } catch (err) {
      console.error("Erreur lors du chargement des voitures publiques", err);
      setError("Impossible de charger les voitures. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars(filters);
    fetchCategoryOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchCars(filters);
  };

  const handleResetFilters = () => {
    const emptyFilters = {
      category: "",
      transmission: "",
    };

    setFilters(emptyFilters);
    fetchCars(emptyFilters);
  };

  const getCardImage = (car) => {
    if (car.image_principale) {
      return buildMediaUrl(car.image_principale);
    }
    if (Array.isArray(car.images) && car.images.length > 0) {
      return buildMediaUrl(car.images[0].image);
    }
    return null;
  };

  const getCardCategory = (car) => {
    const category = car.categorie_label || car.categorie || "Collection premium";
    const transmission = car.transmission_label || car.transmission;

    if (transmission) {
      return `(${category} | ${transmission}) ou semblable`;
    }

    return `${category} ou semblable`;
  };

  return (
    <PublicLayout>
      <div className="public-cars-page">
        <div className="public-cars-hero-bg">
          <div
            className="public-cars-hero-bg-image"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <video
            className="public-cars-hero-video"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/videos/jet5-hero.mp4" type="video/mp4" />
          </video>
          <div className="public-cars-hero-overlay" />
        </div>

        <header className="public-cars-header">
          <div className="public-cars-header__eyebrow">Collection JET5</div>
          <div className="public-cars-header__top">
            <div>
              <h1>Nos voitures</h1>
              <p>Decouvrez une flotte selectionnee pour repondre aux exigences d'une mobilite premium.</p>
            </div>
            <div className="public-cars-header__badge">
              <CalendarRange size={18} />
              <span>Reservation rapide et disponibilite en temps reel</span>
            </div>
          </div>
        </header>

        {loading && <p>Chargement des voitures...</p>}
        {error && <p className="public-cars-error">{error}</p>}

        <form className="public-cars-filters" onSubmit={handleFilterSubmit}>
          <div className="public-cars-filters__header">
            <div>
              <span className="public-cars-filters__title">
                <SlidersHorizontal size={16} />
                Affiner la recherche
              </span>
              <p>Choisissez une categorie et une transmission pour afficher les vehicules correspondants.</p>
            </div>
          </div>

          <div className="public-cars-filters-row public-cars-filters-row--simple">
            <div className="public-cars-filter-field">
              <label htmlFor="category-filter">
                Categorie
                <select
                  id="category-filter"
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                >
                  <option value="">Toutes les categories</option>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="public-cars-filter-field">
              <label htmlFor="transmission-filter">
                Transmission
                <select
                  id="transmission-filter"
                  name="transmission"
                  value={filters.transmission}
                  onChange={handleFilterChange}
                >
                  <option value="">Toutes les transmissions</option>
                  {transmissionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="public-cars-filter-actions">
              <button type="submit" className="btn-primary">Rechercher</button>
              <button type="button" className="btn-secondary public-cars-filter-reset" onClick={handleResetFilters}>
                Reinitialiser
              </button>
            </div>
          </div>
        </form>

        {!loading && !error && (
          <div className="public-cars-grid">
            {cars.map((car, index) => {
              const cardImage = getCardImage(car);
              const transmission = car.transmission_label || car.transmission;

              return (
              <article key={car.id} className="public-car-card" style={{ animationDelay: `${index * 0.1}s` }}>
                {cardImage ? (
                  <Link to={`/cars/${car.id}`} className="public-car-card__image-wrapper">
                    <img
                      src={cardImage}
                      alt={`${car.marque} ${car.modele}`}
                      className="public-car-card__image"
                    />
                    <div className="public-car-card__image-overlay"></div>
                    {car.is_available && (
                      <span className="public-car-card__status-badge public-car-card__status-badge--available">Disponible</span>
                    )}
                  </Link>
                ) : (
                  <div className="public-car-card__image-wrapper public-car-card__image-wrapper--empty">
                    <div className="public-car-card__placeholder">
                      <span className="public-car-card__placeholder-badge">JET5</span>
                      <strong>{car.marque} {car.modele}</strong>
                      <span>Image bientot disponible</span>
                    </div>
                  </div>
                )}
                <div className="public-car-card__body">
                  <div className="public-car-card__top">
                    <p className="public-car-card__category">{getCardCategory(car)}</p>
                    <Link to={`/cars/${car.id}`} className="public-car-card__title-link">
                      <h2 className="public-car-card__title">{car.marque} {car.modele}</h2>
                    </Link>
                  </div>

                  <div className="public-car-card__specs">
                    {car.carburant && (
                      <span className="public-car-card__spec">
                        <Fuel size={14} />
                        {car.carburant}
                      </span>
                    )}
                    {transmission && (
                      <span className="public-car-card__spec">
                        <Settings size={14} />
                        {transmission}
                      </span>
                    )}

                  </div>

                  <div className="public-car-card__divider" />

                  <div className="public-car-card__footer">
                    <div className="public-car-card__price-block">
                      <span className="public-car-card__price-prefix">A partir de</span>
                      <p className="public-car-card__price">{car.prix_journalier} <span>DH/Jour</span></p>
                    </div>
                    <div className="public-car-card__actions">
                      {car.is_available ? (
                        <Link to={`/booking/${car.id}`} className="public-car-card__cta">
                          Réserver <ArrowRight size={16} />
                        </Link>
                      ) : (
                        <Link to={`/cars/${car.id}`} className="public-car-card__cta public-car-card__cta--secondary">
                          Détails <ArrowRight size={16} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </article>
              );
            })}

            {cars.length === 0 && !loading && !error && (
              <p>Aucune voiture publique n'est disponible pour le moment.</p>
            )}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

export default PublicCars;
