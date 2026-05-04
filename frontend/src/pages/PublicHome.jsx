import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Sparkles, Headphones, Clock, ArrowRight } from "lucide-react";
import alpineHero from "@/assets/alpine.jpg";
import arkanaHero from "@/assets/arkanajet.jpg";
import daciaHero from "@/assets/daciasa.jpg";
import { fetchPublicCars } from "@/services/publicApi";
import "@/styles/public-cars.css";

const HERO_IMAGES = [alpineHero, arkanaHero, daciaHero];

export default function PublicHome() {
  const [cars, setCars] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    let mounted = true;

    fetchPublicCars()
      .then((data) => {
        if (mounted) {
          setCars(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setCars([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % HERO_IMAGES.length);
    }, 4000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const featured = useMemo(() => {
    if (cars.length === 0) {
      return [];
    }

    const popular = cars.filter((car) => car.isPopular);
    if (popular.length > 0) {
      return popular.slice(0, 3);
    }

    return cars.slice(0, 3);
  }, [cars]);
  const bookingHref = featured[0]?.id ? `/booking/${featured[0].id}` : "/booking";
  return (
    <>
      <section className="jet-hero">
        <div className="jet-hero-bg" style={{ backgroundImage: `url(${HERO_IMAGES[heroIndex]})` }} />
        <div className="jet-container jet-hero-content">
          <span className="jet-eyebrow">JET5 · Location de prestige</span>
          <h1>
            Conduisez <span className="accent">l'exception</span>.
            <br />
            Partout. Toujours.
          </h1>
          <p>
            Une flotte d'élite, un service sur mesure et la garantie d'une expérience
            inoubliable au volant des plus belles automobiles.
          </p>
          <div className="jet-hero-actions">
            <Link to="/cars" className="jet-btn jet-btn-primary">
              Découvrir la flotte <ArrowRight size={18} />
            </Link>
            <Link to={bookingHref} className="jet-btn jet-btn-outline">
              Réserver un véhicule
            </Link>
          </div>
        </div>
      </section>

      <section className="jet-section">
        <div className="jet-container">
          <div className="jet-section-head">
            <div>
              <span className="jet-eyebrow">Pourquoi JET5</span>
              <h2 className="jet-section-title">L'art de la location premium</h2>
            </div>
            <p className="jet-section-subtitle">
              Quatre piliers définissent notre engagement quotidien envers chaque client.
            </p>
          </div>
          <div className="jet-features">
            {[
              { icon: <Sparkles size={22} />, title: "Flotte d'exception", desc: "Modèles récents, parfaitement entretenus, livrés impeccables." },
              { icon: <ShieldCheck size={22} />, title: "Sérénité totale", desc: "Assurance tous risques et assistance 24/7 incluses." },
              { icon: <Headphones size={22} />, title: "Conciergerie dédiée", desc: "Un interlocuteur unique pour anticiper chacune de vos demandes." },
              { icon: <Clock size={22} />, title: "Livraison rapide", desc: "Dans toute la France, à l'adresse et l'heure de votre choix." },
            ].map((f) => (
              <div className="jet-feature" key={f.title}>
                <div className="jet-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="jet-section" style={{ paddingTop: 0 }}>
        <div className="jet-container">
          <div className="jet-section-head">
            <div>
              <span className="jet-eyebrow">Sélection</span>
              <h2 className="jet-section-title">Véhicules en vedette</h2>
            </div>
            <Link to="/cars" className="jet-btn jet-btn-outline">Voir toute la flotte</Link>
          </div>
          <div className="jet-cars-grid">
            {featured.map((car) => (
              <Link
                key={car.id}
                to={`/cars/${car.id}`}
                className="jet-car-card"
              >
                <div className="jet-car-img">
                  <img src={car.image} alt={car.name} loading="lazy" />
                </div>
                <div className="jet-car-body">
                  <span className="jet-car-cat">{car.category}</span>
                  <h3 className="jet-car-name">{car.name}</h3>
                  <div className="jet-car-foot">
                    <div className="jet-car-price">
                      {car.price} DH <small>/ jour</small>
                    </div>
                    <ArrowRight size={20} color="var(--jet-gold)" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="jet-section" style={{ paddingTop: 0 }}>
        <div className="jet-container">
          <div className="jet-cta-band">
            <span className="jet-eyebrow" style={{ color: "var(--jet-gold)" }}>Réservation</span>
            <h2>Prêt pour votre prochaine évasion&nbsp;?</h2>
            <p>Réservez votre véhicule en quelques clics, profitez d'un service haut de gamme.</p>
            <Link to={bookingHref} className="jet-btn jet-btn-primary">
              Réserver maintenant <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
