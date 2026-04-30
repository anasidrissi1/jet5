import React from 'react';
import '../../styles/MonthSelector.css';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Composant de sélection de mois avec dropdowns
 * @param {number} month - Mois sélectionné (1-12)
 * @param {number} year - Année sélectionnée
 * @param {function} onChange - Callback (month, year) appelé lors du changement
 * @param {boolean} showCurrentButton - Afficher le bouton "Actuel"
 */
function MonthSelector({ month, year, onChange, showCurrentButton = true }) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  const isCurrentMonth = month === currentMonth && year === currentYear;

  // Générer les années disponibles (de 2020 à l'année actuelle)
  const years = [];
  for (let y = currentYear; y >= 2020; y--) {
    years.push(y);
  }

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value);
    onChange(newMonth, year);
  };

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value);
    // Si on sélectionne l'année actuelle et que le mois est dans le futur, ajuster
    if (newYear === currentYear && month > currentMonth) {
      onChange(currentMonth, newYear);
    } else {
      onChange(month, newYear);
    }
  };

  const handleCurrent = () => {
    onChange(currentMonth, currentYear);
  };

  // Filtrer les mois disponibles si on est sur l'année actuelle
  const availableMonths = year === currentYear 
    ? MONTHS.slice(0, currentMonth) 
    : MONTHS;

  return (
    <div className="month-selector">
      <span className="month-icon">📅</span>
      
      <select 
        className="month-select"
        value={month}
        onChange={handleMonthChange}
      >
        {availableMonths.map((m, index) => (
          <option key={index + 1} value={index + 1}>
            {m}
          </option>
        ))}
      </select>
      
      <select 
        className="year-select"
        value={year}
        onChange={handleYearChange}
      >
        {years.map(y => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      
      {showCurrentButton && !isCurrentMonth && (
        <button 
          className="month-current-btn"
          onClick={handleCurrent}
          title="Revenir au mois actuel"
        >
          Actuel
        </button>
      )}
    </div>
  );
}

export default MonthSelector;
