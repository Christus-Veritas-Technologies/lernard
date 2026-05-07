import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { nativeApiFetch } from '@/lib/native-api';

const COUNTS = [5, 10, 15] as const;

export default function QuizEntryScreen() {
  const { lessonId, topic: initialTopic } = useLocalSearchParams<{ lessonId?: string; topic?: string }>();
  const router = useRouter();

  const [topic, setTopic] = useState(initialTopic ?? '');
  const [questionCount, setQuestionCount] = useState<5 | 10 | 15>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await nativeApiFetch<{ quizId: string }>(ROUTES.QUIZZES.GENERATE, {
        method: 'POST',
        body: JSON.stringify({
          topic: topic.trim(),
          questionCount,
          idempotencyKey: Math.random().toString(36).slice(2),
          fromLessonId: lessonId || undefined,
        }),
      });
      router.replace({ pathname: '/quiz/[quizId]', params: { quizId: response.quizId } });
    } catch {
      setError('Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center border-b border-slate-100 px-4 py-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-base font-medium text-indigo-600">← Back</Text>
        </TouchableOpacity>
        <Text className="ml-4 text-base font-semibold text-slate-900">New Quiz</Text>
      </View>

      <View className="flex-1 px-4 pt-6 space-y-5">
        {lessonId && initialTopic ? (
          <View className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
            <Text className="text-xs font-medium text-indigo-700">From lesson: {initialTopic}</Text>
          </View>
        ) : null}

        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">Topic</Text>
          <TextInput
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
            multiline
            numberOfLines={3}
            onChangeText={setTopic}
            placeholder="e.g. CORS, photosynthesis, quadratic equations"
            placeholderTextColor="#94a3b8"
            value={topic}
          />
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">Number of questions</Text>
          <View className="flex-row gap-3">
            {COUNTS.map((n) => (
              <TouchableOpacity
                key={n}
                className={`flex-1 items-center rounded-xl border py-3 ${questionCount === n ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                onPress={() => setQuestionCount(n)}
              >
                <Text className={`font-semibold ${questionCount === n ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

        <Button
          disabled={loading || !topic.trim()}
          onPress={generate}
          title={loading ? 'Generating…' : 'Generate Quiz'}
        />
      </View>
    </SafeAreaView>
  );
}
