import { Link } from "react-router-dom";
import { Plane, Car, Calendar, ShieldCheck, Crown, Key } from "lucide-react";

const services = [
  { icon: <Plane size={22} />, title: "Transferts aéroport", desc: "Chauffeur ou véhicule prêt à votre arrivée, dans tous les aéroports de France." },
  { icon: <Crown size={22} />, title: "Mariages & événements", desc: "Voitures d'apparat pour rendre vos moments inoubliables." },
  { icon: <Calendar size={22} />, title: "Location longue durée", desc: "Solutions flexibles à la semaine ou au mois, avec tarifs préférentiels." },
  { icon: <Car size={22} />, title: "Livraison à domicile", desc: "Nous livrons votre véhicule où vous le souhaitez, à l'heure qui vous convient." },
  { icon: <Key size={22} />, title: "Conciergerie 24/7", desc: "Un interlocuteur dédié à votre service à toute heure du jour et de la nuit." },
  { icon: <ShieldCheck size={22} />, title: "Assurance premium", desc: "Couverture tous risques incluse, franchise réduite, sérénité totale." },
];

export default function PublicService() {
  return (
    <>
      <section className="jet-cars-hero">
        <div className="jet-container">
          <span className="jet-eyebrow">Nos services</span>
          <h1>Une expérience pensée dans les moindres détails</h1>
          <p>De la prise en charge à la restitution, JET5 vous accompagne avec exigence.</p>
        </div>
      </section>

      <section className="jet-section" style={{ paddingTop: 24 }}>
        <div className="jet-container">
          <div className="jet-features">
            {services.map((s) => (
              <div className="jet-feature" key={s.title}>
                <div className="jet-feature-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="jet-cta-band" style={{ marginTop: 80 }}>
            <h2>Un projet sur mesure&nbsp;?</h2>
            <p>Notre conciergerie compose pour vous une offre adaptée.</p>
            <Link to="/contact" className="jet-btn jet-btn-primary">Nous contacter</Link>
          </div>
        </div>
      </section>
    </>
  );
}
