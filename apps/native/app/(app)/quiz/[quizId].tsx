import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { QuizContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { nativeApiFetch } from '@/lib/native-api';

interface AnswerResult {
  isCorrect: boolean;
  feedback: string;
  done: boolean;
}

export default function QuizScreen() {
  const { quizId } = useLocalSearchParams<{ quizId: string }>();
  const router = useRouter();

  const [quiz, setQuiz] = useState<QuizContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answer, setAnswer] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await nativeApiFetch<QuizContent>(ROUTES.QUIZZES.GET(quizId));
      setQuiz(data);
      setAnswer('');
      setSelectedOptions([]);
      setResult(null);
    } catch {
      setError('Could not load this question. Try again.');
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => { void loadQuiz(); }, [loadQuiz]);

  function toggleOption(option: string) {
    setSelectedOptions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
    );
  }

  const canSubmit =
    quiz?.question.type === 'multiple_select'
      ? selectedOptions.length > 0
      : answer.trim().length > 0;

  async function submitAnswer() {
    if (!quiz || !canSubmit || submitting) return;
    const submittedAnswer =
      quiz.question.type === 'multiple_select'
        ? JSON.stringify(selectedOptions)
        : answer;

    setSubmitting(true);
    try {
      const res = await nativeApiFetch<AnswerResult>(ROUTES.QUIZZES.ANSWER(quizId), {
        method: 'POST',
        body: JSON.stringify({ questionIndex: quiz.currentQuestionIndex, answer: submittedAnswer }),
      });
      setResult(res);
      if (res.done) {
        router.replace({ pathname: '/quiz/results/[quizId]', params: { quizId } });
      }
    } catch {
      setError('Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <RoleFullScreenLoadingOverlay forceVisible />;
  }

  if (error || !quiz) {
    return (
      <SafeAreaView className="flex-1 bg-white px-4 pt-6">
        <Text className="mb-4 text-base text-red-600">{error ?? 'Quiz unavailable.'}</Text>
        <Button onPress={loadQuiz} title="Try again" />
      </SafeAreaView>
    );
  }

  const progress = ((quiz.currentQuestionIndex + 1) / Math.max(quiz.totalQuestions, 1)) * 100;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="border-b border-slate-100 px-4 py-3">
        <View className="flex-row items-center justify-between mb-2">
          <View className="rounded-full bg-indigo-100 px-3 py-1">
            <Text className="text-xs font-semibold text-indigo-700">
              {quiz.currentQuestionIndex + 1} of {quiz.totalQuestions}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.replace('/')}>
            <Text className="text-sm text-slate-600">Exit</Text>
          </TouchableOpacity>
        </View>
        {/* Progress bar */}
        <View className="h-1.5 w-full rounded-full bg-slate-100">
          <View className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${progress}%` }} />
        </View>
      </View>

      {/* Question */}
      <View className="flex-1 px-4 pt-5">
        <Text className="mb-5 text-lg font-semibold text-slate-900">{quiz.question.text}</Text>

        {/* Multiple choice — radio */}
        {quiz.question.type === 'multiple_choice' && quiz.question.options ? (
          <View className="space-y-2">
            {quiz.question.options.map((option) => (
              <TouchableOpacity
                key={option}
                className={`rounded-xl border p-4 ${answer === option ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                onPress={() => setAnswer(option)}
              >
                <Text className={`text-sm ${answer === option ? 'font-semibold text-indigo-700' : 'text-slate-700'}`}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Multiple select — checkboxes */}
        {quiz.question.type === 'multiple_select' && quiz.question.options ? (
          <View className="space-y-2">
            <Text className="mb-1 text-xs text-slate-600">Select all that apply</Text>
            {quiz.question.options.map((option) => {
              const checked = selectedOptions.includes(option);
              return (
                <TouchableOpacity
                  key={option}
                  className={`flex-row items-center rounded-xl border p-4 ${checked ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                  onPress={() => toggleOption(option)}
                >
                  <View
                    className={`mr-3 h-5 w-5 rounded border-2 items-center justify-center ${checked ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 bg-white'}`}
                  >
                    {checked ? <Text className="text-xs font-bold text-white">✓</Text> : null}
                  </View>
                  <Text className={`flex-1 text-sm ${checked ? 'font-semibold text-indigo-700' : 'text-slate-700'}`}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* True / False */}
        {quiz.question.type === 'true_false' ? (
          <View className="flex-row gap-3">
            {(['true', 'false'] as const).map((val) => (
              <TouchableOpacity
                key={val}
                className={`flex-1 items-center rounded-xl border py-4 ${answer === val ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                onPress={() => setAnswer(val)}
              >
                <Text className={`font-semibold ${answer === val ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {val.charAt(0).toUpperCase() + val.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Fill blank */}
        {quiz.question.type === 'fill_blank' ? (
          <TextInput
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
            onChangeText={setAnswer}
            placeholder="Type your answer…"
            placeholderTextColor="#94a3b8"
            value={answer}
          />
        ) : null}

        {/* Short answer / ordering */}
        {quiz.question.type === 'short_answer' || quiz.question.type === 'ordering' ? (
          <TextInput
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
            multiline
            numberOfLines={4}
            onChangeText={setAnswer}
            placeholder="Type your answer…"
            placeholderTextColor="#94a3b8"
            value={answer}
          />
        ) : null}
      </View>

      {/* Feedback */}
      {result ? (
        <View
          className={`mx-4 mb-4 rounded-2xl border p-4 ${result.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
        >
          <Text className={`mb-1 font-semibold ${result.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
            {result.isCorrect ? '✓ Correct' : '✗ Not quite'}
          </Text>
          <Text className={`text-sm ${result.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
            {result.feedback}
          </Text>
          {!result.done ? (
            <TouchableOpacity
              className="mt-3 self-start rounded-xl bg-indigo-500 px-4 py-2"
              onPress={() => void loadQuiz()}
            >
              <Text className="text-sm font-semibold text-white">Next →</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Submit area */}
      {!result ? (
        <View className="flex-row gap-3 border-t border-slate-100 px-4 py-4">
          <TouchableOpacity
            className="flex-1 items-center rounded-xl border border-slate-200 py-3"
            onPress={() => {
              setAnswer('');
              setSelectedOptions([]);
            }}
          >
            <Text className="text-sm text-slate-500">Clear answer</Text>
          </TouchableOpacity>
          <View className="flex-1">
            <Button
              disabled={!canSubmit || submitting}
              onPress={() => void submitAnswer()}
              title={submitting ? 'Submitting…' : 'Submit'}
            />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
