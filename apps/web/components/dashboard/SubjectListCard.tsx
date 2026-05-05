import { BookOpen01Icon } from "hugeicons-react";

import type { SubjectTopicBreakdown, UserSubject } from "@lernard/shared-types";

interface SubjectListCardProps {
    subjects: UserSubject[];
    subjectTopics: SubjectTopicBreakdown[];
}

const MAX_ROWS = 5;

export function SubjectListCard({ subjects, subjectTopics }: SubjectListCardProps) {
    const topicsBySubject = new Map(subjectTopics.map((st) => [st.subjectId, st]));

    const rows = subjects.slice(0, MAX_ROWS).map((s) => {
        const st = topicsBySubject.get(s.subjectId);
        return {
            subjectId: s.subjectId,
            name: s.name,
            strongCount: st?.strongCount ?? 0,
        };
    });

    if (rows.length === 0) {
        return (
            <p className="py-4 text-center text-sm text-text-secondary">No subjects added yet</p>
        );
    }

    return (
        <div className="flex flex-col">
            {/* Header */}
            <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                    Subject
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                    Strong
                </span>
            </div>

            {/* Rows */}
            {rows.map((row, i) => (
                <div
                    key={row.subjectId}
                    className={`flex items-center justify-between py-3 ${i < rows.length - 1 ? "border-b border-border/60" : ""}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50">
                            <BookOpen01Icon className="text-primary-500" size={15} strokeWidth={1.5} />
                        </div>
                        <span className="text-sm font-medium text-text-primary">{row.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-text-primary">{row.strongCount}</span>
                </div>
            ))}
        </div>
    );
}
