import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { fetchPublicCars, submitPublicReservation } from "@/services/publicApi";
import "@/styles/public-booking.css";

export default function PublicBooking() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [cars, setCars] = useState([]);
  const [sending, setSending] = useState(false);
  const search = new URLSearchParams(location.search);
  const searchCar = search.get("car") || "";
  const [carId, setCarId] = useState("");
  const [pickup, setPickup] = useState("");
  const [ret, setRet] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");

  useEffect(() => {
    let mounted = true;

    fetchPublicCars()
      .then((data) => {
        if (!mounted) {
          return;
        }

        setCars(data);

        const fallbackCarId = data[0]?.id || "";
        const selectedId =
          id && data.some((item) => item.id === id)
            ? id
            : searchCar && data.some((item) => item.id === searchCar)
              ? searchCar
              : fallbackCarId;

        setCarId(selectedId);
      })
      .catch(() => {
        if (mounted) {
          setCars([]);
          setCarId("");
        }
      });

    return () => {
      mounted = false;
    };
  }, [id, searchCar]);

  const car = cars.find((item) => item.id === carId) || cars[0];
  const days = useMemo(() => {
    if (!pickup || !ret) return 1;
    const d = (new Date(ret).getTime() - new Date(pickup).getTime()) / 86400000;
    return Math.max(1, Math.ceil(d));
  }, [pickup, ret]);
  const total = (car?.price || 0) * days;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!carId) {
      return;
    }

    setSending(true);

    try {
      const response = await submitPublicReservation({
        car_id: Number(carId),
        start_date: pickup,
        end_date: ret,
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
        payment_method: "pay_on_site",
        customer: {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
        },
      });

      navigate(`/booking-confirmation/${carId}`, {
        state: {
          reservationId: response?.reservation_id,
        },
      });
    } catch (error) {
      alert("Impossible d'envoyer la reservation pour le moment.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="jet-booking">
      <div className="jet-container">
        <span className="jet-eyebrow">Réservation</span>
        <h1 className="jet-section-title" style={{ marginBottom: 40 }}>Réservez votre véhicule</h1>
        <div className="jet-booking-grid">
          <form
            className="jet-booking-form"
            onSubmit={handleSubmit}
          >
            <div className="jet-form-grid">
              <div className="full">
                <label className="jet-label">Véhicule</label>
                <select className="jet-select" value={carId} onChange={(e) => setCarId(e.target.value)} required>
                  {cars.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.price}€/jour</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="jet-label">Date de départ</label>
                <input type="date" className="jet-input" value={pickup} onChange={(e) => setPickup(e.target.value)} required />
              </div>
              <div>
                <label className="jet-label">Date de retour</label>
                <input type="date" className="jet-input" value={ret} onChange={(e) => setRet(e.target.value)} required />
              </div>
              <div>
                <label className="jet-label">Lieu de prise en charge</label>
                <input type="text" className="jet-input" placeholder="Paris CDG" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} required />
              </div>
              <div>
                <label className="jet-label">Lieu de restitution</label>
                <input type="text" className="jet-input" placeholder="Paris CDG" value={dropoffLocation} onChange={(e) => setDropoffLocation(e.target.value)} required />
              </div>
              <div>
                <label className="jet-label">Prénom</label>
                <input type="text" className="jet-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div>
                <label className="jet-label">Nom</label>
                <input type="text" className="jet-input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
              <div>
                <label className="jet-label">Email</label>
                <input type="email" className="jet-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="jet-label">Téléphone</label>
                <input type="tel" className="jet-input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div className="full">
                <button type="submit" className="jet-btn jet-btn-primary" style={{ width: "100%" }} disabled={sending}>
                  {sending ? "Envoi en cours..." : "Confirmer la réservation"}
                </button>
              </div>
            </div>
          </form>

          <aside className="jet-summary">
            <h3>Récapitulatif</h3>
            <div className="jet-summary-row"><span>Véhicule</span><span>{car?.name || "-"}</span></div>
            <div className="jet-summary-row"><span>Prix journalier</span><span>{car?.price || 0}€</span></div>
            <div className="jet-summary-row"><span>Durée</span><span>{days} jour{days > 1 ? "s" : ""}</span></div>
            <div className="jet-summary-row"><span>Assurance premium</span><span>Incluse</span></div>
            <div className="jet-summary-row total"><span>Total TTC</span><span>{total}€</span></div>
          </aside>
        </div>
      </div>
    </section>
  );
}