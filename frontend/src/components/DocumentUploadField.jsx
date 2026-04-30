import React from 'react';

export default function DocumentUploadField({
  label,
  fileName,
  fileNames,
  onFileChange,
  onRemoveFile,
  labelStyle,
  inputStyle,
  fileChipStyle,
  removeButtonStyle,
  hintStyle,
  hint = 'Formats: PDF, JPG, JPEG, PNG (Max 5MB)',
  accept = '.pdf,.jpg,.jpeg,.png',
  multiple = false,
  required = false,
}) {
  const normalizedFiles = Array.isArray(fileNames)
    ? fileNames.filter(Boolean)
    : Array.isArray(fileName)
      ? fileName.filter(Boolean)
      : fileName
        ? [fileName]
        : [];

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        required={required}
        onChange={onFileChange}
        style={inputStyle}
      />
      {normalizedFiles.map((name, index) => (
        <div key={`${name}-${index}`} style={fileChipStyle}>
          <span>✓ {name}</span>
          <button
            type="button"
            onClick={() => onRemoveFile(index)}
            style={removeButtonStyle}
          >
            ✕
          </button>
        </div>
      ))}
      <small style={hintStyle}>{hint}</small>
    </div>
  );
}
