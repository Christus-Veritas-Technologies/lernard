import { forwardRef } from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  textClassName?: string;
}

export const Button = forwardRef<View, ButtonProps>(({ title, variant = 'primary', textClassName, disabled, ...touchableProps }, ref) => {
  return (
    <TouchableOpacity
      ref={ref}
      {...touchableProps}
      disabled={disabled}
      className={joinClasses(styles.button, buttonVariants[variant], disabled ? 'opacity-60' : undefined, touchableProps.className)}>
      <Text className={joinClasses(buttonTextVariants[variant], textClassName)}>{title}</Text>
    </TouchableOpacity>
  );
});

Button.displayName = 'Button';

const styles = {
  button: 'items-center justify-center rounded-[28px] px-4 py-3.5 shadow-sm',
};

const buttonVariants = {
  primary: 'bg-indigo-500',
  secondary: 'border border-slate-200 bg-white',
  danger: 'bg-rose-500',
  ghost: 'border border-slate-200 bg-transparent',
} as const;

const buttonTextVariants = {
  primary: 'text-center text-base font-semibold text-white',
  secondary: 'text-center text-base font-semibold text-slate-900',
  danger: 'text-center text-base font-semibold text-white',
  ghost: 'text-center text-base font-semibold text-slate-700',
} as const;

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ');
}
