import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookOpen01Icon, CheckmarkCircle02Icon } from 'hugeicons-react-native';

import { Text } from '@rnr/text';

import {
    useNativeFirstLookSkip,
    useNativeFirstLookStart,
    useNativeFirstLookSubmit,
} from '@/hooks/useAuthMutations';
import type { FirstLookQuestion } from '@lernard/shared-types';

export default function FirstLookScreen() {
    const router = useRouter();
    const startHook = useNativeFirstLookStart();
    const submitHook = useNativeFirstLookSubmit();
    const skipHook = useNativeFirstLookSkip();

    const [questions, setQuestions] = useState<FirstLookQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [result, setResult] = useState<{ score: number; total: number } | null>(null);

    useEffect(() => {
        void startHook.fetch().then((data) => {
            if (data) setQuestions(data.questions);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const current = questions[currentIndex];
    const isLast = currentIndex === questions.length - 1;
    const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i] !== undefined);

    function selectAnswer(answer: string) {
        setAnswers((prev) => ({ ...prev, [currentIndex]: answer }));
    }

    async function handleSubmit() {
        const payload = {
            answers: Object.entries(answers).map(([index, answer]) => ({
                index: Number(index),
                answer,
            })),
        };
        await submitHook.mutate(payload, {
            onSuccess: (data) => {
                setResult({ score: data.score, total: data.totalQuestions });
            },
        });
    }

    async function handleSkip() {
        await skipHook.mutate({
            onSuccess: () => router.replace('/(app)/(home)'),
        });
    }

    // Loading state
    if (startHook.isLoading) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-slate-50" edges={['top']}>
                <View className="gap-4 px-8">
                    {[0, 1, 2, 3].map((i) => (
                        <View key={i} className="h-12 w-full animate-pulse rounded-2xl bg-slate-200" />
                    ))}
                </View>
            </SafeAreaView>
        );
    }

    // Error or no questions
    if (startHook.error || questions.length === 0) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
                <View className="flex-1 items-center justify-center gap-6 px-7">
                    <Text className="text-center text-xl font-bold text-slate-900">First Look</Text>
                    <Text className="text-center text-base leading-7 text-slate-500">
                        We couldn&apos;t generate your questions right now.
                    </Text>
                    <TouchableOpacity
                        onPress={handleSkip}
                        disabled={skipHook.isLoading}
                        className="h-14 w-full items-center justify-center rounded-[24px] bg-primary-500"
                        activeOpacity={0.8}
                    >
                        <Text className="text-base font-bold text-white">
                            {skipHook.isLoading ? 'Skippingâ€¦' : 'Skip and go to Lernard'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Result screen
    if (result) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
                <View className="flex-1 items-center justify-center gap-6 px-7">
                    <View className="h-20 w-20 items-center justify-center rounded-full bg-green-100">
                        <CheckmarkCircle02Icon size={40} color="#4CAF7D" />
                    </View>
                    <View className="gap-2">
                        <Text className="text-center text-2xl font-bold text-slate-900">
                            First Look complete!
                        </Text>
                        <Text className="text-center text-base leading-7 text-slate-500">
                            You scored {result.score}/{result.total}. Lernard knows where to start.
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.replace('/(app)/(home)')}
                        className="h-14 w-full items-center justify-center rounded-[24px] bg-primary-500"
                        activeOpacity={0.8}
                    >
                        <Text className="text-base font-bold text-white">Go to Lernard</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
            <ScrollView
                className="flex-1"
                contentContainerClassName="px-5 pb-8 pt-6 gap-6"
                keyboardShouldPersistTaps="handled"
            >
                {/* Step header */}
                <View className="gap-2">
                    <View className="flex-row items-center gap-2">
                        <View className="h-1.5 w-6 rounded-full bg-primary-200" />
                        <View className="h-px flex-1 bg-primary-200" />
                        <View className="rounded-full bg-primary-500 px-3 py-1">
                            <Text className="text-xs font-bold text-white">Step 2 of 2</Text>
                        </View>
                    </View>
                    <View className="flex-row items-end justify-between">
                        <View className="gap-0.5">
                            <Text className="text-3xl font-bold text-slate-900">First Look</Text>
                            <Text className="text-sm text-slate-500">A quick quiz to set your baseline.</Text>
                        </View>
                        <View className="flex-row items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1.5">
                            <BookOpen01Icon size={14} color="#4F62A3" />
                            <Text className="text-xs font-semibold text-primary-700">
                                {currentIndex + 1}/{questions.length}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Progress bar */}
                <View className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <View
                        className="h-full rounded-full bg-primary-500"
                        // eslint-disable-next-line react-native/no-inline-styles
                        style={{ width: `${progressPercent}%` }}
                    />
                </View>

                {/* Question card */}
                <View className="gap-3 overflow-hidden rounded-[24px] bg-white p-5 shadow-sm">
                    <View className="self-start rounded-full bg-primary-100 px-3 py-1">
                        <Text className="text-xs font-bold uppercase tracking-wider text-primary-700">
                            {current.subject}
                        </Text>
                    </View>
                    <Text className="text-lg font-semibold leading-7 text-slate-900">
                        {current.question}
                    </Text>
                </View>

                {/* Options */}
                <View className="gap-2">
                    {current.options.map((option) => {
                        const isSelected = answers[currentIndex] === option;
                        return (
                            <TouchableOpacity
                                key={option}
                                onPress={() => selectAnswer(option)}
                                activeOpacity={0.8}
                                className={`flex-row items-center gap-3 rounded-2xl border p-4 ${isSelected
                                        ? 'border-primary bg-primary-50'
                                        : 'border-slate-200 bg-white'
                                    }`}
                            >
                                <View
                                    className={`h-4 w-4 rounded-full border-2 ${isSelected ? 'border-primary bg-primary' : 'border-slate-300'
                                        }`}
                                />
                                <Text
                                    className={`flex-1 text-sm ${isSelected ? 'font-semibold text-primary' : 'text-slate-700'
                                        }`}
                                >
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Nav */}
                <View className="flex-row gap-2">
                    {currentIndex > 0 && (
                        <TouchableOpacity
                            onPress={() => setCurrentIndex((i) => i - 1)}
                            className="h-14 flex-1 items-center justify-center rounded-[24px] border border-slate-200 bg-white"
                            activeOpacity={0.8}
                        >
                            <Text className="text-sm font-semibold text-slate-700">Back</Text>
                        </TouchableOpacity>
                    )}
                    {isLast ? (
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={!allAnswered || submitHook.isLoading}
                            className="h-14 flex-1 items-center justify-center rounded-[24px] bg-primary-500"
                            style={{ opacity: !allAnswered || submitHook.isLoading ? 0.5 : 1 }}
                            activeOpacity={0.8}
                        >
                            <Text className="text-sm font-bold text-white">
                                {submitHook.isLoading ? 'Submittingâ€¦' : 'Submit answers'}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={() => setCurrentIndex((i) => i + 1)}
                            disabled={!answers[currentIndex]}
                            className="h-14 flex-1 items-center justify-center rounded-[24px] bg-primary-500"
                            style={{ opacity: !answers[currentIndex] ? 0.5 : 1 }}
                            activeOpacity={0.8}
                        >
                            <Text className="text-sm font-bold text-white">Next</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity onPress={handleSkip} disabled={skipHook.isLoading}>
                    <Text className="text-center text-sm text-slate-400">
                        {skipHook.isLoading ? 'Skippingâ€¦' : 'Skip First Look'}
                    </Text>
                </TouchableOpacity>

                {(submitHook.error ?? skipHook.error) ? (
                    <Text className="text-center text-sm text-red-500">
                        {submitHook.error ?? skipHook.error}
                    </Text>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}
