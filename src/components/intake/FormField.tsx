type Props = {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
};

export default function FormField({ label, htmlFor, required, error, helperText, children }: Props) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-normal uppercase mb-1.5"
        style={{ color: '#2D5A42', letterSpacing: '1.5px' }}
      >
        {label}
        {required && <span className="text-orange ml-1" aria-hidden="true">*</span>}
      </label>
      {children}
      {helperText && !error && (
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: '#999', fontWeight: 300 }}>
          {helperText}
        </p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-orange" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
