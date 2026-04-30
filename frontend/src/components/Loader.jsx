import React from 'react';
import '../styles/loader.css';

const Loader = ({ size = 'medium', text = 'Chargement...' }) => {
  return (
    <div className={`loader-container ${size}`}>
      <div className="loader-spinner"></div>
      {text && <p className="loader-text">{text}</p>}
    </div>
  );
};

export default Loader;