import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';
import { Text, type TextProps } from '@rnr/text';

export interface CardProps extends ViewProps {
    className?: string;
}

export interface CardSectionProps extends ViewProps {
    className?: string;
}

export interface CardTitleProps extends TextProps {
    className?: string;
}

export function Card({ className, ...props }: CardProps) {
    return <View className={cn('rounded-2xl bg-white shadow-sm', className)} {...props} />;
}

export function CardHeader({ className, ...props }: CardSectionProps) {
    return <View className={cn('gap-2', className)} {...props} />;
}

export function CardContent({ className, ...props }: CardSectionProps) {
    return <View className={cn('gap-3', className)} {...props} />;
}

export function CardTitle({ className, ...props }: CardTitleProps) {
    return <Text className={cn('text-lg font-semibold text-slate-900', className)} {...props} />;
}