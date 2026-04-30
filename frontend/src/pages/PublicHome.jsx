import React, { useEffect, useState } from 'react';
import { ChevronDown, CheckCircle2, Star, ShieldCheck, Zap, ArrowRight, Play, Users, Calendar, MapPin, Fuel, Settings, Plane, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicLayout from '../components/layout/PublicLayout';
import '../styles/public-site.css';
import apiClient from '../api/apiClient';
import { buildMediaUrl } from '../config/env';
import heroImage from '../assets/webjet5.png';

import { testimonials, faq } from '../data/mockData';

function PublicHome() {
  const [featuredCars, setFeaturedCars] = useState([]);
  const [loadingCars, setLoadingCars] = useState(true);
  const [carsError, setCarsError] = useState(null);
  const [stats, setStats] = useState({
    clients: 0,
    vehicles: 0,
    cities: 0
  });
  const [openFaq, setOpenFaq] = useState(null);
  const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i);

  // Animation au compteur
  useEffect(() => {
    const animateNumber = (target, setter, duration = 2000) => {
      let start = 0;
      const increment = target / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setter(target);
          clearInterval(timer);
        } else {
          setter(Math.floor(start));
        }
      }, 16);
      return timer;
    };

    const timer1 = animateNumber(1250, (val) => setStats(prev => ({ ...prev, clients: val })));
    const timer2 = animateNumber(48, (val) => setStats(prev => ({ ...prev, vehicles: val })));
    const timer3 = animateNumber(15, (val) => setStats(prev => ({ ...prev, cities: val })));

    return () => {
      clearInterval(timer1);
      clearInterval(timer2);
      clearInterval(timer3);
    };
  }, []);

  const getCardImage = (car) => {
    if (car.image_principale) return buildMediaUrl(car.image_principale);
    if (Array.isArray(car.images) && car.images.length > 0) return buildMediaUrl(car.images[0].image);
    return null;
  };

  useEffect(() => {
    const fetchFeaturedCars = async () => {
      setLoadingCars(true);
      setCarsError(null);
      try {
        const response = await apiClient.get('/cars/voitures/public/');
        const data = Array.isArray(response?.data) ? response.data : [];

        const showcaseCars = data.filter((car) => (
          car?.is_vitrine === true
          || car?.vitrine === true
          || car?.is_showcase === true
          || car?.en_vitrine === true
        ));

        const source = showcaseCars.length > 0 ? showcaseCars : data;
        setFeaturedCars(source.slice(0, 3));
      } catch (error) {
        console.error('Erreur lors du chargement des voitures', error);
        setCarsError("Impossible de charger les véhicules.");
      } finally {
        setLoadingCars(false);
      }
    };

    fetchFeaturedCars();
  }, []);

  // Animation au scroll
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-scale');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [loadingCars]);

  // Composant Card véhicule
  const CarCard = ({ car, index = 0 }) => {
    const cardImage = getCardImage(car);
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
      <div className="glass-card car-card car-card--animated" style={{ animationDelay: `${index * 0.15}s` }}>
        <div className="car-card__image-wrapper">
          {!imageLoaded && <div className="car-card__skeleton"></div>}
          {cardImage ? (
            <img
              src={cardImage}
              alt={`${car.marque} ${car.modele}`}
              className={`car-card__image ${imageLoaded ? 'loaded' : ''}`}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
          ) : (
            <div className="car-card__placeholder">
              Image bientôt disponible
            </div>
          )}
          <div className="car-card__image-overlay"></div>
          {car.is_available && <span className="car-card__badge">Disponible</span>}
        </div>
        <div className="car-card__content">
          <div className="car-card__header">
            <h3 className="car-card__title">{car.marque} {car.modele}</h3>
            <div className="car-card__price">
              {car.prix_journalier} DH
              <span className="car-card__price-period">/jour</span>
            </div>
          </div>
          <div className="car-card__specs">
            {car.carburant && (
              <span className="car-card__spec">
                <Fuel size={14} />
                {car.carburant}
              </span>
            )}
            {car.transmission && (
              <span className="car-card__spec">
                <Settings size={14} />
                {car.transmission}
              </span>
            )}
          </div>
          <div className="car-card__actions">
            <Link to={`/cars/${car.id}`} className="btn btn-outline btn-sm">
              Détails
            </Link>
            {car.is_available && (
              <Link to={`/booking/${car.id}`} className="btn btn-primary btn-sm">
                Réserver
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Composant Skeleton
  const CarCardSkeleton = () => (
    <div className="glass-card car-card car-card--skeleton">
      <div className="car-card__image-wrapper">
        <div className="car-card__skeleton-image"></div>
      </div>
      <div className="car-card__content">
        <div className="car-card__skeleton-title"></div>
        <div className="car-card__skeleton-price"></div>
        <div className="car-card__skeleton-text"></div>
        <div className="car-card__skeleton-actions"></div>
      </div>
    </div>
  );

  return (
    <PublicLayout>
      <div className="fade-in">
        {/* Hero Section Premium */}
        <section className="hero-premium">
          <div className="hero-premium__background">
            <video
              className="hero-premium__video"
              autoPlay
              loop
              muted
              playsInline
            >
              <source src="/videos/jet5-hero.mp4" type="video/mp4" />
            </video>

            <div
              className="hero-premium__image"
              style={{ backgroundImage: `url(${heroImage})` }}
            >
              <div className="hero-premium__overlay-gradient"></div>
              <div className="hero-premium__overlay-blur"></div>
            </div>
          </div>

          <div className="container hero-premium__content">
            <div className="hero-premium__badges reveal">
              <span className="badge badge-premium">Nouvelle Flotte 2026</span>
              <span className="badge badge-luxury">Service Premium</span>
            </div>
            <h1 className="hero-premium__title reveal">
              L'Art de la Route,
              <br />
              <span className="gradient-text">Sans Compromis.</span>
            </h1>
            <p className="hero-premium__description reveal">
              Accédez à une sélection sur mesure des véhicules les plus prestigieux au monde.
              Réservation instantanée, service de haut standing et livraison à domicile.
            </p>

            <div className="hero-premium__actions reveal">
              <Link to="/cars" className="btn btn-primary btn-premium">
                Explorer la Flotte <ArrowRight size={20} />
              </Link>
              <button className="btn btn-outline btn-outline-light" type="button" onClick={() => document.getElementById('pourquoi-nous').scrollIntoView({ behavior: 'smooth' })}>
                <Play size={18} /> Pourquoi Nous
              </button>
            </div>

            <div className="hero-premium__stats reveal">
              <div className="stat-item">
                <Users size={24} />
                <div>
                  <span className="stat-number">{stats.clients}+</span>
                  <span className="stat-label">Clients Satisfaits</span>
                </div>
              </div>
              <div className="stat-item">
                <Calendar size={24} />
                <div>
                  <span className="stat-number">{stats.vehicles}</span>
                  <span className="stat-label">Véhicules Premium</span>
                </div>
              </div>
              <div className="stat-item">
                <MapPin size={24} />
                <div>
                  <span className="stat-number">{stats.cities}</span>
                  <span className="stat-label">Villes Desservies</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Us Section avec avantages et image */}
        <section id="pourquoi-nous" className="section-padding">
          <div className="container">
            <div className="why-us-grid">
              <div className="why-us-content reveal">
                <div className="section-label">Pourquoi nous choisir ?</div>
                <h2 className="h2">
                  L'excellence à <br />
                  <span className="gradient-text">chaque kilomètre</span>
                </h2>
                
                <div className="why-us-features">
                  <div className="feature-item reveal reveal-delay-1">
                    <div className="feature-icon feature-icon--accent">
                      <ShieldCheck size={32} />
                    </div>
                    <div className="feature-text">
                      <h4>Sécurité & Assurance Premium</h4>
                      <p>
                        Couverture complète et assistance 24/7 partout en Europe. 
                        Roulez l'esprit tranquille avec notre garantie tous risques incluse.
                      </p>
                    </div>
                  </div>
                  
                  <div className="feature-item reveal reveal-delay-2">
                    <div className="feature-icon feature-icon--primary">
                      <Zap size={32} />
                    </div>
                    <div className="feature-text">
                      <h4>Réservation Express</h4>
                      <p>
                        Validez votre location en moins de 2 minutes. Processus 100% digital,
                        sans paperasse inutile.
                      </p>
                    </div>
                  </div>
                  
                  <div className="feature-item reveal reveal-delay-3">
                    <div className="feature-icon feature-icon--success">
                      <CheckCircle2 size={32} />
                    </div>
                    <div className="feature-text">
                      <h4>Livraison à votre Porte</h4>
                      <p>
                        Nous livrons votre véhicule à votre domicile, hôtel ou 
                        directement à la sortie de l'avion. Service personnalisé.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Cars */}
        <section className="section-padding section-dark">
          <div className="container">
            <div className="section-header reveal">
              <div className="section-label">Vitrine JET5</div>
              <h2 className="h2">Voitures en vitrine</h2>
              <p className="muted">
                Une selection visible au public, mise a jour en temps reel par notre equipe.
              </p>
            </div>

            {loadingCars && (
              <div className="cars-grid">
                {[1, 2, 3].map(i => (
                  <CarCardSkeleton key={i} />
                ))}
              </div>
            )}

            {!loadingCars && !carsError && featuredCars.length > 0 && (
              <div className="cars-grid">
                {featuredCars.map((car, i) => (
                  <CarCard key={car.id} car={car} index={i} />
                ))}
              </div>
            )}

            {carsError && !loadingCars && (
              <div className="error-message">
                <p>{carsError}</p>
                <Link to="/cars" className="btn btn-primary">
                  Voir toutes les voitures
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Services */}
        <section id="services" className="section-padding section-light">
          <div className="container">
            <div className="section-header reveal">
              <div className="section-label">Services</div>
              <h2 className="h2">Un service premium, concret</h2>
              <p className="muted">Deux engagements pour vous simplifier chaque location.</p>
            </div>

            <div className="services-highlight-grid">
              <article className="glass-card services-highlight-card reveal reveal-left">
                <div className="services-highlight-card__icon">
                  <Plane size={22} />
                </div>
                <div className="services-highlight-card__content">
                  <h3>Livraison a l'aeroport</h3>
                  <p>
                    Recuperation rapide du vehicule a votre arrivee avec briefing express,
                    documents prets et assistance immediate.
                  </p>
                </div>
              </article>

              <article className="glass-card services-highlight-card reveal reveal-left reveal-delay-1">
                <div className="services-highlight-card__icon">
                  <Clock3 size={22} />
                </div>
                <div className="services-highlight-card__content">
                  <h3>Service 7j/7</h3>
                  <p>
                    Equipe disponible tous les jours pour confirmer, modifier ou prolonger
                    vos reservations sans friction.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="section-padding">
          <div className="container">
            <div className="section-header reveal">
              <div className="section-label">Témoignages</div>
              <h2 className="h2">Ce que nos clients disent</h2>
              <p className="muted">Ils nous ont fait confiance, ils témoignent</p>
            </div>
            <div className="testimonials-grid">
              {testimonials.map((t, i) => (
                <div key={i} className="glass-card testimonial-card reveal reveal-scale">
                  <div className="testimonial-stars">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} size={16} fill="var(--warning)" color="var(--warning)" />
                    ))}
                  </div>
                  <p className="testimonial-text">"{t.text}"</p>
                  <div className="testimonial-author">
                    <div className="author-avatar">{t.name[0]}</div>
                    <div>
                      <h5>{t.name}</h5>
                      <p className="author-role">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="section-padding section-light">
          <div className="container">
            <div className="section-header reveal">
              <div className="section-label">Questions fréquentes</div>
              <h2 className="h2">Tout savoir sur JET5</h2>
              <p className="muted">Réponses à vos interrogations les plus courantes</p>
            </div>
            <div className="faq-grid">
              {faq.map((f, i) => (
                <div key={i} className={`glass-card faq-item${openFaq === i ? ' faq-item--open' : ''}`}>
                  <button className="faq-question" onClick={() => toggleFaq(i)} type="button">
                    <h4>{f.q}</h4>
                    <ChevronDown size={20} className="faq-chevron" />
                  </button>
                  {openFaq === i && (
                    <p className="faq-answer">{f.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="section-padding container">
          <div className="public-cta-card public-cta-card--xl reveal reveal-scale">
            <div className="public-cta-card__content">
              <span className="public-cta-card__eyebrow">Demarrer avec JET5</span>
              <h2>Confiez votre mobilite a une equipe qui traite chaque detail avec exigence.</h2>
              <p>
                Explorez notre flotte, structurez vos reservations et avancez avec un partenaire
                capable d'allier rapidite operationnelle, image premium et accompagnement prioritaire.
              </p>
            </div>
            <div className="public-cta-card__actions">
              <Link to="/cars" className="btn btn-primary cta-premium">
                Decouvrir la flotte <ArrowRight size={18} />
              </Link>
              <Link to="/contact" className="btn btn-outline btn-outline-light public-cta-card__secondary">
                Parler a un conseiller
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

export default PublicHome;