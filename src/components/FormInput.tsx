// 1️⃣ Import React hooks and types
import React, { InputHTMLAttributes, useState, useEffect, forwardRef } from 'react';

// 2️⃣ Define input types and variants
type InputVariant = 'default' | 'error' | 'success';
type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';

// 3️⃣ Interface extending HTML input attributes
interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  type?: InputType;
  variant?: InputVariant;
  error?: string;
  success?: string;
  helperText?: string;
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
  fullWidth?: boolean;
}

// 4️⃣ FormInput component with floating labels and enhanced UX
const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({
  label,
  type = 'text',
  variant = 'default',
  error,
  success,
  helperText,
  icon,
  showPasswordToggle = false,
  fullWidth = true,
  className = '',
  value,
  onChange,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  // 5️⃣ State for managing input focus and password visibility
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  // 6️⃣ Determine actual input type (handle password toggle)
  const inputType = type === 'password' && showPassword ? 'text' : type;

  // 7️⃣ Check if input has value for floating label animation
  useEffect(() => {
    setHasValue(Boolean(value && String(value).length > 0));
  }, [value]);

  // 8️⃣ Handle focus events
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  // 9️⃣ Handle blur events
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  // 🔟 Determine if label should be floating
  const shouldFloat = isFocused || hasValue;

  // 1️⃣1️⃣ Get variant-specific classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'error':
        return 'border-red-400 focus:border-red-400 focus:shadow-red-400/25';
      case 'success':
        return 'border-neon-green focus:border-neon-green focus:shadow-neon-green/25';
      default:
        return 'border-white/20 focus:border-neon-blue focus:shadow-neon-blue/25 hover:border-white/30';
    }
  };

  // 1️⃣2️⃣ Base input classes
  const inputClasses = `
    w-full px-4 py-4 rounded-xl
    bg-white/5 backdrop-blur-sm
    border text-white placeholder-transparent
    font-body text-base
    transition-all duration-300 ease-out
    focus:outline-none focus:bg-white/10
    ${getVariantClasses()}
    ${icon ? 'pl-12' : ''}
    ${showPasswordToggle && type === 'password' ? 'pr-12' : ''}
    ${className}
  `;

  // 1️⃣3️⃣ Label classes with floating animation
  const labelClasses = `
    absolute left-4 font-body pointer-events-none
    transition-all duration-300 ease-out origin-left
    ${shouldFloat 
      ? '-translate-y-6 translate-x-0 scale-75 text-neon-blue' 
      : 'top-4 text-gray-400'
    }
    ${icon && !shouldFloat ? 'left-12' : shouldFloat ? 'left-4' : ''}
  `;

  return (
    // 1️⃣4️⃣ Container with full width option
    <div className={`${fullWidth ? 'w-full' : ''} space-y-2`}>
      {/* Input container with floating label */}
      <div className="relative">
        {/* Icon (if provided) */}
        {icon && (
          <div className="absolute left-4 top-4 text-gray-400 z-10">
            {icon}
          </div>
        )}

        {/* Main input field */}
        <input
          ref={ref}
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={inputClasses}
          placeholder=" " // Required for floating label CSS
          {...props}
        />

        {/* Floating label */}
        <label className={labelClasses}>
          {label}
        </label>

        {/* Password toggle button */}
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none"
            tabIndex={-1}
          >
            {showPassword ? (
              // Eye slash icon (hide password)
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              // Eye icon (show password)
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}

        {/* Focus ring effect */}
        {isFocused && (
          <div className="absolute inset-0 rounded-xl border-2 border-neon-blue/50 pointer-events-none animate-pulse"></div>
        )}
      </div>

      {/* Helper text, error, or success message */}
      {(error || success || helperText) && (
        <div className="px-1">
          {error && (
            <p className="error-message flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          
          {success && !error && (
            <p className="success-message flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </p>
          )}
          
          {helperText && !error && !success && (
            <p className="text-gray-400 text-sm font-body">
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

// 1️⃣5️⃣ Set display name for debugging
FormInput.displayName = 'FormInput';

// 1️⃣6️⃣ Export the component
export default FormInput;

// 1️⃣7️⃣ Textarea component with similar styling
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  variant?: InputVariant;
  error?: string;
  success?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(({
  label,
  variant = 'default',
  error,
  success,
  helperText,
  fullWidth = true,
  className = '',
  value,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  useEffect(() => {
    setHasValue(Boolean(value && String(value).length > 0));
  }, [value]);

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const shouldFloat = isFocused || hasValue;

  const getVariantClasses = () => {
    switch (variant) {
      case 'error':
        return 'border-red-400 focus:border-red-400 focus:shadow-red-400/25';
      case 'success':
        return 'border-neon-green focus:border-neon-green focus:shadow-neon-green/25';
      default:
        return 'border-white/20 focus:border-neon-blue focus:shadow-neon-blue/25 hover:border-white/30';
    }
  };

  const textareaClasses = `
    w-full px-4 py-4 rounded-xl min-h-[120px]
    bg-white/5 backdrop-blur-sm
    border text-white placeholder-transparent
    font-body text-base resize-vertical
    transition-all duration-300 ease-out
    focus:outline-none focus:bg-white/10
    ${getVariantClasses()}
    ${className}
  `;

  const labelClasses = `
    absolute left-4 font-body pointer-events-none
    transition-all duration-300 ease-out origin-left
    ${shouldFloat 
      ? '-translate-y-6 translate-x-0 scale-75 text-neon-blue' 
      : 'top-4 text-gray-400'
    }
  `;

  return (
    <div className={`${fullWidth ? 'w-full' : ''} space-y-2`}>
      <div className="relative">
        <textarea
          ref={ref}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={textareaClasses}
          placeholder=" "
          {...props}
        />
        
        <label className={labelClasses}>
          {label}
        </label>

        {isFocused && (
          <div className="absolute inset-0 rounded-xl border-2 border-neon-blue/50 pointer-events-none animate-pulse"></div>
        )}
      </div>

      {(error || success || helperText) && (
        <div className="px-1">
          {error && <p className="error-message">{error}</p>}
          {success && !error && <p className="success-message">{success}</p>}
          {helperText && !error && !success && (
            <p className="text-gray-400 text-sm font-body">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
});

FormTextarea.displayName = 'FormTextarea';
