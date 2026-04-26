import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { SessionHistoryContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { StateNotice } from '@/components/StateNotice';
import { formatMinutes, formatRelativeDate } from '@/lib/formatters';
import { NativeAuthError, nativeApiFetch } from '@/lib/native-api';

export default function HistoryScreen() {
    const router = useRouter();
    const [history, setHistory] = useState<SessionHistoryContent | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function loadHistory() {
            setLoading(true);
            setError(null);

            try {
                const initial = await nativeApiFetch<SessionHistoryContent>(ROUTES.PROGRESS.HISTORY);
                if (cancelled) return;
                setHistory(initial);
            } catch (loadError) {
                if (cancelled) return;
                setHistory(null);
                setError(loadError instanceof Error ? loadError : new Error('Could not load session history.'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadHistory();
        return () => {
            cancelled = true;
        };
    }, [requestVersion]);

    async function loadMore() {
        if (!history?.hasMore || !history.cursor || loadingMore) {
            return;
        }

        setLoadingMore(true);
        try {
            const next = await nativeApiFetch<SessionHistoryContent>(`${ROUTES.PROGRESS.HISTORY}?cursor=${encodeURIComponent(history.cursor)}`);
            setHistory((current) => {
                if (!current) {
                    return next;
                }

                return {
                    sessions: [...current.sessions, ...next.sessions],
                    cursor: next.cursor,
                    hasMore: next.hasMore,
                };
            });
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError : new Error('Could not load more sessions.'));
        } finally {
            setLoadingMore(false);
        }
    }

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Loading"
                        description="Pulling your recent lesson and quiz timeline from backend history."
                        title="Building session history"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !history) {
        const isAuthError = error instanceof NativeAuthError;

        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle={isAuthError ? 'Back to home' : 'Try again'}
                        badge={isAuthError ? 'Sign in required' : 'Live history failed'}
                        description={error?.message ?? 'Something interrupted the history request.'}
                        onActionPress={isAuthError ? () => router.push('/home') : () => setRequestVersion((v) => v + 1)}
                        title="Session history could not load"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Session history</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">Every recent learning session</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        A live timeline of lessons and quizzes with duration, XP, and subject context.
                    </Text>
                    <View className="mt-6 flex-row flex-wrap gap-3">
                        <Button onPress={() => router.push('/progress')} title="Back to progress" variant="secondary" />
                        <Button onPress={() => router.push('/learn')} title="Start new lesson" />
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Timeline</Text>
                    <Text className="mt-2 text-base leading-7 text-slate-600">
                        Ordered newest first, with cursor pagination from the backend.
                    </Text>

                    <View className="mt-5 gap-4">
                        {history.sessions.length ? history.sessions.map((session) => (
                            <View className="rounded-[28px] bg-slate-50 p-4" key={session.id}>
                                <View className="flex-row items-start justify-between gap-3">
                                    <View className="flex-1">
                                        <Text className="text-base font-semibold text-slate-900">
                                            {session.subject} • {session.topic}
                                        </Text>
                                        <Text className="mt-1 text-sm leading-6 text-slate-600">
                                            {session.type === 'lesson' ? 'Lesson' : 'Quiz'} • {formatMinutes(session.duration)} • {session.xpEarned} XP
                                        </Text>
                                    </View>
                                    <View className={session.type === 'lesson' ? 'rounded-full bg-indigo-100 px-3 py-1' : 'rounded-full bg-emerald-100 px-3 py-1'}>
                                        <Text className={session.type === 'lesson' ? 'text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700' : 'text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700'}>
                                            {session.type}
                                        </Text>
                                    </View>
                                </View>
                                <Text className="mt-2 text-sm leading-6 text-slate-500">{formatRelativeDate(session.createdAt)}</Text>
                            </View>
                        )) : (
                            <Text className="text-base leading-7 text-slate-600">
                                No sessions recorded yet. Complete a lesson or quiz and it will appear here.
                            </Text>
                        )}
                    </View>

                    {history.hasMore ? (
                        <Button
                            className="mt-5"
                            disabled={loadingMore}
                            onPress={() => void loadMore()}
                            title={loadingMore ? 'Loading more...' : 'Load more sessions'}
                            variant="secondary"
                        />
                    ) : null}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
