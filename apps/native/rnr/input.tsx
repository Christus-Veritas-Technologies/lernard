import { forwardRef } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { cn } from '@/lib/cn';

export interface InputProps extends TextInputProps {
  className?: string;
  containerClassName?: string;
  hasError?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    className,
    containerClassName,
    hasError = false,
    leading,
    trailing,
    placeholderTextColor = '#9CA3AF',
    ...props
  },
  ref,
) {
  return (
    <View
      className={cn(
        'min-h-12 flex-row items-center rounded-[24px] border bg-white px-4 shadow-sm',
        hasError ? 'border-rose-300' : 'border-slate-200',
        containerClassName,
      )}>
      {leading ? <View className="mr-3">{leading}</View> : null}
      <TextInput
        ref={ref}
        className={cn('flex-1 py-3 text-base text-slate-900', className)}
        placeholderTextColor={placeholderTextColor}
        {...props}
      />
      {trailing ? <View className="ml-3">{trailing}</View> : null}
    </View>
  );
});