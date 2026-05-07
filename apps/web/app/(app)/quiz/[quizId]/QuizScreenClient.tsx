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

export function QuizScreenClient({ quizId }: QuizScreenClientProps) {
    const router = useRouter();
    const [quiz, setQuiz] = useState<QuizContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [answer, setAnswer] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const loadQuiz = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await browserApiFetch<QuizContent>(ROUTES.QUIZZES.GET(quizId));
            setQuiz(data);
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

    async function submitAnswer() {
        if (!answer.trim()) return;

        setSubmitting(true);
        try {
            const result = await browserApiFetch<{ isCorrect: boolean; feedback: string; done: boolean }>(
                ROUTES.QUIZZES.ANSWER(quizId),
                {
                    method: "POST",
                    body: JSON.stringify({
                        questionIndex: quiz.currentQuestionIndex,
                        answer,
                    }),
                },
            );

            setFeedback(result.feedback);
            if (result.done) {
                router.push(`/quiz/${quizId}/results`);
                return;
            }

            setTimeout(() => {
                setAnswer("");
                setFeedback(null);
                void loadQuiz();
            }, 500);
        } finally {
            setSubmitting(false);
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
                    {quiz.question.type === "multiple_choice" && quiz.question.options ? (
                        <RadioGroup onValueChange={setAnswer} value={answer}>
                            {quiz.question.options.map((option) => (
                                <label className="flex items-center gap-2" key={option}>
                                    <RadioGroupItem value={option} />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </RadioGroup>
                    ) : null}

                    {quiz.question.type === "true_false" ? (
                        <div className="grid grid-cols-2 gap-3">
                            <Button onClick={() => setAnswer("true")} variant="secondary">True</Button>
                            <Button onClick={() => setAnswer("false")} variant="secondary">False</Button>
                        </div>
                    ) : null}

                    {quiz.question.type === "fill_blank" ? (
                        <Input onChange={(event) => setAnswer(event.target.value)} value={answer} />
                    ) : null}

                    {quiz.question.type === "short_answer" || quiz.question.type === "ordering" ? (
                        <Textarea onChange={(event) => setAnswer(event.target.value)} value={answer} />
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                        <Button onClick={() => setAnswer("I am not sure") } variant="ghost">
                            I&apos;m not sure
                        </Button>
                        <Button disabled={submitting || !answer.trim()} onClick={submitAnswer}>
                            Submit
                        </Button>
                    </div>

                    {feedback ? (
                        <Card className="border-primary-200 bg-primary-50 p-4 text-sm text-primary-700">
                            {feedback}
                        </Card>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
