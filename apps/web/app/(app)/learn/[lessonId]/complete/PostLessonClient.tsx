"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ROUTES } from "@lernard/routes";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { browserApiFetch } from "@/lib/browser-api";

interface PostLessonClientProps {
    lessonId: string;
}

export function PostLessonClient({ lessonId }: PostLessonClientProps) {
    const router = useRouter();
    const params = useSearchParams();
    const topic = params.get("topic") ?? "";
    const [rating, setRating] = useState(3);
    const [saving, setSaving] = useState(false);
    const [xpEarned, setXpEarned] = useState<number | null>(null);

    async function onSave() {
        if (xpEarned !== null) return;
        setSaving(true);
        try {
            const result = await browserApiFetch<{ xpEarned: number }>(ROUTES.LESSONS.COMPLETE(lessonId), {
                method: "POST",
                body: JSON.stringify({ confidenceRating: rating }),
            });
            setXpEarned(result.xpEarned);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{topic || "Nice work."}</CardTitle>
                <CardDescription>Rate your confidence, then choose your next step.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                        <button
                            className={`h-10 w-10 rounded-full border text-sm font-semibold ${value <= rating ? "border-primary-500 bg-primary-100 text-primary-700" : "border-border text-text-secondary"}`}
                            key={value}
                            onClick={() => setRating(value)}
                            type="button"
                        >
                            {value}
                        </button>
                    ))}
                </div>

                <Badge tone="success">XP earned: {xpEarned ?? "Save rating to calculate"}</Badge>

                <Button disabled={saving || xpEarned !== null} onClick={onSave}>
                    {saving ? "Saving..." : xpEarned !== null ? "Saved" : "Save lesson result"}
                </Button>

                <div className="grid gap-3 sm:grid-cols-2">
                    <Button onClick={() => {
                        const quizUrl = `/quiz?lessonId=${lessonId}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`;
                        router.push(quizUrl);
                    }}>
                        Quiz me on this
                    </Button>
                    <Button onClick={() => router.push("/home")} variant="secondary">
                        What&apos;s next?
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
