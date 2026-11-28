import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = soft yellow, dark text: ONE per screen. secondary = pale sage pill. */
  variant?: Variant;
  large?: boolean;
}

export function SageButton({ variant = 'secondary', large, className = '', type = 'button', ...rest }: Props) {
  const cls = `sd-btn sd-btn-${variant}${large ? ' sd-btn-large' : ''}${className ? ' ' + className : ''}`;
  return <button type={type} className={cls} {...rest} />;
}
