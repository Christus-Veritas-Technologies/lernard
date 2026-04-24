import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { can } from '@lernard/auth-core';
import { ROUTES } from '@lernard/routes';
import type { LearnContent } from '@lernard/shared-types';

import { Button } from '@/components/Button';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { formatDepthLabel, formatMinutes } from '@/lib/formatters';

export default function TopicEntryScreen() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<LearnContent>(
        ROUTES.LEARN.PAYLOAD,
    );

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Sign in required"
                        description="Lernard can only load your live recommendations and drafts on mobile after you sign in."
                        title="Lesson studio needs your session"
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
                        description="Pulling your live recommendations, draft lessons, and preferred session defaults."
                        title="Building the lesson studio"
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
                        title="Learn could not load right now"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const { content, permissions } = data;
    const topRecommendation = content.recommendations[0] ?? null;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Lesson studio</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">Build the right lesson for right now</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        Generate a lesson from scratch, jump into a recommended topic, or reopen a draft without losing your flow.
                    </Text>
                    <View className="mt-5 flex-row flex-wrap gap-2">
                        {content.focusTopic ? (
                            <View className="rounded-full bg-amber-100 px-3 py-1">
                                <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                                    Focus area: {content.focusTopic}
                                </Text>
                            </View>
                        ) : null}
                        <View className="rounded-full bg-sky-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                                {formatDepthLabel(content.preferredDepth)}
                            </Text>
                        </View>
                    </View>
                    <View className="mt-6 flex-row flex-wrap gap-3">
                        <Button
                            disabled={!can(permissions, 'can_start_lesson')}
                            title="Generate lesson"
                        />
                        <Button
                            onPress={() => topRecommendation ? router.push('/settings') : router.push('/home')}
                            title={topRecommendation ? 'Tune defaults' : 'Go back home'}
                            variant="secondary"
                        />
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Tonight&apos;s best next step</Text>
                    <Text className="mt-2 text-base leading-7 text-slate-600">
                        {topRecommendation ? topRecommendation.reason : 'Your next recommendation will appear here as soon as Lernard has enough signal to rank one.'}
                    </Text>
                    {topRecommendation ? (
                        <View className="mt-5 rounded-[28px] bg-slate-50 p-4">
                            <Text className="text-lg font-semibold text-slate-900">{topRecommendation.topic}</Text>
                            <Text className="mt-1 text-sm leading-6 text-slate-600">{topRecommendation.subject}</Text>
                            <Text className="mt-3 text-sm leading-6 text-slate-600">
                                {formatDepthLabel(topRecommendation.depth)} • {formatMinutes(topRecommendation.estimatedMinutes)}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Recommended quick starts</Text>
                    <Text className="mt-2 text-base leading-7 text-slate-600">
                        Lessons Lernard can spin up fastest based on your recent work.
                    </Text>
                    <View className="mt-5 gap-4">
                        {content.recommendations.length ? content.recommendations.map((recommendation) => (
                            <View className="rounded-[28px] bg-slate-50 p-4" key={`${recommendation.subject}-${recommendation.topic}`}>
                                <Text className="text-lg font-semibold text-slate-900">{recommendation.topic}</Text>
                                <Text className="mt-1 text-sm leading-6 text-slate-600">{recommendation.reason}</Text>
                                <View className="mt-3 flex-row flex-wrap gap-2">
                                    <View className="rounded-full bg-sky-100 px-3 py-1">
                                        <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                                            {recommendation.subject}
                                        </Text>
                                    </View>
                                    <View className="rounded-full bg-indigo-100 px-3 py-1">
                                        <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                                            {formatDepthLabel(recommendation.depth)}
                                        </Text>
                                    </View>
                                    <View className="rounded-full bg-amber-100 px-3 py-1">
                                        <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                                            {formatMinutes(recommendation.estimatedMinutes)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )) : (
                            <Text className="text-base leading-7 text-slate-600">
                                No recommendations are ready yet. Generate a lesson below and Lernard will start learning your rhythm.
                            </Text>
                        )}
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Unfinished and saved lessons</Text>
                    <Text className="mt-2 text-base leading-7 text-slate-600">
                        Jump back into anything paused before you lose the thread.
                    </Text>
                    <View className="mt-5 gap-4">
                        {content.drafts.length ? content.drafts.map((draft) => (
                            <View className="rounded-[28px] bg-slate-50 p-4" key={draft.id}>
                                <Text className="text-lg font-semibold text-slate-900">{draft.subject} • {draft.topic}</Text>
                                <Text className="mt-1 text-sm leading-6 text-slate-600">{draft.status}</Text>
                                <Text className="mt-2 text-sm leading-6 text-slate-500">{draft.nextStep}</Text>
                                <Button
                                    className="mt-4 self-start"
                                    onPress={() => router.push(`/learn/${draft.id}`)}
                                    title="Resume draft"
                                    variant="secondary"
                                />
                            </View>
                        )) : (
                            <Text className="text-base leading-7 text-slate-600">
                                You do not have any unfinished lessons right now. Fresh starts will appear here once you save or pause one.
                            </Text>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
