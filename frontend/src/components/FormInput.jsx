import React from 'react';

/**
 * Standardized form input wrapper that includes a label and input element.
 * Props:
 *   - label: string or ReactNode
 *   - name: input name
 *   - value: controlled value
 *   - onChange: change handler
 *   - required: boolean
 *   - type: input type (text, email, tel, date, etc.)
 *   - placeholder: string
 *   - style: custom style object applied to the input
 *   - ...rest: other props forwarded to the input element
 */
export default function FormInput({
  label,
  name,
  value,
  onChange,
  required = false,
  type = 'text',
  placeholder = '',
  style = {},
  ...rest
}) {
  const commonStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', boxSizing: 'border-box', ...style };

  return (
    <div style={{ marginBottom: '12px' }}>
      {label ? (
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
          {label}
        </label>
      ) : null}
      {type === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          style={{ ...commonStyle, resize: 'vertical', fontFamily: 'inherit' }}
          {...rest}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          style={commonStyle}
          {...rest}
        />
      )}
    </div>
  );
}
