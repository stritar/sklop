import type { ComponentPropsWithRef, ReactNode } from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  /** Glyph beside the label. Spacing lives on the label box, never a gap. */
  icon?: ReactNode;
  iconSide?: 'start' | 'end';
}

export function Button({
  icon,
  iconSide = 'start',
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const glyph = icon ? (
    <span className={styles.icon} aria-hidden="true">
      {icon}
    </span>
  ) : null;

  return (
    <button
      type={type}
      className={className ? `${styles.root} ${className}` : styles.root}
      {...rest}
    >
      {iconSide === 'start' && glyph}
      <span className={styles.label}>{children}</span>
      {iconSide === 'end' && glyph}
    </button>
  );
}
