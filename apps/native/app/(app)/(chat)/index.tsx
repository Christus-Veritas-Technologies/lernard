import { ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    BookOpen01Icon,
    BulbIcon,
    MessageQuestion01Icon,
    Send01Icon,
} from 'hugeicons-react-native';

import { Text } from '@rnr/text';

const suggestions = [
    {
        Icon: BookOpen01Icon,
        label: 'Explain a topic',
        detail: 'Ask Lernard to break down anything from your subjects.',
    },
    {
        Icon: BulbIcon,
        label: 'Help me understand',
        detail: 'Stuck on a concept? Lernard will guide you step by step.',
    },
    {
        Icon: MessageQuestion01Icon,
        label: 'Quiz me',
        detail: 'Ask for a quick quiz on what you are studying right now.',
    },
] as const;

export default function ChatScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
            {/* Header */}
            <View className="h-14 items-center justify-center border-b border-border px-4">
                <Text className="text-lg font-semibold text-text-primary">Chat</Text>
            </View>

            {/* Empty state */}
            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 24,
                    paddingVertical: 48,
                    gap: 32,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Logo mark */}
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500 shadow-sm">
                    <MessageQuestion01Icon color="#ffffff" size={32} />
                </View>

                {/* Heading */}
                <View className="items-center gap-2">
                    <Text className="text-2xl font-semibold text-text-primary">Ask Lernard anything</Text>
                    <Text className="text-center text-sm leading-5 text-text-secondary">
                        Your personal tutor is almost here. Full chat conversations are in development.
                    </Text>
                </View>

                {/* Suggestion cards */}
                <View className="w-full gap-3">
                    {suggestions.map(({ detail, Icon, label }) => (
                        <View
                            key={label}
                            className="flex-row items-start gap-3 rounded-2xl border border-border bg-surface p-4 opacity-60"
                        >
                            <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-xl bg-indigo-100">
                                <Icon color="#4f46e5" size={18} />
                            </View>
                            <View className="flex-1 gap-0.5">
                                <Text className="text-sm font-semibold text-text-primary">{label}</Text>
                                <Text className="text-xs leading-4 text-text-secondary">{detail}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Disabled input bar */}
            <View className="border-t border-border bg-surface px-4 py-3">
                <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 opacity-50">
                    <TextInput
                        className="flex-1 text-sm text-text-primary"
                        editable={false}
                        placeholder="Chat is coming soon…"
                        placeholderTextColor="#94a3b8"
                    />
                    <View className="h-8 w-8 items-center justify-center rounded-xl bg-indigo-200">
                        <Send01Icon color="#818cf8" size={16} />
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}
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
