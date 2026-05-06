"use client";

import { useRouter } from "next/navigation";
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
    const [rating, setRating] = useState(3);
    const [saving, setSaving] = useState(false);

    async function onSave() {
        setSaving(true);
        try {
            await browserApiFetch(ROUTES.LESSONS.COMPLETE(lessonId), {
                method: "POST",
                body: JSON.stringify({ confidenceRating: rating }),
            });
            router.push(`/quiz?lessonId=${lessonId}`);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Nice work.</CardTitle>
                <CardDescription>You just completed your lesson.</CardDescription>
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

                <Badge tone="success">XP incoming</Badge>

                <div className="grid gap-3 sm:grid-cols-2">
                    <Button disabled={saving} onClick={onSave}>
                        {saving ? "Saving..." : "Quiz me on this"}
                    </Button>
                    <Button onClick={() => router.push("/home")} variant="secondary">
                        What&apos;s next?
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
