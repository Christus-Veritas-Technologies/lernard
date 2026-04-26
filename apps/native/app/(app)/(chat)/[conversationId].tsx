import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { ConversationContent, Lesson, Quiz } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { StateNotice } from '@/components/StateNotice';
import { formatRelativeDate } from '@/lib/formatters';
import { NativeAuthError, nativeApiFetch } from '@/lib/native-api';

interface SendMessageRequest {
    message: string;
    idempotencyKey: string;
}

export default function ConversationScreen() {
    const router = useRouter();
    const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
    const [data, setData] = useState<ConversationContent | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    const [requestVersion, setRequestVersion] = useState(0);
    const [messageDraft, setMessageDraft] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isConverting, setIsConverting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadConversation() {
            if (!conversationId) {
                setError(new Error('Missing conversation id.'));
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const response = await nativeApiFetch<ConversationContent>(ROUTES.CHAT.CONVERSATION(conversationId));
                if (cancelled) return;
                setData(response);
            } catch (loadError) {
                if (cancelled) return;
                setData(null);
                setError(loadError instanceof Error ? loadError : new Error('Could not load this conversation.'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadConversation();
        return () => {
            cancelled = true;
        };
    }, [conversationId, requestVersion]);

    async function sendMessage() {
        const message = messageDraft.trim();
        if (!message) {
            return;
        }

        setIsSending(true);
        setError(null);

        try {
            const request: SendMessageRequest = {
                message,
                idempotencyKey: createUuidV4(),
            };

            const response = await nativeApiFetch<ConversationContent>(ROUTES.CHAT.MESSAGE, {
                method: 'POST',
                body: JSON.stringify(request),
            });

            setData(response);
            setMessageDraft('');
        } catch (sendError) {
            setError(sendError instanceof Error ? sendError : new Error('Could not send your message.'));
        } finally {
            setIsSending(false);
        }
    }

    async function convertConversation(type: 'lesson' | 'quiz') {
        if (!conversationId) {
            return;
        }

        setIsConverting(true);
        setError(null);

        try {
            if (type === 'lesson') {
                const lesson = await nativeApiFetch<Lesson>(ROUTES.CHAT.TO_LESSON(conversationId), {
                    method: 'POST',
                });
                router.push(`/learn/${lesson.id}`);
                return;
            }

            const quiz = await nativeApiFetch<Quiz>(ROUTES.CHAT.TO_QUIZ(conversationId), {
                method: 'POST',
            });
            router.push(`/quiz/${quiz.id}`);
        } catch (convertError) {
            setError(convertError instanceof Error ? convertError : new Error('Could not convert this conversation.'));
        } finally {
            setIsConverting(false);
        }
    }

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Loading"
                        description="Pulling this thread and its recent message history."
                        title="Opening conversation"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (error && !data) {
        const isAuthError = error instanceof NativeAuthError;

        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle={isAuthError ? 'Back to home' : 'Try again'}
                        badge={isAuthError ? 'Sign in required' : 'Thread failed to load'}
                        description={error.message}
                        onActionPress={isAuthError ? () => router.push('/home') : () => setRequestVersion((v) => v + 1)}
                        title="Conversation unavailable"
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
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Conversation</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">
                        {data?.conversation.title ?? 'Untitled conversation'}
                    </Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        Last active {formatRelativeDate(data?.conversation.lastMessageAt ?? null)}.
                    </Text>
                    <View className="mt-6 flex-row flex-wrap gap-3">
                        <Button
                            disabled={isConverting}
                            onPress={() => void convertConversation('lesson')}
                            title={isConverting ? 'Working...' : 'Turn into lesson'}
                            variant="secondary"
                        />
                        <Button
                            disabled={isConverting}
                            onPress={() => void convertConversation('quiz')}
                            title={isConverting ? 'Working...' : 'Turn into quiz'}
                        />
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Thread</Text>
                    <View className="mt-5 gap-4">
                        {data?.messages.length ? data.messages.map((message) => (
                            <View
                                className={message.role === 'assistant' ? 'self-start max-w-[92%] rounded-[24px] bg-indigo-50 p-4' : 'self-end max-w-[92%] rounded-[24px] bg-slate-100 p-4'}
                                key={message.id}
                            >
                                <Text className={message.role === 'assistant' ? 'text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700' : 'text-xs font-semibold uppercase tracking-[0.16em] text-slate-700'}>
                                    {message.role === 'assistant' ? 'Lernard' : 'You'}
                                </Text>
                                <Text className="mt-2 text-base leading-7 text-slate-900">{message.content}</Text>
                                <Text className="mt-2 text-xs text-slate-500">{formatRelativeDate(message.createdAt)}</Text>
                            </View>
                        )) : (
                            <Text className="text-base leading-7 text-slate-600">
                                No messages yet in this thread.
                            </Text>
                        )}
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Send a message</Text>
                    <TextInput
                        className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
                        maxLength={2000}
                        multiline
                        onChangeText={setMessageDraft}
                        placeholder="Ask Lernard anything about your current topic..."
                        placeholderTextColor="#94a3b8"
                        value={messageDraft}
                    />
                    {error ? <Text className="mt-3 text-sm text-rose-600">{error.message}</Text> : null}
                    <View className="mt-4 flex-row flex-wrap gap-3">
                        <Button
                            disabled={isSending || !messageDraft.trim()}
                            onPress={() => void sendMessage()}
                            title={isSending ? 'Sending...' : 'Send message'}
                        />
                        <Button onPress={() => router.push('/chat')} title="Back to list" variant="secondary" />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function createUuidV4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const random = Math.random() * 16 | 0;
        const value = char === 'x' ? random : ((random & 0x3) | 0x8);
        return value.toString(16);
    });
}
