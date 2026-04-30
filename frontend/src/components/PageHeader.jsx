import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * A simple page header with a title and optional subtitle.
 * Props:
 *   - title: string (required)
 *   - subtitle: string (optional)
 *   - backUrl: string (optional) - if provided, displays a back button
 *   - style: additional style object to apply to the outer container
 */
export default function PageHeader({ title, subtitle, backUrl, style = {} }) {
  const navigate = useNavigate();

  return (
    <div className="page-header" style={{ marginBottom: '16px', ...style }}>
      {backUrl && (
        <button
          type="button"
          onClick={() => navigate(backUrl)}
          style={{
            marginRight: '12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          ←
        </button>
      )}
      <h1 className="page-title" style={{ margin: 0 }}>{title}</h1>
      {subtitle && <p className="page-subtitle" style={{ margin: '4px 0 0' }}>{subtitle}</p>}
    </div>
  );
}
