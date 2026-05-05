"use client";

import { SparklesIcon } from "hugeicons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ROUTES } from "@lernard/routes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { browserApiFetch } from "@/lib/browser-api";

export function LearnPageClient() {
    const router = useRouter();
    const [topic, setTopic] = useState("");
    const [depth, setDepth] = useState<"quick" | "standard" | "deep">("standard");
    const [loading, setLoading] = useState(false);

    const remaining = 300 - topic.length;

    async function onGenerate() {
        if (!topic.trim()) return;

        setLoading(true);
        try {
            const response = await browserApiFetch<{ lessonId: string }>(ROUTES.LESSONS.GENERATE, {
                method: "POST",
                body: JSON.stringify({
                    topic: topic.trim(),
                    depth,
                    idempotencyKey: crypto.randomUUID(),
                }),
            });

            router.push(`/learn/${response.lessonId}/loading`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>What do you want to learn today?</CardTitle>
                <CardDescription>Turn any topic into a personalized lesson.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="space-y-2">
                    <Textarea
                        autoFocus
                        maxLength={300}
                        onChange={(event) => setTopic(event.target.value)}
                        placeholder="Type a topic, question, or concept"
                        value={topic}
                    />
                    <div className="flex items-center justify-between">
                        <Badge tone="cool">Subject auto-detected</Badge>
                        <p className="text-xs text-text-tertiary">{remaining} chars left</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label>Depth</Label>
                    <RadioGroup
                        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                        onValueChange={(value) => setDepth(value as "quick" | "standard" | "deep")}
                        value={depth}
                    >
                        {[
                            { label: "Quick", value: "quick" },
                            { label: "Full", value: "standard" },
                            { label: "Deep", value: "deep" },
                        ].map((option) => (
                            <label
                                className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3"
                                key={option.value}
                            >
                                <RadioGroupItem value={option.value} />
                                <span className="text-sm text-text-primary">{option.label}</span>
                            </label>
                        ))}
                    </RadioGroup>
                </div>

                <div className="grid gap-3">
                    <Button variant="secondary">
                        <SparklesIcon size={16} strokeWidth={1.8} />
                        Lernard&apos;s Choice
                    </Button>
                    <Button disabled={loading || !topic.trim()} onClick={onGenerate}>
                        {loading ? "Generating..." : "Generate Lesson"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
