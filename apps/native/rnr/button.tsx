import { Pressable, type PressableProps } from 'react-native';

import { cn } from '@/lib/cn';

export interface ButtonProps extends PressableProps {
    className?: string;
}

export function Button({ accessibilityRole, className, disabled, ...props }: ButtonProps) {
    return (
        <Pressable
            accessibilityRole={accessibilityRole ?? 'button'}
            className={cn('min-h-11 items-center justify-center rounded-[28px]', disabled ? 'opacity-60' : undefined, className)}
            disabled={disabled}
            {...props}
        />
    );
}