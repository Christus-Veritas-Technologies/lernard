import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type {
  QuizContent,
  QuizDetailResponse,
  ShortAnswerEvaluation,
  StructuredPartEvaluation,
  StructuredQuestion,
} from '@lernard/shared-types';

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
  const [quizMode, setQuizMode] = useState<QuizDetailResponse['mode'] | null>(null);
  const [queueEstimate, setQueueEstimate] = useState<number | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answer, setAnswer] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [shortAnswerEval, setShortAnswerEval] = useState<ShortAnswerEvaluation | null>(null);

  // Structured question state
  const [partInputs, setPartInputs] = useState<Record<string, string>>({});
  const [partSubmitting, setPartSubmitting] = useState<Record<string, boolean>>({});
  const [partResults, setPartResults] = useState<Record<string, StructuredPartEvaluation>>({});

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await nativeApiFetch<QuizDetailResponse>(ROUTES.QUIZZES.GET(quizId));
      setQuizMode(data.mode);

      if (data.mode === 'queued') {
        setQueueEstimate(data.estimatedSecondsRemaining);
        setFailureReason(null);
        setQuiz(null);
        return;
      }

      if (data.mode === 'failed') {
        setFailureReason(data.failureReason);
        setQueueEstimate(null);
        setQuiz(null);
        return;
      }

      if (data.mode === 'review') {
        router.replace({ pathname: '/quiz/results/[quizId]', params: { quizId } });
        return;
      }

      setFailureReason(null);
      setQueueEstimate(null);
      setQuiz(data.quiz);
      setAnswer('');
      setSelectedOptions([]);
      setResult(null);
      setShortAnswerEval(null);
      setPartInputs({});
      setPartSubmitting({});
      setPartResults({});
    } catch {
      setError('Could not load this question. Try again.');
    } finally {
      setLoading(false);
    }
  }, [quizId, router]);

  useEffect(() => { void loadQuiz(); }, [loadQuiz]);

  useEffect(() => {
    if (quizMode !== 'queued') return;
    const timer = setInterval(() => {
      void loadQuiz();
    }, 3000);

    return () => clearInterval(timer);
  }, [quizMode, loadQuiz]);

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

      if (quiz.question.type === 'short_answer') {
        nativeApiFetch<ShortAnswerEvaluation>(ROUTES.QUIZZES.EVALUATE_SHORT_ANSWER(quizId), {
          method: 'POST',
          body: JSON.stringify({ questionIndex: quiz.currentQuestionIndex, studentAnswer: submittedAnswer }),
        }).then(setShortAnswerEval).catch(() => {});
      }

      if (res.done) {
        router.replace({ pathname: '/quiz/results/[quizId]', params: { quizId } });
      }
    } catch {
      setError('Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPart(partLabel: string) {
    if (!quiz || partSubmitting[partLabel]) return;
    const partAnswer = (partInputs[partLabel] ?? '').trim();
    if (!partAnswer) return;

    setPartSubmitting((prev) => ({ ...prev, [partLabel]: true }));
    try {
      const res = await nativeApiFetch<StructuredPartEvaluation>(
        ROUTES.QUIZZES.ANSWER_PART(quizId),
        {
          method: 'POST',
          body: JSON.stringify({
            questionIndex: quiz.currentQuestionIndex,
            partLabel,
            answer: partAnswer,
          }),
        },
      );
      setPartResults((prev) => ({ ...prev, [partLabel]: res }));
      if (res.done) {
        router.replace({ pathname: '/quiz/results/[quizId]', params: { quizId } });
      }
    } catch {
      setError('Failed to submit answer.');
    } finally {
      setPartSubmitting((prev) => ({ ...prev, [partLabel]: false }));
    }
  }

  if (loading) {
    return <RoleFullScreenLoadingOverlay forceVisible />;
  }

  if (error || !quiz) {
    if (quizMode === 'queued') {
      return (
        <SafeAreaView className="flex-1 bg-white px-4 pt-6">
          <Text className="mb-2 text-base font-semibold text-slate-900">Preparing your quiz...</Text>
          <Text className="mb-4 text-sm text-slate-600">
            {typeof queueEstimate === 'number'
              ? `Estimated time remaining: ${Math.max(1, Math.ceil(queueEstimate / 5) * 5)}s`
              : 'Estimated time remaining: calculating...'}
          </Text>
          <Button onPress={loadQuiz} title="Refresh" />
        </SafeAreaView>
      );
    }

    if (quizMode === 'failed') {
      return (
        <SafeAreaView className="flex-1 bg-white px-4 pt-6">
          <Text className="mb-2 text-base font-semibold text-slate-900">Quiz generation failed</Text>
          <Text className="mb-4 text-sm text-red-600">
            {failureReason ?? 'Something went wrong while generating this quiz.'}
          </Text>
          <View className="gap-3">
            <Button onPress={() => router.replace('/quiz')} title="Back to quiz" variant="secondary" />
            <Button onPress={loadQuiz} title="Try again" />
          </View>
        </SafeAreaView>
      );
    }

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

      {/* Structured question — scrollable parts */}
      {quiz.question.type === 'structured' ? (
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }}>
          <Text className="mb-4 text-lg font-semibold text-slate-900">{quiz.question.text}</Text>
          {(quiz.question as unknown as StructuredQuestion).parts?.map((part) => {
            const submitted = Boolean(partResults[part.label]);
            const res = partResults[part.label];
            return (
              <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-4" key={part.label}>
                {/* Part header */}
                <View className="mb-3 flex-row items-start justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="h-6 w-6 items-center justify-center rounded-full bg-indigo-100">
                      <Text className="text-xs font-bold text-indigo-700">{part.label}</Text>
                    </View>
                    <View className="rounded-md bg-slate-100 px-2 py-0.5">
                      <Text className="text-xs font-medium text-slate-600">{part.command}</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-slate-400">
                    [{part.marks} {part.marks === 1 ? 'mark' : 'marks'}]
                  </Text>
                </View>
                <Text className="mb-3 text-sm text-slate-800">{part.text}</Text>

                {/* Input — hidden after submission */}
                {!submitted ? (
                  <View>
                    <TextInput
                      className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
                      multiline
                      numberOfLines={part.answerType === 'written' ? 4 : 2}
                      onChangeText={(text) =>
                        setPartInputs((prev) => ({ ...prev, [part.label]: text }))
                      }
                      placeholder={
                        part.answerType === 'numeric' ? 'Enter your calculation…' : 'Type your answer…'
                      }
                      placeholderTextColor="#94a3b8"
                      value={partInputs[part.label] ?? ''}
                    />
                    <TouchableOpacity
                      className={`self-start rounded-xl px-4 py-2 ${
                        partSubmitting[part.label] || !(partInputs[part.label] ?? '').trim()
                          ? 'bg-slate-200'
                          : 'bg-indigo-500'
                      }`}
                      disabled={partSubmitting[part.label] || !(partInputs[part.label] ?? '').trim()}
                      onPress={() => void submitPart(part.label)}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          partSubmitting[part.label] || !(partInputs[part.label] ?? '').trim()
                            ? 'text-slate-400'
                            : 'text-white'
                        }`}
                      >
                        {partSubmitting[part.label] ? 'Marking…' : 'Submit'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Per-part evaluation result */}
                {res ? (
                  <View
                    className={`mt-3 rounded-xl border p-3 ${
                      res.marksEarned === res.totalMarks
                        ? 'border-green-200 bg-green-50'
                        : res.marksEarned > 0
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <View className="mb-1.5 flex-row items-center justify-between">
                      <Text
                        className={`text-sm font-semibold ${
                          res.marksEarned === res.totalMarks
                            ? 'text-green-800'
                            : res.marksEarned > 0
                              ? 'text-amber-800'
                              : 'text-red-800'
                        }`}
                      >
                        {res.marksEarned === res.totalMarks
                          ? '✓ Full marks'
                          : res.marksEarned > 0
                            ? `~ ${res.marksEarned}/${res.totalMarks} marks`
                            : '✗ No marks'}
                      </Text>
                      <Text className="text-xs text-slate-400">
                        {res.marksEarned}/{res.totalMarks}
                      </Text>
                    </View>
                    <Text className="mb-2 text-sm text-slate-700">{res.feedback}</Text>
                    {res.markingPoints.length > 0 ? (
                      <View className="mb-2">
                        <Text className="mb-1 text-xs font-medium text-slate-500">Marking scheme:</Text>
                        {res.markingPoints.map((mp, i) => (
                          <View className="mb-0.5 flex-row" key={i}>
                            <Text className="mr-1.5 text-xs text-slate-400">•</Text>
                            <Text className="flex-1 text-xs text-slate-600">{mp}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    <Text className="mb-0.5 text-xs font-medium text-slate-500">Model answer:</Text>
                    <Text className="text-sm text-slate-700">{res.modelAnswer}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          {/* Next question — shown when all parts submitted */}
          {(() => {
            const sq = quiz.question as unknown as StructuredQuestion;
            const allDone =
              sq.parts?.length > 0 && sq.parts.every((p) => Boolean(partResults[p.label]));
            const lastResult = sq.parts?.length > 0
              ? partResults[sq.parts[sq.parts.length - 1]?.label ?? '']
              : undefined;
            if (!allDone || lastResult?.done) return null;
            return (
              <TouchableOpacity
                className="mt-2 items-center rounded-2xl bg-indigo-500 py-4"
                onPress={() => void loadQuiz()}
              >
                <Text className="font-semibold text-white">Next question →</Text>
              </TouchableOpacity>
            );
          })()}
        </ScrollView>
      ) : null}

      {/* Question */}
      {quiz.question.type !== 'structured' ? (
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
      ) : null}

      {/* Feedback — short answer uses AI evaluation (non-structured only) */}
      {quiz.question.type !== 'structured' && result && shortAnswerEval ? (
        <View
          className={`mx-4 mb-4 rounded-2xl border p-4 ${
            shortAnswerEval.result === 'correct'
              ? 'border-green-200 bg-green-50'
              : shortAnswerEval.result === 'partial'
                ? 'border-amber-200 bg-amber-50'
                : 'border-red-200 bg-red-50'
          }`}
        >
          <Text
            className={`mb-1 font-semibold ${
              shortAnswerEval.result === 'correct'
                ? 'text-green-800'
                : shortAnswerEval.result === 'partial'
                  ? 'text-amber-800'
                  : 'text-red-800'
            }`}
          >
            {shortAnswerEval.result === 'correct'
              ? '✓ Correct'
              : shortAnswerEval.result === 'partial'
                ? '~ Partially correct'
                : '✗ Not quite'}
          </Text>
          <Text
            className={`text-sm ${
              shortAnswerEval.result === 'correct'
                ? 'text-green-700'
                : shortAnswerEval.result === 'partial'
                  ? 'text-amber-700'
                  : 'text-red-700'
            }`}
          >
            {shortAnswerEval.feedback}
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
      ) : quiz.question.type !== 'structured' && result ? (
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

      {/* Submit area — non-structured only */}
      {quiz.question.type !== 'structured' && !result ? (
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
