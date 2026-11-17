import { useId, type InputHTMLAttributes, type JSX } from 'react';
import { VisuallyHidden } from '../VisuallyHidden/VisuallyHidden';
import './TextField.css';

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'aria-describedby' | 'aria-invalid'
>;

export interface TextFieldProps extends NativeInputProps {
  // Required: the visible label is the accessible name. Placeholder text is never a label (S7).
  label: string;
  // Hides the label visually but keeps it as the accessible name.
  hideLabel?: boolean;
  // Shown below the field and linked with aria-describedby; also sets aria-invalid.
  error?: string;
}

// S4: custom text field. The label is always rendered (visually hidden when requested) and linked to the input.
export function TextField({
  label,
  hideLabel = false,
  error,
  id,
  ...rest
}: TextFieldProps): JSX.Element {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hasError = error !== undefined && error.length > 0;

  return (
    <div className="ds-text-field">
      <label className="ds-text-field__label" htmlFor={inputId}>
        {hideLabel ? <VisuallyHidden>{label}</VisuallyHidden> : label}
      </label>
      <input
        id={inputId}
        className={
          hasError ? 'ds-text-field__input ds-text-field__input--error' : 'ds-text-field__input'
        }
        aria-invalid={hasError ? true : undefined}
        aria-describedby={hasError ? errorId : undefined}
        {...rest}
      />
      {hasError ? (
        <p id={errorId} className="ds-text-field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
