import type { ReactNode } from 'react';

import { Button as PrimitiveButton, type ButtonProps as PrimitiveButtonProps } from '@rnr/button';
import { Text } from '@rnr/text';
import { View } from 'react-native';

import { cn } from '@/lib/cn';

interface ButtonProps extends PrimitiveButtonProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  textClassName?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export function Button({ title, variant = 'primary', textClassName, disabled, iconLeft, iconRight, ...buttonProps }: ButtonProps) {
  return (
    <PrimitiveButton
      {...buttonProps}
      disabled={disabled}
      className={cn(styles.button, buttonVariants[variant], disabled ? 'opacity-60' : undefined, buttonProps.className)}>
      <View className="flex-row items-center gap-2">
        {iconLeft}
        <Text className={cn(buttonTextVariants[variant], textClassName)}>{title}</Text>
        {iconRight}
      </View>
    </PrimitiveButton>
  );
}

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
