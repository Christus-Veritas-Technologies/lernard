"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LessonCompleteClientProps {
    lessonId: string;
    topic: string;
    subject: string;
    summary: string[];
    xpEarned: number;
}

export function LessonCompleteClient({
    lessonId,
    topic,
    subject,
    summary,
    xpEarned,
}: LessonCompleteClientProps) {
    return (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-8 py-16 text-center">
            {/* XP badge */}
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-100 text-4xl">
                🎓
            </div>

            <div className="flex flex-col gap-2">
                <p className="text-sm font-medium uppercase tracking-widest text-primary-500">{subject}</p>
                <h1 className="text-3xl font-semibold text-text-primary">Lesson complete!</h1>
                <p className="text-lg text-text-secondary">{topic}</p>
            </div>

            {/* XP earned */}
            <div className="rounded-2xl border border-border bg-surface px-6 py-4">
                <p className="text-sm text-text-secondary">XP earned</p>
                <p className="mt-1 text-4xl font-bold text-primary-600">+{xpEarned}</p>
            </div>

            {/* Key takeaways */}
            {summary.length > 0 && (
                <Card className="w-full text-left">
                    <CardHeader>
                        <CardTitle className="text-base">What you covered</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {summary.map((point, i) => (
                                <li className="flex items-start gap-2 text-sm leading-6 text-text-secondary" key={i}>
                                    <span className="mt-0.5 shrink-0 text-primary-500">•</span>
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* CTAs */}
            <div className="flex w-full flex-col gap-3 sm:flex-row">
                <Button asChild className="flex-1" size="lg">
                    <Link href={`/quiz?fromLesson=${lessonId}`}>Take a quick quiz →</Link>
                </Button>
                <Button asChild className="flex-1" size="lg" variant="secondary">
                    <Link href="/learn">Back to Learn</Link>
                </Button>
            </div>
        </div>
    );
}
