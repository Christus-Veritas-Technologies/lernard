import { BookOpen01Icon } from "hugeicons-react";

import type { TopicSummary } from "@lernard/shared-types";

import { Badge } from "@/components/ui/badge";

interface TopicListCardProps {
    topics: TopicSummary[];
}

function scoreToTone(score: number): "success" | "warning" | "warm" {
    if (score >= 70) return "success";
    if (score >= 40) return "warning";
    return "warm";
}

export function TopicListCard({ topics }: TopicListCardProps) {
    if (topics.length === 0) {
        return (
            <div className="flex items-center justify-center py-8 text-sm text-text-secondary">
                Topics will appear here as you complete lessons and quizzes.
            </div>
        );
    }

    return (
        <div>
            {/* Header row */}
            <div className="mb-3 flex items-center gap-3 px-1 text-xs font-semibold uppercase tracking-widest text-text-tertiary">
                <span className="w-8" />
                <span className="flex-1">Topic</span>
                <span className="w-24">Subject</span>
                <span className="w-16 text-right">Score</span>
            </div>

            <div className="space-y-1">
                {topics.map((t, i) => (
                    <div
                        className="flex items-center gap-3 rounded-xl px-1 py-2.5 transition hover:bg-background"
                        key={`${t.subjectName}-${t.topic}-${i}`}
                    >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                            <BookOpen01Icon size={16} strokeWidth={1.8} />
                        </div>
                        <p className="flex-1 truncate text-sm font-medium text-text-primary">
                            {t.topic}
                        </p>
                        <div className="w-24">
                            <Badge className="text-xs" tone={scoreToTone(t.score)}>
                                {t.subjectName.length > 10
                                    ? t.subjectName.slice(0, 9) + "…"
                                    : t.subjectName}
                            </Badge>
                        </div>
                        <div className="w-16 text-right">
                            <span className="text-sm font-bold text-text-primary">{t.score}</span>
                            <span className="ml-0.5 text-xs text-text-secondary">pt</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
