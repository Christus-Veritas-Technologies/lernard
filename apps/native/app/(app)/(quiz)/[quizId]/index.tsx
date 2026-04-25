import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { QuizContent, QuizResultsContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { nativeApiFetch } from '@/lib/native-api';

interface AnswerState {
    selectedOption: string;
    isCorrect: boolean;
    feedback: string;
    submitted: boolean;
}

export default function QuizScreen() {
    const router = useRouter();
    const { quizId } = useLocalSearchParams<{ quizId: string }>();
    const { data, loading, error, refetch } = usePagePayload<QuizContent>(ROUTES.QUIZZES.GET(quizId));

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answerStates, setAnswerStates] = useState<Record<number, AnswerState>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice badge="Loading" description="Loading quiz questions." title="Loading quiz" />
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
                        badge="Error"
                        description={error?.message ?? 'Could not load this quiz.'}
                        onActionPress={refetch}
                        title="Quiz failed to load"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const { quiz } = data.content;
    const question = quiz.questions[currentIndex];
    const currentAnswer = answerStates[currentIndex];
    const answeredCount = Object.keys(answerStates).length;
    const isLastQuestion = currentIndex === quiz.questions.length - 1;

    async function handleAnswer(option: string, optionIndex: number) {
        if (currentAnswer?.submitted || isSubmitting) return;
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const result = await nativeApiFetch<{ questionId: string; isCorrect: boolean; feedback: string }>(
                ROUTES.QUIZZES.ANSWER(quizId),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questionId: String(currentIndex), answer: String(optionIndex) }),
                },
            );
            setAnswerStates((prev) => ({
                ...prev,
                [currentIndex]: { selectedOption: option, isCorrect: result.isCorrect, feedback: result.feedback, submitted: true },
            }));
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Failed to submit answer.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleComplete() {
        setIsCompleting(true);
        try {
            const results = await nativeApiFetch<QuizResultsContent>(ROUTES.QUIZZES.COMPLETE(quizId), { method: 'POST' });
            router.replace({
                pathname: '/quiz/[quizId]/results',
                params: {
                    quizId: results.quizId,
                    topic: results.topic,
                    subject: results.subject,
                    correct: String(results.score.correct),
                    total: String(results.score.total),
                    xp: String(results.xpEarned),
                },
            });
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Could not complete quiz.');
            setIsCompleting(false);
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-5">
                {/* Header */}
                <View className="gap-1">
                    <Text className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
                        {quiz.subject}
                    </Text>
                    <Text className="text-xl font-semibold text-foreground">{quiz.topic}</Text>
                    <Text className="text-sm text-muted-foreground">
                        Q{currentIndex + 1} of {quiz.questions.length}
                    </Text>
                </View>

                {/* Progress */}
                <View className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <View
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${quiz.questions.length > 0 ? Math.round((answeredCount / quiz.questions.length) * 100) : 0}%` }}
                    />
                </View>

                {/* Question card */}
                <View className="rounded-[28px] border border-slate-200 bg-white p-5 gap-4">
                    <Text className="text-lg font-semibold leading-7 text-foreground">{question.question}</Text>

                    <View className="gap-2">
                        {(question.options ?? []).map((option, i) => {
                            const isSelected = currentAnswer?.selectedOption === option;
                            return (
                                <Pressable
                                    className={`rounded-2xl border px-4 py-3 ${currentAnswer?.submitted && isSelected && currentAnswer.isCorrect
                                            ? 'border-green-400 bg-green-50'
                                            : currentAnswer?.submitted && isSelected && !currentAnswer.isCorrect
                                                ? 'border-red-300 bg-red-50'
                                                : 'border-slate-200 bg-slate-50'
                                        }`}
                                    disabled={!!currentAnswer?.submitted || isSubmitting}
                                    key={String(i)}
                                    onPress={() => void handleAnswer(option, i)}
                                >
                                    <Text className="text-sm text-foreground">
                                        {String.fromCharCode(65 + i)}. {option}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {currentAnswer?.submitted ? (
                        <View className="gap-1">
                            <Text className={`text-sm font-semibold ${currentAnswer.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                {currentAnswer.isCorrect ? 'Correct!' : 'Not quite.'}
                            </Text>
                            {currentAnswer.feedback ? (
                                <Text className="text-sm leading-6 text-muted-foreground">{currentAnswer.feedback}</Text>
                            ) : null}
                        </View>
                    ) : null}
                </View>

                {submitError ? <Text className="text-sm text-red-600">{submitError}</Text> : null}

                {currentAnswer?.submitted ? (
                    <View>
                        {!isLastQuestion ? (
                            <Button
                                onPress={() => setCurrentIndex((i) => i + 1)}
                                title="Next question →"
                            />
                        ) : (
                            <Button
                                disabled={isCompleting}
                                onPress={() => void handleComplete()}
                                title={isCompleting ? 'Finishing…' : 'See results →'}
                            />
                        )}
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}
