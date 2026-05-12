import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, CardContent, CardHeader, CardTitle } from '@rnr/card';
import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { cn } from '@/lib/cn';

interface FeaturePlaceholderItem {
    title: string;
    description: string;
    detail: string;
    tone?: 'primary' | 'cool' | 'warm';
}

interface FeaturePlaceholderScreenProps {
    badge: string;
    eyebrow: string;
    title: string;
    description: string;
    noteTitle: string;
    noteDescription: string;
    items: FeaturePlaceholderItem[];
    actionTitle?: string;
    onActionPress?: () => void;
}

export function FeaturePlaceholderScreen({
    badge,
    eyebrow,
    title,
    description,
    noteTitle,
    noteDescription,
    items,
    actionTitle,
    onActionPress,
}: FeaturePlaceholderScreenProps) {
    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96, paddingTop: 24, gap: 24 }}>
                <Card className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <CardHeader className="gap-0">
                        <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">{eyebrow}</Text>
                        <CardTitle className="mt-3 text-3xl">{title}</CardTitle>
                    </CardHeader>
                    <CardContent className="mt-3 gap-0">
                        <Text className="text-base leading-7 text-slate-600">{description}</Text>
                    </CardContent>
                    <View className="mt-5 self-start rounded-full bg-indigo-100 px-3 py-1">
                        <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">{badge}</Text>
                    </View>
                    {actionTitle && onActionPress ? (
                        <Button className="mt-6 self-start" onPress={onActionPress} title={actionTitle} variant="secondary" />
                    ) : null}
                </Card>

                <Card className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <CardHeader className="gap-0">
                        <CardTitle className="text-2xl">What&apos;s happening here</CardTitle>
                    </CardHeader>
                    <CardContent className="mt-3 gap-0">
                        <Text className="text-base leading-7 text-slate-600">{noteDescription}</Text>
                    </CardContent>
                    <View className="mt-5 self-start rounded-full bg-amber-100 px-3 py-1">
                        <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">{noteTitle}</Text>
                    </View>
                </Card>

                <View className="gap-4">
                    {items.map((item) => (
                        <Card className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm" key={item.title}>
                            <View className={cn('self-start rounded-full px-3 py-1', itemBadgeVariants[item.tone ?? 'primary'])}>
                                <Text className={cn('text-xs font-semibold uppercase tracking-[0.16em]', itemTextVariants[item.tone ?? 'primary'])}>
                                    {item.title}
                                </Text>
                            </View>
                            <Text className="mt-4 text-xl font-semibold text-slate-900">{item.description}</Text>
                            <Text className="mt-3 text-base leading-7 text-slate-600">{item.detail}</Text>
                        </Card>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const itemBadgeVariants = {
    primary: 'bg-indigo-100',
    cool: 'bg-sky-100',
    warm: 'bg-amber-100',
} as const;

const itemTextVariants = {
    primary: 'text-indigo-700',
    cool: 'text-sky-700',
    warm: 'text-amber-800',
} as const;