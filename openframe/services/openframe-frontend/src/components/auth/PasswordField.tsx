import React, { useState } from 'react';
import { Input, Button } from '@flamingo/ui-kit/components/ui';

interface PasswordStrength {
  percentage: number;
  class: 'weak' | 'medium' | 'strong' | '';
  label: string;
}

export interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  invalid?: boolean;
  autoComplete?: string;
  showStrength?: boolean;
  className?: string;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  invalid = false,
  autoComplete,
  showStrength = false,
  className
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const calculatePasswordStrength = (pwd: string): PasswordStrength => {
    if (!pwd) return { percentage: 0, class: '', label: '' };

    let strength = 0;
    let checks = 0;

    // Length check
    if (pwd.length >= 8) {
      strength += 25;
      checks++;
    }

    // Contains number
    if (/\d/.test(pwd)) {
      strength += 25;
      checks++;
    }

    // Contains lowercase
    if (/[a-z]/.test(pwd)) {
      strength += 25;
      checks++;
    }

    // Contains uppercase
    if (/[A-Z]/.test(pwd)) {
      strength += 25;
      checks++;
    }

    let strengthClass: 'weak' | 'medium' | 'strong' | '' = '';
    let label = '';

    if (checks === 4) {
      strengthClass = 'strong';
      label = 'Strong';
    } else if (checks >= 2) {
      strengthClass = 'medium';
      label = 'Medium';
    } else {
      strengthClass = 'weak';
      label = 'Weak';
    }

    return {
      percentage: strength,
      class: strengthClass,
      label
    };
  };

  const passwordStrength = calculatePasswordStrength(value);

  return (
    <div className={className}>
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-ods-text-primary mb-2"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          invalid={invalid}
          autoComplete={autoComplete}
          className="pr-12"
        />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          centerIcon={<span className="text-lg">{showPassword ? '👁️‍🗨️' : '👁️'}</span>}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-ods-text-secondary hover:text-ods-text-primary"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        />
        
        {showStrength && value && (
          <div className="absolute left-0 right-0 mt-1">
            <div className="h-1 bg-ods-border rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  passwordStrength.class === 'strong' ? 'bg-green-500' :
                  passwordStrength.class === 'medium' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${passwordStrength.percentage}%` }}
              />
            </div>
            <span className="text-xs text-ods-text-secondary mt-1 block">
              {passwordStrength.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};