import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { HomeContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { formatRelativeDate } from '@/lib/formatters';

export default function HomeScreen() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<HomeContent>(
        ROUTES.HOME.PAYLOAD,
    );

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Sign in required"
                        description="Lernard needs your session token before it can load your real Home payload on mobile."
                        title="Your dashboard is ready when you are"
                        tone="warm"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Loading"
                        description="Pulling your live dashboard, recent sessions, and subject priorities from the API."
                        title="Building your dashboard"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !data) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Try again"
                        badge="Live payload failed"
                        description={error?.message ?? 'Something interrupted the mobile request.'}
                        onActionPress={refetch}
                        title="Home could not load right now"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const { content } = data;
    const showEmptyDashboard = !content.subjects.length;

    if (showEmptyDashboard) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Fresh start"
                        description="Your first live Home payload is connected. As soon as lessons or subjects are added, this dashboard will fill with real progress and activity."
                        title={content.greeting}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Your dashboard</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">{content.greeting}</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        Pick up where you left off, strengthen a growth area, or start a fresh sprint with Lernard ready to guide the next step.
                    </Text>
                    <View className="mt-5 flex-row flex-wrap gap-2">
                        <View className="rounded-full bg-emerald-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                                {content.streak}-day streak
                            </Text>
                        </View>
                        <View className="rounded-full bg-amber-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                                Goal {content.dailyGoalProgress}/{content.dailyGoalTarget}
                            </Text>
                        </View>
                    </View>
                    <View className="mt-6 flex-row flex-wrap gap-3">
                        <Button onPress={() => router.push('/settings')} title="Settings" variant="secondary" />
                    </View>
                </View>

                <View className="flex-row flex-wrap gap-4">
                    <View className="min-w-[160px] flex-1 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                        <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-500">Today</Text>
                        <Text className="mt-3 text-3xl font-semibold text-slate-900">
                            {content.dailyGoalProgress}/{content.dailyGoalTarget}
                        </Text>
                        <Text className="mt-2 text-sm leading-6 text-slate-600">
                            Sessions completed toward today&apos;s target.
                        </Text>
                    </View>
                    <View className="min-w-[160px] flex-1 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                        <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-600">Current level</Text>
                        <Text className="mt-3 text-3xl font-semibold text-slate-900">Level {content.xpLevel}</Text>
                        <Text className="mt-2 text-sm leading-6 text-slate-600">
                            Momentum from recent lessons, quizzes, and chat support.
                        </Text>
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <View className="flex-row items-start justify-between gap-4">
                        <View className="flex-1">
                            <Text className="text-2xl font-semibold text-slate-900">Subject focus</Text>
                            <Text className="mt-2 text-base leading-7 text-slate-600">
                                Keep the strongest subjects warm while giving growth areas deliberate attention.
                            </Text>
                        </View>
                        <Button onPress={() => router.push('/settings')} title="Settings" variant="ghost" />
                    </View>

                    <View className="mt-5 gap-4">
                        {content.subjects.length ? content.subjects.map((subject) => (
                            <View className="rounded-[28px] bg-slate-50 p-4" key={subject.subjectId}>
                                <View className="flex-row items-start justify-between gap-3">
                                    <View className="flex-1">
                                        <Text className="text-lg font-semibold text-slate-900">{subject.name}</Text>
                                        <Text className="mt-1 text-sm leading-6 text-slate-600">
                                            Last active {formatRelativeDate(subject.lastActiveAt)}
                                        </Text>
                                    </View>
                                    <View className={getStrengthBadgeClassName(subject.strengthLevel)}>
                                        <Text className={getStrengthTextClassName(subject.strengthLevel)}>
                                            {subject.strengthLevel.replace('_', ' ')}
                                        </Text>
                                    </View>
                                </View>
                                <Text className="mt-3 text-sm leading-6 text-slate-600">
                                    Priority in your queue: #{subject.priorityIndex + 1}
                                </Text>
                            </View>
                        )) : (
                            <Text className="text-base leading-7 text-slate-600">
                                No subjects have been added yet. Once onboarding or topic selection is complete, they will appear here with real strength signals.
                            </Text>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function getStrengthBadgeClassName(strengthLevel: string) {
    if (strengthLevel === 'strong') {
        return 'rounded-full bg-emerald-100 px-3 py-1';
    }

    if (strengthLevel === 'developing') {
        return 'rounded-full bg-amber-100 px-3 py-1';
    }

    return 'rounded-full bg-rose-100 px-3 py-1';
}

function getStrengthTextClassName(strengthLevel: string) {
    if (strengthLevel === 'strong') {
        return 'text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700';
    }

    if (strengthLevel === 'developing') {
        return 'text-xs font-semibold uppercase tracking-[0.16em] text-amber-800';
    }

    return 'text-xs font-semibold uppercase tracking-[0.16em] text-rose-700';
}
