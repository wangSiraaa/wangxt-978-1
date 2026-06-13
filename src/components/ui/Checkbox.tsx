import * as React from 'react';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean;
  onChange?: (checked: boolean | React.ChangeEvent<HTMLInputElement>) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onChange, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange.length === 1 ? onChange(e.target.checked) : onChange(e);
      }
    };

    return (
      <label className="inline-flex items-center cursor-pointer">
        <span className="relative">
          <input
            ref={ref}
            type="checkbox"
            className="sr-only"
            checked={checked}
            disabled={disabled}
            onChange={handleChange}
            {...props}
          />
          <span
            className={cn(
              'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
              checked
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-slate-300 hover:border-slate-400',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
          >
            {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </span>
        </span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
