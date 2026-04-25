import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { Quiz } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { nativeApiFetch } from '@/lib/native-api';

export default function QuizEntryScreen() {
    const router = useRouter();
    const [topic, setTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);

    async function handleGenerate() {
        const finalTopic = topic.trim();
        if (!finalTopic) return;
        setIsGenerating(true);
        setGenerateError(null);
        try {
            const quiz = await nativeApiFetch<Quiz>(ROUTES.QUIZZES.GENERATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: finalTopic,
                    idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                }),
            });
            router.push(`/quiz/${quiz.id}`);
        } catch (e) {
            setGenerateError(e instanceof Error ? e.message : 'Could not generate quiz. Try again.');
        } finally {
            setIsGenerating(false);
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="flex-1 px-4 pb-24 pt-12 gap-6">
                <View className="gap-2">
                    <Text className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
                        Quiz studio
                    </Text>
                    <Text className="text-3xl font-semibold text-foreground">Test what you know</Text>
                    <Text className="text-base leading-7 text-muted-foreground">
                        Generate a 10-question quiz on any topic. Lernard sets the difficulty to your level.
                    </Text>
                </View>

                <TextInput
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
                    maxLength={300}
                    onChangeText={setTopic}
                    placeholder="What do you want to be tested on?"
                    placeholderTextColor="#94a3b8"
                    value={topic}
                />

                {generateError ? (
                    <Text className="text-sm text-red-600">{generateError}</Text>
                ) : null}

                <Button
                    disabled={isGenerating || !topic.trim()}
                    onPress={() => void handleGenerate()}
                    title={isGenerating ? 'Generating quiz…' : 'Start quiz →'}
                />
            </View>
        </SafeAreaView>
    );
}
