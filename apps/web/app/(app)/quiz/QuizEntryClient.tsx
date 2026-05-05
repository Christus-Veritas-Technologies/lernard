"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ROUTES } from "@lernard/routes";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { browserApiFetch } from "@/lib/browser-api";

export function QuizEntryClient() {
    const router = useRouter();
    const params = useSearchParams();
    const [topic, setTopic] = useState(params.get("topic") ?? "");
    const [questionCount, setQuestionCount] = useState(10);
    const [loading, setLoading] = useState(false);

    async function onGenerate() {
        if (!topic.trim()) return;

        setLoading(true);
        try {
            const response = await browserApiFetch<{ quizId: string }>(ROUTES.QUIZZES.GENERATE, {
                method: "POST",
                body: JSON.stringify({
                    topic: topic.trim(),
                    questionCount,
                    idempotencyKey: crypto.randomUUID(),
                    fromLessonId: params.get("lessonId") ?? undefined,
                }),
            });

            router.push(`/quiz/${response.quizId}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Test yourself</CardTitle>
                <CardDescription>Build a quiz on this topic.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <Textarea
                    maxLength={300}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="Topic to quiz"
                    value={topic}
                />

                <div className="space-y-3">
                    <Label>Quiz length</Label>
                    <RadioGroup
                        className="grid grid-cols-3 gap-3"
                        onValueChange={(value) => setQuestionCount(Number(value))}
                        value={String(questionCount)}
                    >
                        {[5, 10, 15].map((value) => (
                            <label
                                className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3"
                                key={value}
                            >
                                <RadioGroupItem value={String(value)} />
                                <span>{value}</span>
                            </label>
                        ))}
                    </RadioGroup>
                </div>

                <Button disabled={loading || !topic.trim()} onClick={onGenerate}>
                    {loading ? "Generating..." : "Generate Quiz"}
                </Button>
            </CardContent>
        </Card>
    );
}
