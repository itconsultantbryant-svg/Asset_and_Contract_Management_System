import React from 'react';
import './FormInput.css';

const FormInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  options, // For select inputs
  rows, // For textarea
  ...props
}) => {
  const inputId = `input-${name}`;

  return (
    <div className="form-input-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      
      {type === 'select' ? (
        <select
          id={inputId}
          name={name}
          value={value || ''}
          onChange={onChange}
          className={`form-control ${error ? 'error' : ''}`}
          required={required}
          {...props}
        >
          <option value="">Select {label}</option>
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={inputId}
          name={name}
          value={value || ''}
          onChange={onChange}
          className={`form-control ${error ? 'error' : ''}`}
          placeholder={placeholder}
          rows={rows || 4}
          required={required}
          {...props}
        />
      ) : (
        <input
          id={inputId}
          name={name}
          type={type}
          value={value || ''}
          onChange={onChange}
          className={`form-control ${error ? 'error' : ''}`}
          placeholder={placeholder}
          required={required}
          {...props}
        />
      )}
      
      {error && <div className="form-error">{error}</div>}
    </div>
  );
};

export default FormInput;

