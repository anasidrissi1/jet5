import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import './TimelineAujourdhui.css';

function TimelineAujourdhui() {
  const navigate = useNavigate();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadTimeline();
    
    // Mettre à jour l'heure actuelle toutes les minutes
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/dashboard/timeline-aujourdhui/');
      setTimeline(response.data.events || []);
    } catch (error) {
      console.error('Erreur chargement timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type) => {
    const icons = {
      'retour': '🔙',
      'depart': '🚀',
      'paiement': '💰',
      'inspection': '🔍',
      'entretien': '🔧',
      'alerte': '⚠️'
    };
    return icons[type] || '📌';
  };

  const getEventColor = (type, isPast) => {
    if (isPast) return 'event-past';
    
    const colors = {
      'retour': 'event-warning',
      'depart': 'event-info',
      'paiement': 'event-success',
      'inspection': 'event-primary',
      'entretien': 'event-secondary',
      'alerte': 'event-danger'
    };
    return colors[type] || 'event-default';
  };

  const parseEventTime = (timeStr) => {
    // Format: "09h00" ou "14h30"
    const [hours, minutes] = timeStr.replace('h', ':').split(':');
    const today = new Date();
    today.setHours(parseInt(hours), parseInt(minutes || '0'), 0, 0);
    return today;
  };

  const isEventPast = (eventTime) => {
    const eventDate = parseEventTime(eventTime);
    return eventDate < currentTime;
  };

  const isEventNow = (eventTime) => {
    const eventDate = parseEventTime(eventTime);
    const diff = Math.abs(eventDate - currentTime);
    return diff < 3600000; // Dans l'heure actuelle
  };

  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    // Position de 8h (début) à 20h (fin) = 12 heures
    const totalMinutes = (hours - 8) * 60 + minutes;
    const totalDayMinutes = 12 * 60; // 8h-20h
    return Math.max(0, Math.min(100, (totalMinutes / totalDayMinutes) * 100));
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="timeline-widget">
        <div className="timeline-header">
          <h3>⏰ Planning Aujourd'hui</h3>
        </div>
        <div className="timeline-loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="timeline-widget">
      <div className="timeline-header">
        <div>
          <h3>⏰ Planning Aujourd'hui</h3>
          <p className="timeline-date">
            {new Date().toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </p>
        </div>
        <div className="timeline-current-time">
          <span className="current-time-label">Maintenant</span>
          <span className="current-time-value">{formatCurrentTime()}</span>
        </div>
      </div>

      <div className="timeline-container">
        {/* Ligne du temps */}
        <div className="timeline-track">
          <div className="timeline-hours">
            {[8, 10, 12, 14, 16, 18, 20].map(hour => (
              <div key={hour} className="timeline-hour-mark">
                <span>{hour}h</span>
              </div>
            ))}
          </div>

          {/* Indicateur heure actuelle */}
          <div 
            className="timeline-now-indicator"
            style={{ left: `${getCurrentTimePosition()}%` }}
          >
            <div className="now-line"></div>
            <div className="now-dot"></div>
          </div>

          {/* Événements */}
          <div className="timeline-events">
            {timeline.length === 0 ? (
              <div className="timeline-empty">
                <p>✅ Aucun événement prévu aujourd'hui</p>
                <p className="timeline-empty-subtitle">Profitez de cette journée calme !</p>
              </div>
            ) : (
              timeline.map((event, index) => {
                const isPast = isEventPast(event.time);
                const isNow = isEventNow(event.time);
                
                return (
                  <div 
                    key={index} 
                    className={`timeline-event ${getEventColor(event.type, isPast)} ${isNow ? 'event-now' : ''} ${isPast ? 'event-done' : ''}`}
                    onClick={() => event.link && navigate(event.link)}
                    style={{ cursor: event.link ? 'pointer' : 'default' }}
                  >
                    <div className="event-time">
                      <span className="event-hour">{event.time}</span>
                      {isNow && <span className="event-now-badge">EN COURS</span>}
                    </div>
                    <div className="event-content">
                      <div className="event-icon">{getEventIcon(event.type)}</div>
                      <div className="event-details">
                        <h4 className="event-title">{event.title}</h4>
                        <p className="event-description">{event.description}</p>
                        {event.agent && (
                          <span className="event-agent">👤 {event.agent}</span>
                        )}
                      </div>
                      {event.priority && (
                        <span className={`event-priority priority-${event.priority}`}>
                          {event.priority === 'high' ? '🔴 Urgent' : 
                           event.priority === 'medium' ? '🟡 Important' : 
                           '🟢 Normal'}
                        </span>
                      )}
                    </div>
                    {!isPast && event.action && (
                      <button className="event-action-btn" onClick={(e) => {
                        e.stopPropagation();
                        if (event.link) navigate(event.link);
                      }}>
                        {event.action}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="timeline-stats">
          <div className="timeline-stat">
            <span className="stat-value">{timeline.filter(e => !isEventPast(e.time)).length}</span>
            <span className="stat-label">À venir</span>
          </div>
          <div className="timeline-stat">
            <span className="stat-value">{timeline.filter(e => isEventPast(e.time)).length}</span>
            <span className="stat-label">Terminés</span>
          </div>
          <div className="timeline-stat">
            <span className="stat-value">{timeline.filter(e => e.priority === 'high').length}</span>
            <span className="stat-label">Urgents</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimelineAujourdhui;
