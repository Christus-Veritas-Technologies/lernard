import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { ProgressContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { NativePageHeader } from '@/components/NativePageHeader';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { formatPercent, formatRelativeDate } from '@/lib/formatters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/rnr/tabs';

export default function ProgressScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<ProgressContent>(
        ROUTES.PROGRESS.OVERVIEW,
    );

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Sign in required"
                        description="Lernard can only load your live progress snapshot after your session is active."
                        title="Progress needs your session"
                        tone="warm"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (loading) {
        return <RoleFullScreenLoadingOverlay forceVisible />;
    }

    if (error || !data) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Try again"
                        badge="Live payload failed"
                        description={error?.message ?? 'Something interrupted the progress request.'}
                        onActionPress={refetch}
                        title="Progress could not load right now"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const { content } = data;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <NativePageHeader
                    subtitle="Track trends and confidence"
                    title="Lernard's Read on You"
                />

                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Read on You</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">Your growth map is live</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        Track streak, level, and subject confidence so your next lesson or quiz targets the right growth area.
                    </Text>
                    <View className="mt-5 flex-row flex-wrap gap-2">
                        <Badge label={`${content.streak}-day streak`} tone="indigo" />
                        <Badge label={`Level ${content.xpLevel}`} tone="sky" />
                    </View>
                    <View className="mt-6 flex-row flex-wrap gap-3">
                        <Button onPress={() => router.push('/settings')} title="Settings" variant="secondary" />
                    </View>
                </View>

                <Tabs onValueChange={setActiveTab} value={activeTab}>
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="subjects">Subjects</TabsTrigger>
                    </TabsList>

                    <TabsContent className="mt-4" value="overview">
                        <View className="flex-row flex-wrap gap-4">
                            <MetricCard
                                description="Active subjects"
                                title={`${content.subjects.length}`}
                                tone="indigo"
                            />
                            <MetricCard
                                description="Current level"
                                title={`Level ${content.xpLevel}`}
                                tone="sky"
                            />
                        </View>
                    </TabsContent>

                    <TabsContent className="mt-4" value="subjects">
                        <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                            <View className="flex-row items-start justify-between gap-3">
                                <View className="flex-1">
                                    <Text className="text-2xl font-semibold text-slate-900">Subject confidence</Text>
                                    <Text className="mt-2 text-base leading-7 text-slate-600">
                                        Native progress bars replace web charts so this view stays smooth on mobile while keeping the same insight.
                                    </Text>
                                </View>
                            </View>

                            <View className="mt-5 gap-4">
                                {content.subjects.length ? content.subjects.map((subject) => {
                                    const score = averageTopicScore(subject.topics);
                                    return (
                                        <View className="rounded-[28px] bg-slate-50 p-4" key={subject.subjectId}>
                                            <View className="flex-row items-start justify-between gap-3">
                                                <View className="flex-1">
                                                    <Text className="text-lg font-semibold text-slate-900">{subject.subjectName}</Text>
                                                    <Text className="mt-1 text-sm leading-6 text-slate-600">
                                                        Last active {formatRelativeDate(subject.lastActiveAt)}
                                                    </Text>
                                                </View>
                                                <View className={strengthBadge(subject.strengthLevel)}>
                                                    <Text className={strengthText(subject.strengthLevel)}>{subject.strengthLevel.replace('_', ' ')}</Text>
                                                </View>
                                            </View>

                                            <View className="mt-4">
                                                <View className="flex-row items-center justify-between">
                                                    <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">Confidence trend</Text>
                                                    <Text className="text-sm font-semibold text-slate-900">{formatPercent(score)}</Text>
                                                </View>
                                                <View className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
                                                    <View
                                                        className="h-full rounded-full bg-indigo-500"
                                                        style={{ width: `${clampPercent(score)}%` }}
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    );
                                }) : (
                                    <Text className="text-base leading-7 text-slate-600">
                                        Subject progress will appear after your first completed lesson or quiz.
                                    </Text>
                                )}
                            </View>
                        </View>
                    </TabsContent>
                </Tabs>
            </ScrollView>
        </SafeAreaView>
    );
}

function Badge({ label, tone }: { label: string; tone: 'indigo' | 'sky' | 'emerald' | 'amber' }) {
    return (
        <View className={badgeTone[tone]}>
            <Text className={badgeToneText[tone]}>{label}</Text>
        </View>
    );
}

function MetricCard({
    title,
    description,
    tone,
}: {
    title: string;
    description: string;
    tone: 'indigo' | 'sky';
}) {
    return (
        <View className="min-w-[160px] flex-1 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <Text className={tone === 'indigo' ? 'text-sm font-semibold uppercase tracking-[0.16em] text-indigo-500' : 'text-sm font-semibold uppercase tracking-[0.16em] text-sky-600'}>
                Snapshot
            </Text>
            <Text className="mt-3 text-3xl font-semibold text-slate-900">{title}</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-600">{description}</Text>
        </View>
    );
}

function averageTopicScore(topics: Array<{ score: number }>) {
    if (!topics.length) {
        return null;
    }

    return Math.round(topics.reduce((sum, topic) => sum + topic.score, 0) / topics.length);
}

function clampPercent(value: number | null) {
    if (value === null) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round(value)));
}

function strengthBadge(strengthLevel: string) {
    if (strengthLevel === 'strong') {
        return 'rounded-full bg-emerald-100 px-3 py-1';
    }

    if (strengthLevel === 'developing') {
        return 'rounded-full bg-amber-100 px-3 py-1';
    }

    return 'rounded-full bg-rose-100 px-3 py-1';
}

function strengthText(strengthLevel: string) {
    if (strengthLevel === 'strong') {
        return 'text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700';
    }

    if (strengthLevel === 'developing') {
        return 'text-xs font-semibold uppercase tracking-[0.16em] text-amber-800';
    }

    return 'text-xs font-semibold uppercase tracking-[0.16em] text-rose-700';
}

const badgeTone = {
    indigo: 'rounded-full bg-indigo-100 px-3 py-1',
    sky: 'rounded-full bg-sky-100 px-3 py-1',
    emerald: 'rounded-full bg-emerald-100 px-3 py-1',
    amber: 'rounded-full bg-amber-100 px-3 py-1',
} as const;

const badgeToneText = {
    indigo: 'text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700',
    sky: 'text-xs font-semibold uppercase tracking-[0.16em] text-sky-700',
    emerald: 'text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700',
    amber: 'text-xs font-semibold uppercase tracking-[0.16em] text-amber-800',
} as const;
