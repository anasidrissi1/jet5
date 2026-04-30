import React from 'react';

export default function CheckboxField({
  label,
  name,
  checked,
  onChange,
  className = 'checkbox-inline',
  disabled = false
}) {
  return (
    <label className={className}>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      {label}
    </label>
  );
}
