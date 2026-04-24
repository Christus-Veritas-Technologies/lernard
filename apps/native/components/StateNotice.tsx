import { Text, View } from 'react-native';

import { Button } from '@/components/Button';

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
        <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <View className={joinClasses('self-start rounded-full px-3 py-1', badgeVariants[tone])}>
                <Text className={joinClasses('text-xs font-semibold uppercase tracking-[0.18em]', badgeTextVariants[tone])}>
                    {badge}
                </Text>
            </View>
            <Text className="mt-4 text-2xl font-semibold text-slate-900">{title}</Text>
            <Text className="mt-3 text-base leading-7 text-slate-600">{description}</Text>
            {actionTitle && onActionPress ? (
                <Button
                    className="mt-5 self-start"
                    onPress={onActionPress}
                    title={actionTitle}
                    variant="secondary"
                />
            ) : null}
        </View>
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

function joinClasses(...classes: Array<string | undefined>) {
    return classes.filter(Boolean).join(' ');
}