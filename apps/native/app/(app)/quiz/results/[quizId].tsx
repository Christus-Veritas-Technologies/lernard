import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { QuizCompletionResult } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { nativeApiFetch } from '@/lib/native-api';

export default function QuizResultsScreen() {
  const { quizId } = useLocalSearchParams<{ quizId: string }>();
  const router = useRouter();

  const [result, setResult] = useState<QuizCompletionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void nativeApiFetch<QuizCompletionResult>(ROUTES.QUIZZES.COMPLETE(quizId), { method: 'POST' })
      .then(setResult)
      .catch(() => setError('Could not load results.'))
      .finally(() => setLoading(false));
  }, [quizId]);

  if (loading) {
    return <RoleFullScreenLoadingOverlay forceVisible />;
  }

  if (error || !result) {
    return (
      <SafeAreaView className="flex-1 bg-white px-4 pt-6">
        <Text className="text-base text-red-600">{error ?? 'Results unavailable.'}</Text>
      </SafeAreaView>
    );
  }

  const percentage = Math.round((result.score / Math.max(result.totalQuestions, 1)) * 100);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Score card */}
        <View className="mx-4 mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <Text className="mb-4 text-sm font-semibold text-slate-900">{result.debriefText}</Text>
          {/* Progress bar */}
          <View className="mb-2 h-2 w-full rounded-full bg-slate-200">
            <View
              className="h-2 rounded-full bg-indigo-500"
              style={{ width: `${percentage}%` }}
            />
          </View>
          <Text className="mb-3 text-sm text-slate-600">
            {result.score} of {result.totalQuestions} correct
          </Text>
          <View className="self-start rounded-full bg-green-100 px-3 py-1">
            <Text className="text-xs font-semibold text-green-700">+{result.xpEarned} XP</Text>
          </View>
        </View>

        {/* Question review */}
        <View className="mx-4 mt-5">
          <Text className="mb-3 text-base font-semibold text-slate-900">Question Review</Text>
          {result.questions.map((q, index) => {
            const borderColor =
              q.evaluationResult === 'correct' || q.isCorrect
                ? 'border-green-100 bg-green-50'
                : q.evaluationResult === 'partial'
                  ? 'border-amber-100 bg-amber-50'
                  : 'border-red-100 bg-red-50';
            return (
              <View key={index} className={`mb-3 rounded-2xl border p-4 ${borderColor}`}>
                <View className="flex-row items-start justify-between mb-1">
                  <Text className="flex-1 text-sm font-semibold text-slate-900">
                    {index + 1}. {q.text}
                  </Text>
                </View>
                {q.subtopic ? (
                  <View className="mb-1 self-start rounded-full bg-slate-100 px-2 py-0.5">
                    <Text className="text-xs text-slate-500">{q.subtopic}</Text>
                  </View>
                ) : null}
                <Text className="text-xs text-slate-500">Your answer: {q.studentAnswer}</Text>
                {q.correctAnswer ? (
                  <Text className="text-xs text-slate-500">Correct: {q.correctAnswer}</Text>
                ) : null}
                {q.feedback ? (
                  <Text className="mt-1 text-xs font-medium text-slate-700">{q.feedback}</Text>
                ) : null}
                <Text className="mt-1 text-xs text-slate-600">{q.explanation}</Text>
              </View>
            );
          })}
        </View>

        <View className="h-6" />
      </ScrollView>

      {/* Actions */}
      <View className="border-t border-slate-100 px-4 py-4 space-y-3">
        <Button
          onPress={() =>
            router.push({ pathname: '/quiz/entry', params: {} })
          }
          title="Practice more"
        />
        <Button
          onPress={() => router.replace('/')}
          title="Back to home"
          variant="secondary"
        />
      </View>
    </SafeAreaView>
  );
}
