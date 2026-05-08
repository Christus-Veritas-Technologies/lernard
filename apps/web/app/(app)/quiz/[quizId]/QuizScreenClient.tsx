"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type { QuizContent, ShortAnswerEvaluation, StructuredPartEvaluation, StructuredQuestion } from "@lernard/shared-types";

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
    const [shortAnswerEval, setShortAnswerEval] = useState<ShortAnswerEvaluation | null>(null);

    // Structured question state
    const [partInputs, setPartInputs] = useState<Record<string, string>>({});
    const [partSubmitting, setPartSubmitting] = useState<Record<string, boolean>>({});
    const [partResults, setPartResults] = useState<Record<string, StructuredPartEvaluation>>({});

    const loadQuiz = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await browserApiFetch<QuizContent>(ROUTES.QUIZZES.GET(quizId));
            setQuiz(data);
            setAnswer("");
            setSelectedOptions([]);
            setResult(null);
            setShortAnswerEval(null);
            setPartInputs({});
            setPartSubmitting({});
            setPartResults({});
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

            if (quiz!.question.type === "short_answer") {
                const evalRes = await browserApiFetch<ShortAnswerEvaluation>(
                    ROUTES.QUIZZES.EVALUATE_SHORT_ANSWER(quizId),
                    {
                        method: "POST",
                        body: JSON.stringify({
                            questionIndex: quiz!.currentQuestionIndex,
                            studentAnswer: submittedAnswer,
                        }),
                    },
                ).catch(() => null);
                if (evalRes) setShortAnswerEval(evalRes);
            }

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

    async function submitPart(partLabel: string) {
        const partAnswer = (partInputs[partLabel] ?? "").trim();
        if (!partAnswer || partSubmitting[partLabel]) return;

        setPartSubmitting((prev) => ({ ...prev, [partLabel]: true }));
        try {
            const res = await browserApiFetch<StructuredPartEvaluation>(
                ROUTES.QUIZZES.ANSWER_PART(quizId),
                {
                    method: "POST",
                    body: JSON.stringify({
                        questionIndex: quiz!.currentQuestionIndex,
                        partLabel,
                        answer: partAnswer,
                    }),
                },
            );
            setPartResults((prev) => ({ ...prev, [partLabel]: res }));
            if (res.done) {
                router.push(`/quiz/${quizId}/results`);
            }
        } finally {
            setPartSubmitting((prev) => ({ ...prev, [partLabel]: false }));
        }
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
                    {/* Structured question — all parts visible at once */}
                    {quiz.question.type === "structured" ? (
                        <div className="space-y-5">
                            {(quiz.question as unknown as StructuredQuestion).parts?.map((part) => {
                                const submitted = Boolean(partResults[part.label]);
                                const res = partResults[part.label];
                                return (
                                    <div className="rounded-2xl border border-border p-4" key={part.label}>
                                        {/* Part header */}
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                                                    {part.label}
                                                </span>
                                                <span className="rounded-md bg-background-subtle px-2 py-0.5 text-xs font-medium text-text-secondary">
                                                    {part.command}
                                                </span>
                                            </div>
                                            <span className="shrink-0 text-xs font-medium text-text-tertiary">
                                                [{part.marks} {part.marks === 1 ? "mark" : "marks"}]
                                            </span>
                                        </div>
                                        <p className="mb-3 text-sm text-text-primary">{part.text}</p>

                                        {/* Input — hidden after submission */}
                                        {!submitted ? (
                                            <div className="space-y-2">
                                                <Textarea
                                                    onChange={(e) =>
                                                        setPartInputs((prev) => ({
                                                            ...prev,
                                                            [part.label]: e.target.value,
                                                        }))
                                                    }
                                                    placeholder={
                                                        part.answerType === "numeric"
                                                            ? "Enter your calculation…"
                                                            : "Type your answer…"
                                                    }
                                                    rows={part.answerType === "written" ? 4 : 2}
                                                    value={partInputs[part.label] ?? ""}
                                                />
                                                <Button
                                                    disabled={
                                                        partSubmitting[part.label] ||
                                                        !(partInputs[part.label] ?? "").trim()
                                                    }
                                                    onClick={() => void submitPart(part.label)}
                                                    size="sm"
                                                >
                                                    {partSubmitting[part.label] ? "Marking…" : "Submit"}
                                                </Button>
                                            </div>
                                        ) : null}

                                        {/* Per-part evaluation result */}
                                        {res ? (
                                            <div
                                                className={`mt-3 rounded-xl border p-3 ${
                                                    res.marksEarned === res.totalMarks
                                                        ? "border-green-200 bg-green-50"
                                                        : res.marksEarned > 0
                                                          ? "border-amber-200 bg-amber-50"
                                                          : "border-red-200 bg-red-50"
                                                }`}
                                            >
                                                <div className="mb-1.5 flex items-center justify-between">
                                                    <span
                                                        className={`text-sm font-semibold ${
                                                            res.marksEarned === res.totalMarks
                                                                ? "text-green-800"
                                                                : res.marksEarned > 0
                                                                  ? "text-amber-800"
                                                                  : "text-red-800"
                                                        }`}
                                                    >
                                                        {res.marksEarned === res.totalMarks
                                                            ? "✓ Full marks"
                                                            : res.marksEarned > 0
                                                              ? `~ ${res.marksEarned}/${res.totalMarks} marks`
                                                              : "✗ No marks"}
                                                    </span>
                                                    <span className="text-xs text-text-tertiary">
                                                        {res.marksEarned}/{res.totalMarks}
                                                    </span>
                                                </div>
                                                <p className="mb-2 text-sm text-text-secondary">{res.feedback}</p>
                                                {res.markingPoints.length > 0 ? (
                                                    <div className="mb-2">
                                                        <p className="mb-1 text-xs font-medium text-text-tertiary">
                                                            Marking scheme:
                                                        </p>
                                                        <ul className="space-y-0.5">
                                                            {res.markingPoints.map((mp, i) => (
                                                                <li className="flex items-start gap-1.5 text-xs text-text-secondary" key={i}>
                                                                    <span className="mt-0.5 text-text-tertiary">•</span>
                                                                    {mp}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ) : null}
                                                <details className="mt-1">
                                                    <summary className="cursor-pointer text-xs font-medium text-text-tertiary hover:text-text-secondary">
                                                        Model answer
                                                    </summary>
                                                    <p className="mt-1 text-sm text-text-secondary">{res.modelAnswer}</p>
                                                </details>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}

                            {/* Next question — shown when all parts submitted */}
                            {(() => {
                                const sq = quiz.question as unknown as StructuredQuestion;
                                const allDone =
                                    sq.parts?.length > 0 &&
                                    sq.parts.every((p) => Boolean(partResults[p.label]));
                                const lastResult = sq.parts?.length > 0
                                    ? partResults[sq.parts[sq.parts.length - 1]?.label ?? ""]
                                    : undefined;
                                if (!allDone || lastResult?.done) return null;
                                return (
                                    <Button onClick={onNext}>Next question →</Button>
                                );
                            })()}
                        </div>
                    ) : null}
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

                    {/* Feedback — short answer uses AI evaluation */}
                    {result && shortAnswerEval ? (
                        <div
                            className={`rounded-2xl border p-4 ${
                                shortAnswerEval.result === "correct"
                                    ? "border-green-200 bg-green-50 text-green-800"
                                    : shortAnswerEval.result === "partial"
                                      ? "border-amber-200 bg-amber-50 text-amber-800"
                                      : "border-red-200 bg-red-50 text-red-800"
                            }`}
                        >
                            <p className="mb-1 font-semibold">
                                {shortAnswerEval.result === "correct"
                                    ? "✓ Correct"
                                    : shortAnswerEval.result === "partial"
                                      ? "~ Partially correct"
                                      : "✗ Not quite"}
                            </p>
                            <p className="text-sm">{shortAnswerEval.feedback}</p>
                            {!result.done ? (
                                <Button className="mt-3" onClick={onNext} size="sm">
                                    Next question →
                                </Button>
                            ) : null}
                        </div>
                    ) : result ? (
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
