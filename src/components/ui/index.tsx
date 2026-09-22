'use client';

/**
 * Design system reusable (PRD §76).
 * Semua komponen memakai design tokens dari globals.css.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { CheckCircle2, Info, Minus, Plus, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// BUTTON
// ============================================================
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-orange-500/20 active:scale-[0.98]',
  secondary:
    'bg-secondary text-secondary-foreground hover:opacity-90 active:scale-[0.98]',
  outline:
    'border border-border bg-card text-foreground hover:bg-muted active:scale-[0.98]',
  ghost: 'text-foreground hover:bg-muted active:scale-[0.98]',
  destructive:
    'bg-destructive text-destructive-foreground hover:opacity-90 active:scale-[0.98]',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-13 px-6 text-base gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none select-none',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

// ============================================================
// INPUT / TEXTAREA / SELECT
// ============================================================
const fieldBase =
  'w-full rounded-xl border border-border bg-card px-3.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, 'h-11 text-sm', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, 'min-h-24 py-2.5 text-sm', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, 'h-11 text-sm', className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ children, htmlFor, required }: { children: ReactNode; htmlFor?: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
      {children}
      {required && <span className="text-destructive"> *</span>}
    </label>
  );
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

// ============================================================
// BADGE
// ============================================================
type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

const badgeTones: Record<BadgeTone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-primary-soft text-primary',
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary text-primary-foreground',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// ============================================================
// CARD
// ============================================================
export function Card({
  className,
  children,
  onClick,
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-border bg-card shadow-sm',
        onClick && 'cursor-pointer transition-shadow hover:shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================
// SWITCH
// ============================================================
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
          checked ? 'left-[22px]' : 'left-0.5'
        )}
      />
    </button>
  );
}

// ============================================================
// QUANTITY STEPPER
// ============================================================
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
}) {
  const btn =
    size === 'sm'
      ? 'h-8 w-8 rounded-lg'
      : 'h-10 w-10 rounded-xl';
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-label="Kurangi jumlah"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={cn(btn, 'flex items-center justify-center border border-border bg-card transition-colors hover:bg-muted disabled:opacity-40')}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className={cn('min-w-8 text-center font-bold', size === 'sm' ? 'text-sm' : 'text-base')} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Tambah jumlah"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn(btn, 'flex items-center justify-center bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40')}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

// ============================================================
// MODAL (dialog aksesibel)
// ============================================================
export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxWidth = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-overlay animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          'relative max-h-[85dvh] w-full overflow-y-auto rounded-3xl bg-card p-5 shadow-2xl animate-scale-in',
          maxWidth
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-border"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

// ============================================================
// BOTTOM SHEET (mobile-first)
// ============================================================
export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-overlay animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-t-3xl bg-card shadow-2xl animate-slide-up">
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-12 rounded-full bg-border" />
        </div>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// TOAST
// ============================================================
type Toast = { id: number; message: string; tone: 'success' | 'error' | 'info' };
const ToastContext = createContext<{ push: (msg: string, tone?: Toast['tone']) => void }>({
  push: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg animate-scale-in',
              t.tone === 'success' && 'bg-success text-white',
              t.tone === 'error' && 'bg-destructive text-destructive-foreground',
              t.tone === 'info' && 'bg-foreground text-background'
            )}
          >
            {t.tone === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {t.tone === 'error' && <XCircle className="h-4 w-4 shrink-0" />}
            {t.tone === 'info' && <Info className="h-4 w-4 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// ============================================================
// SKELETON / EMPTY STATE
// ============================================================
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center animate-fade-in">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ============================================================
// SPINNER
// ============================================================
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-label="Memuat"
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent',
        className
      )}
    />
  );
}
