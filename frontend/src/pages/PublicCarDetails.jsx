import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { fetchPublicCarById } from "@/services/publicApi";
import "@/styles/public-car-details.css";

export default function PublicCarDetails() {
  const { id } = useParams();
  const [car, setCar] = useState(null);

  useEffect(() => {
    let mounted = true;

    fetchPublicCarById(id)
      .then((data) => {
        if (mounted) {
          setCar(data || null);
        }
      })
      .catch(() => {
        if (mounted) {
          setCar(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  if (!car) {
    return (
      <div className="jet-container" style={{ padding: "120px 0", textAlign: "center" }}>
        <h1>Véhicule introuvable</h1>
        <Link to="/cars" className="jet-btn jet-btn-primary" style={{ marginTop: 24 }}>
          Retour à la flotte
        </Link>
      </div>
    );
  }

  return (
    <section className="jet-details">
      <div className="jet-container">
        <Link
          to="/cars"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "var(--jet-text-muted)",
            marginBottom: 32,
            fontSize: "0.95rem",
          }}
        >
          <ArrowLeft size={16} /> Retour à la flotte
        </Link>
        <div className="jet-details-grid">
          <div className="jet-details-img">
            <img src={car.image} alt={car.name} />
          </div>
          <div className="jet-details-info">
            <span className="jet-eyebrow">{car.category}</span>
            <h1>{car.name}</h1>
            <div className="jet-details-price">
              {car.price} DH <small>/ jour, TTC</small>
            </div>
            <p className="jet-details-desc">{car.description}</p>
            <div className="jet-spec-grid">
              <div className="jet-spec-item">
                <div className="label">Places</div>
                <div className="value">{car.seats}</div>
              </div>
              <div className="jet-spec-item">
                <div className="label">Boîte</div>
                <div className="value">{car.transmission}</div>
              </div>
              <div className="jet-spec-item">
                <div className="label">Énergie</div>
                <div className="value">{car.fuel}</div>
              </div>
              <div className="jet-spec-item">
                <div className="label">Puissance</div>
                <div className="value">{car.power}</div>
              </div>
            </div>
            <Link
              to={`/booking/${car.id}`}
              className="jet-btn jet-btn-primary"
              style={{ width: "100%" }}
            >
              Réserver ce véhicule
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}