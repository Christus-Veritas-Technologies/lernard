import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { Conversation } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { StateNotice } from '@/components/StateNotice';
import { formatRelativeDate } from '@/lib/formatters';
import { NativeAuthError, nativeApiFetch } from '@/lib/native-api';

interface ConversationsResponse {
    conversations: Conversation[];
    cursor: string | null;
    hasMore: boolean;
}

export default function ChatListScreen() {
    const router = useRouter();
    const [data, setData] = useState<ConversationsResponse | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function loadConversations() {
            setLoading(true);
            setError(null);

            try {
                const initial = await nativeApiFetch<ConversationsResponse>(ROUTES.CHAT.CONVERSATIONS);
                if (cancelled) return;
                setData(initial);
            } catch (loadError) {
                if (cancelled) return;
                setData(null);
                setError(loadError instanceof Error ? loadError : new Error('Could not load chat conversations.'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadConversations();
        return () => {
            cancelled = true;
        };
    }, [requestVersion]);

    async function loadMore() {
        if (!data?.hasMore || !data.cursor || loadingMore) {
            return;
        }

        setLoadingMore(true);
        try {
            const next = await nativeApiFetch<ConversationsResponse>(`${ROUTES.CHAT.CONVERSATIONS}?cursor=${encodeURIComponent(data.cursor)}`);
            setData((current) => {
                if (!current) return next;

                return {
                    conversations: [...current.conversations, ...next.conversations],
                    cursor: next.cursor,
                    hasMore: next.hasMore,
                };
            });
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError : new Error('Could not load more conversations.'));
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
                        description="Pulling your live Lernard conversation history."
                        title="Building chat"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !data) {
        const isAuthError = error instanceof NativeAuthError;

        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle={isAuthError ? 'Back to home' : 'Try again'}
                        badge={isAuthError ? 'Sign in required' : 'Chat failed to load'}
                        description={error?.message ?? 'Something interrupted chat loading.'}
                        onActionPress={isAuthError ? () => router.push('/home') : () => setRequestVersion((v) => v + 1)}
                        title="Chat is unavailable right now"
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
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Guide + Companion</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">Live conversation history</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        Reopen any thread, continue learning, then turn the conversation into a lesson or quiz.
                    </Text>
                    <View className="mt-6 flex-row flex-wrap gap-3">
                        <Button onPress={() => router.push('/learn')} title="Start learning" />
                        <Button onPress={() => router.push('/home')} title="Back to home" variant="secondary" />
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Conversations</Text>
                    <Text className="mt-2 text-base leading-7 text-slate-600">
                        Ordered by most recently active, backed by cursor pagination.
                    </Text>

                    <View className="mt-5 gap-4">
                        {data.conversations.length ? data.conversations.map((conversation) => (
                            <View className="rounded-[28px] bg-slate-50 p-4" key={conversation.id}>
                                <Text className="text-base font-semibold text-slate-900">{conversation.title ?? 'Untitled conversation'}</Text>
                                <Text className="mt-1 text-sm leading-6 text-slate-600">
                                    {conversation.messageCount} messages • Last active {formatRelativeDate(conversation.lastMessageAt)}
                                </Text>
                                <View className="mt-4 flex-row flex-wrap gap-3">
                                    <Button
                                        onPress={() => router.push(`/chat/${conversation.id}`)}
                                        title="Open"
                                        variant="secondary"
                                    />
                                </View>
                            </View>
                        )) : (
                            <Text className="text-base leading-7 text-slate-600">
                                No conversations yet. Open any thread and send your first question to Lernard.
                            </Text>
                        )}
                    </View>

                    {data.hasMore ? (
                        <Button
                            className="mt-5"
                            disabled={loadingMore}
                            onPress={() => void loadMore()}
                            title={loadingMore ? 'Loading more...' : 'Load more conversations'}
                            variant="secondary"
                        />
                    ) : null}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
