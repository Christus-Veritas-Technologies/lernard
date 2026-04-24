import { View } from 'react-native';

import { Card, CardContent, CardHeader, CardTitle } from '@rnr/card';
import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { cn } from '@/lib/cn';

interface StateNoticeProps {
    badge: string;
    title: string;
    description: string;
    tone?: 'primary' | 'warm' | 'warning';
    actionTitle?: string;
    onActionPress?: () => void;
}

export function StateNotice({
    badge,
    title,
    description,
    tone = 'primary',
    actionTitle,
    onActionPress,
}: StateNoticeProps) {
    return (
        <Card className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <CardHeader className="gap-0">
                <View className={cn('self-start rounded-full px-3 py-1', badgeVariants[tone])}>
                    <Text className={cn('text-xs font-semibold uppercase tracking-[0.18em]', badgeTextVariants[tone])}>
                        {badge}
                    </Text>
                </View>
                <CardTitle className="mt-4 text-2xl">{title}</CardTitle>
            </CardHeader>
            <CardContent className="mt-3 gap-0">
                <Text className="text-base leading-7 text-slate-600">{description}</Text>
                {actionTitle && onActionPress ? (
                    <Button
                        className="mt-5 self-start"
                        onPress={onActionPress}
                        title={actionTitle}
                        variant="secondary"
                    />
                ) : null}
            </CardContent>
        </Card>
    );
}

const badgeVariants = {
    primary: 'bg-indigo-100',
    warm: 'bg-amber-100',
    warning: 'bg-rose-100',
} as const;

const badgeTextVariants = {
    primary: 'text-indigo-700',
    warm: 'text-amber-800',
    warning: 'text-rose-700',
} as const;