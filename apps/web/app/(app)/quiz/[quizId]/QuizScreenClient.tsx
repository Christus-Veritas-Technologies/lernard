"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type { QuizContent } from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { browserApiFetch } from "@/lib/browser-api";

interface QuizScreenClientProps {
    quizId: string;
}

interface AnswerResult {
    isCorrect: boolean;
    feedback: string;
    done: boolean;
}

export function QuizScreenClient({ quizId }: QuizScreenClientProps) {
    const router = useRouter();
    const [quiz, setQuiz] = useState<QuizContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // single-value answer (most types)
    const [answer, setAnswer] = useState("");
    // multi-value answer (multiple_select)
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<AnswerResult | null>(null);

    const loadQuiz = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await browserApiFetch<QuizContent>(ROUTES.QUIZZES.GET(quizId));
            setQuiz(data);
            setAnswer("");
            setSelectedOptions([]);
            setResult(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Unable to load quiz."));
        } finally {
            setLoading(false);
        }
    }, [quizId]);

    useEffect(() => { void loadQuiz(); }, [loadQuiz]);

    const progressValue = quiz
        ? ((quiz.currentQuestionIndex + 1) / Math.max(quiz.totalQuestions, 1)) * 100
        : 0;

    const canSubmit =
        quiz?.question.type === "multiple_select"
            ? selectedOptions.length > 0
            : answer.trim().length > 0;

    if (loading) return <div className="h-72 rounded-3xl bg-background-subtle" />;

    if (error || !quiz) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Could not load quiz</CardTitle>
                    <CardDescription>{error?.message ?? "Try again"}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={loadQuiz}>Retry</Button>
                </CardContent>
            </Card>
        );
    }

    function toggleOption(option: string) {
        setSelectedOptions((prev) =>
            prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
        );
    }

    async function submitAnswer() {
        if (!canSubmit || submitting) return;

        const submittedAnswer =
            quiz!.question.type === "multiple_select"
                ? JSON.stringify(selectedOptions)
                : answer;

        setSubmitting(true);
        try {
            const res = await browserApiFetch<AnswerResult>(ROUTES.QUIZZES.ANSWER(quizId), {
                method: "POST",
                body: JSON.stringify({
                    questionIndex: quiz!.currentQuestionIndex,
                    answer: submittedAnswer,
                }),
            });
            setResult(res);
            if (res.done) {
                router.push(`/quiz/${quizId}/results`);
            }
        } finally {
            setSubmitting(false);
        }
    }

    function onNext() {
        void loadQuiz();
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <Badge tone="cool">
                    {quiz.currentQuestionIndex + 1} of {quiz.totalQuestions}
                </Badge>
                <Progress className="max-w-72" value={progressValue} />
                <Button onClick={() => router.push("/home")} variant="ghost">
                    Exit
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{quiz.question.text}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Multiple choice — radio */}
                    {quiz.question.type === "multiple_choice" && quiz.question.options ? (
                        <RadioGroup onValueChange={setAnswer} value={answer}>
                            {quiz.question.options.map((option) => (
                                <label className="flex cursor-pointer items-center gap-2" key={option}>
                                    <RadioGroupItem value={option} />
                                    <span className="text-sm">{option}</span>
                                </label>
                            ))}
                        </RadioGroup>
                    ) : null}

                    {/* Multiple select — checkboxes */}
                    {quiz.question.type === "multiple_select" && quiz.question.options ? (
                        <div className="space-y-2">
                            <p className="text-xs text-text-tertiary">Select all that apply</p>
                            {quiz.question.options.map((option) => (
                                <label
                                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 hover:bg-background-subtle"
                                    key={option}
                                >
                                    <input
                                        checked={selectedOptions.includes(option)}
                                        className="h-4 w-4 accent-primary-500"
                                        onChange={() => toggleOption(option)}
                                        type="checkbox"
                                    />
                                    <span className="text-sm">{option}</span>
                                </label>
                            ))}
                        </div>
                    ) : null}

                    {/* True / False */}
                    {quiz.question.type === "true_false" ? (
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={() => setAnswer("true")}
                                variant={answer === "true" ? "default" : "secondary"}
                            >
                                True
                            </Button>
                            <Button
                                onClick={() => setAnswer("false")}
                                variant={answer === "false" ? "default" : "secondary"}
                            >
                                False
                            </Button>
                        </div>
                    ) : null}

                    {/* Fill in the blank */}
                    {quiz.question.type === "fill_blank" ? (
                        <Input
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Type your answer…"
                            value={answer}
                        />
                    ) : null}

                    {/* Short answer / ordering */}
                    {quiz.question.type === "short_answer" || quiz.question.type === "ordering" ? (
                        <Textarea
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Type your answer…"
                            value={answer}
                        />
                    ) : null}

                    {/* Action buttons — hide while result shown */}
                    {!result ? (
                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={() => {
                                    setAnswer("");
                                    setSelectedOptions([]);
                                }}
                                variant="ghost"
                            >
                                Clear answer
                            </Button>
                            <Button disabled={submitting || !canSubmit} onClick={submitAnswer}>
                                Submit
                            </Button>
                        </div>
                    ) : null}

                    {/* Feedback */}
                    {result ? (
                        <div
                            className={`rounded-2xl border p-4 ${
                                result.isCorrect
                                    ? "border-green-200 bg-green-50 text-green-800"
                                    : "border-red-200 bg-red-50 text-red-800"
                            }`}
                        >
                            <p className="mb-1 font-semibold">
                                {result.isCorrect ? "✓ Correct" : "✗ Not quite"}
                            </p>
                            <p className="text-sm">{result.feedback}</p>
                            {!result.done ? (
                                <Button className="mt-3" onClick={onNext} size="sm">
                                    Next question →
                                </Button>
                            ) : null}
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
