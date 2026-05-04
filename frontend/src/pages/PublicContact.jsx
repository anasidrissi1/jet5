import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { useState } from "react";
import { submitPublicContact } from "@/services/publicApi";

export default function PublicContact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);

    try {
      const combinedMessage = subject ? `${subject}\n\n${message}` : message;
      await submitPublicContact({
        name,
        email,
        phone,
        message: combinedMessage,
      });

      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
      alert("Message envoyé !");
    } catch (error) {
      alert("Impossible d'envoyer votre message pour le moment.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="jet-contact">
      <div className="jet-container">
        <div className="jet-contact-grid">
          <div className="jet-contact-info">
            <span className="jet-eyebrow">Contact</span>
            <h1>Parlons de votre prochain trajet</h1>
            <p>
              Notre équipe se tient à votre disposition pour répondre à toutes vos
              demandes et vous proposer une expérience sur mesure.
            </p>
            <div className="jet-contact-list">
              <div className="jet-contact-item">
                <div className="jet-contact-item-icon"><Phone size={18} /></div>
                <div>
                  <div className="label">Téléphone</div>
                  <div className="value">
                    <a href="tel:+212661811580" style={{ color: "inherit", textDecoration: "underline" }}>
                      Appeler: +212 6 61 81 15 80
                    </a>
                    {" · "}
                    <a
                      href="https://wa.me/212661811580"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "inherit", textDecoration: "underline" }}
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
              <div className="jet-contact-item">
                <div className="jet-contact-item-icon"><Mail size={18} /></div>
                <div>
                  <div className="label">Email</div>
                  <div className="value">
                    <a href="mailto:jet5maroc@gmail.com" style={{ color: "inherit", textDecoration: "underline" }}>
                      jet5maroc@gmail.com
                    </a>
                  </div>
                </div>
              </div>
              <div className="jet-contact-item">
                <div className="jet-contact-item-icon"><MapPin size={18} /></div>
                <div>
                  <div className="label">Adresse</div>
                  <div className="value">
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=11+Rue+du+Liban,+Casablanca+20250"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "inherit", textDecoration: "underline" }}
                    >
                      11 Rue du Liban, Casablanca 20250
                    </a>
                  </div>
                </div>
              </div>
              <div className="jet-contact-item">
                <div className="jet-contact-item-icon"><Clock size={18} /></div>
                <div><div className="label">Horaires</div><div className="value">7j/7 · 8h — 22h</div></div>
              </div>
            </div>
          </div>
          <form className="jet-contact-form" onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: 20 }}>
              <div>
                <label className="jet-label">Nom complet</label>
                <input type="text" className="jet-input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="jet-label">Email</label>
                <input type="email" className="jet-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="jet-label">Téléphone</label>
                <input type="tel" className="jet-input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div>
                <label className="jet-label">Sujet</label>
                <input type="text" className="jet-input" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              </div>
              <div>
                <label className="jet-label">Message</label>
                <textarea className="jet-textarea" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} required />
              </div>
              <button className="jet-btn jet-btn-primary" type="submit" disabled={sending}>
                {sending ? "Envoi en cours..." : "Envoyer le message"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
