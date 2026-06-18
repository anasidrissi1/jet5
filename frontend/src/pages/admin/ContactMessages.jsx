import React, { useEffect, useState } from "react";
import { contactService } from "../../services/api";
import "../../styles/admin-contact-messages.css";

function ContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await contactService.list();
        setMessages(response.data || []);
      } catch (err) {
        console.error("Erreur lors du chargement des messages de contact", err);
        setError("Impossible de charger les messages de contact.");
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  const markAsRead = async (id) => {
    try {
      await contactService.markRead(id);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_read: true } : m))
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('jet5:refreshSidebarCounts'));
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour du message", err);
    }
  };

  return (
    <div className="admin-contact-messages-page">
      <header className="admin-contact-messages-header">
        <h1>Messages de contact</h1>
        <p>Messages envoyés depuis le site client.</p>
      </header>

      {loading && <p>Chargement...</p>}
      {error && <p className="admin-contact-messages-error">{error}</p>}

      {!loading && !error && (
        <div className="admin-contact-messages-table-wrapper">
          {messages.length === 0 ? (
            <p style={{ padding: "0.75rem 1rem" }}>Aucun message pour le moment.</p>
          ) : (
            <table className="admin-contact-messages-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Message</th>
                  <th>Date</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => (
                  <tr key={msg.id} className={msg.is_read ? "read" : "unread"}>
                    <td>{msg.name}</td>
                    <td>{msg.email || "—"}</td>
                    <td>{msg.phone}</td>
                    <td className="admin-contact-message-table-message">{msg.message}</td>
                    <td>{new Date(msg.created_at).toLocaleString()}</td>
                    <td>
                      {msg.is_read ? (
                        <span>Lu</span>
                      ) : (
                        <button
                          type="button"
                          className="btn-secondary btn-secondary--small"
                          onClick={() => markAsRead(msg.id)}
                        >
                          Marquer comme lu
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default ContactMessages;
