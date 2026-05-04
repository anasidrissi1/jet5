import { Link } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { Users, Fuel, Settings2 } from "lucide-react";
import { fetchPublicCars } from "@/services/publicApi";
import "@/styles/public-cars.css";

export default function PublicCars() {
  const [cars, setCars] = useState([]);
  const [filter, setFilter] = useState("Tous");

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

  const categories = useMemo(() => {
    const unique = Array.from(new Set(cars.map((car) => car.category).filter(Boolean)));
    return ["Tous", ...unique];
  }, [cars]);

  const list = useMemo(
    () => (filter === "Tous" ? cars : cars.filter((c) => c.category === filter)),
    [cars, filter]
  );

  return (
    <>
      <section className="jet-cars-hero">
        <div className="jet-container">
          <span className="jet-eyebrow">Notre flotte</span>
          <h1>Une collection d'exception</h1>
          <p>
            Découvrez notre sélection rigoureuse de véhicules premium, à louer pour
            quelques heures ou plusieurs semaines.
          </p>
          <div className="jet-filters">
            {categories.map((c) => (
              <button
                key={c}
                className={`jet-chip ${filter === c ? "active" : ""}`}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="jet-container">
        <div className="jet-cars-grid">
          {list.map((car) => (
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
                <div className="jet-car-specs">
                  <span className="jet-car-spec"><Users size={14} /> {car.seats}</span>
                  <span className="jet-car-spec"><Settings2 size={14} /> {car.transmission}</span>
                  <span className="jet-car-spec"><Fuel size={14} /> {car.fuel}</span>
                </div>
                <div className="jet-car-foot">
                  <div className="jet-car-price">
                    {car.price} DH <small>/ jour</small>
                  </div>
                  <span style={{ color: "var(--jet-gold)", fontWeight: 600, fontSize: "0.9rem" }}>
                    Détails →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
