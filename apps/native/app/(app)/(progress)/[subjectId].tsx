import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { SubjectDetailContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { formatPercent, formatRelativeDate } from '@/lib/formatters';
import { NativeAuthError, nativeApiFetch } from '@/lib/native-api';

export default function SubjectDetailScreen() {
    const router = useRouter();
    const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
    const [data, setData] = useState<SubjectDetailContent | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function loadSubject() {
            if (!subjectId) {
                setError(new Error('Missing subject id.'));
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const response = await nativeApiFetch<SubjectDetailContent>(ROUTES.PROGRESS.SUBJECT(subjectId));
                if (cancelled) return;
                setData(response);
            } catch (loadError) {
                if (cancelled) return;
                setData(null);
                setError(loadError instanceof Error ? loadError : new Error('Could not load subject detail.'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadSubject();
        return () => {
            cancelled = true;
        };
    }, [requestVersion, subjectId]);

    if (loading) {
        return <RoleFullScreenLoadingOverlay forceVisible />;
    }

    if (error || !data) {
        const isAuthError = error instanceof NativeAuthError;

        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle={isAuthError ? 'Back to home' : 'Try again'}
                        badge={isAuthError ? 'Sign in required' : 'Live data failed'}
                        description={error?.message ?? 'Something interrupted the subject request.'}
                        onActionPress={isAuthError ? () => router.push('/(app)/(home)') : () => setRequestVersion((v) => v + 1)}
                        title="Subject detail could not load"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const { subject } = data;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Subject detail</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">{subject.subjectName}</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        Live topic-level confidence mapped to native bars so you can see where to push next.
                    </Text>
                    <View className="mt-5 flex-row flex-wrap gap-2">
                        <Pill label={`${subject.totalLessons} lessons`} tone="indigo" />
                        <Pill label={`${subject.totalQuizzes} quizzes`} tone="sky" />
                        <Pill label={formatPercent(subject.averageScore)} tone="amber" />
                    </View>
                    <View className="mt-6 flex-row flex-wrap gap-3">
                        <Button
                            onPress={() =>
                                router.push({
                                    pathname: '/practice-exams/entry',
                                    params: { topic: subject.subjectName },
                                })
                            }
                            title="Practice subject"
                        />
                        <Button onPress={() => router.push('/progress')} title="Back to progress" variant="secondary" />
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Topic confidence</Text>
                    <Text className="mt-2 text-base leading-7 text-slate-600">
                        Each bar is a mobile-safe chart substitute showing confidence per topic.
                    </Text>

                    <View className="mt-5 gap-4">
                        {subject.topics.length ? subject.topics
                            .slice()
                            .sort((left, right) => right.score - left.score)
                            .map((topic) => (
                                <View className="rounded-[24px] bg-slate-50 p-4" key={topic.topic}>
                                    <View className="flex-row items-center justify-between">
                                        <Text className="text-base font-semibold text-slate-900">{topic.topic}</Text>
                                        <Text className="text-sm font-semibold text-slate-900">{topic.score}%</Text>
                                    </View>
                                    <Text className="mt-1 text-sm leading-6 text-slate-600">
                                        {topic.level.replace('_', ' ')} • Last tested {formatRelativeDate(topic.lastTestedAt)}
                                    </Text>
                                    <View className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                                        <View
                                            className={topicBarClass(topic.level)}
                                            style={{ width: `${Math.max(0, Math.min(100, topic.score))}%` }}
                                        />
                                    </View>
                                </View>
                            )) : (
                            <Text className="text-base leading-7 text-slate-600">
                                Topic-level confidence will appear once this subject has enough scored activity.
                            </Text>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function topicBarClass(level: 'confident' | 'getting_there' | 'needs_work') {
    if (level === 'confident') {
        return 'h-full rounded-full bg-emerald-500';
    }

    if (level === 'getting_there') {
        return 'h-full rounded-full bg-amber-500';
    }

    return 'h-full rounded-full bg-rose-500';
}

function Pill({ label, tone }: { label: string; tone: 'indigo' | 'sky' | 'amber' }) {
    const container = tone === 'indigo'
        ? 'rounded-full bg-indigo-100 px-3 py-1'
        : tone === 'sky'
            ? 'rounded-full bg-sky-100 px-3 py-1'
            : 'rounded-full bg-amber-100 px-3 py-1';
    const text = tone === 'indigo'
        ? 'text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700'
        : tone === 'sky'
            ? 'text-xs font-semibold uppercase tracking-[0.16em] text-sky-700'
            : 'text-xs font-semibold uppercase tracking-[0.16em] text-amber-800';

    return (
        <View className={container}>
            <Text className={text}>{label}</Text>
        </View>
    );
}
