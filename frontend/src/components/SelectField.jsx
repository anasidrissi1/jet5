import React from 'react';

const SelectField = ({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  placeholder = '-- Choisir --',
  className = 'form-input',
  style = {},
  labelStyle = {},
  hint = null,
  renderOption = null
}) => {
  return (
    <div style={{ marginBottom: '12px' }}>
      {label && (
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, ...labelStyle }}>
          {label}
          {required && <span style={{ color: '#D4A900' }}> *</span>}
        </label>
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={className}
        style={{ width: '100%', ...style }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option, index) => {
          if (renderOption) {
            return renderOption(option, index);
          }
          // Support for both simple strings and {value, label} objects
          if (typeof option === 'string') {
            return <option key={index} value={option}>{option}</option>;
          }
          return (
            <option key={option.value || index} value={option.value}>
              {option.label || option.value}
            </option>
          );
        })}
      </select>
      {hint && (
        <small className="form-hint" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
          {hint}
        </small>
      )}
    </div>
  );
};

export default SelectField;
