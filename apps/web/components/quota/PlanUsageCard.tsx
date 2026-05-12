"use client";

import Link from "next/link";
import type { PlanUsage } from "@lernard/shared-types";
import { QuotaBar } from "./QuotaBar";

interface PlanUsageCardProps {
    planUsage: PlanUsage;
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
    explorer: "Explorer",
    scholar: "Scholar",
    household: "Household",
    student_scholar: "Scholar",
    student_pro: "Pro",
    guardian_family_starter: "Family Starter",
    guardian_family_standard: "Family Standard",
    guardian_family_premium: "Family Premium",
};

/**
 * Summary card shown on the home and progress pages.
 * Only renders bars that are above 50% — avoids anxiety-inducing empty meters.
 * Always renders on Explorer plan (daily limits, so every bar matters).
 */
export function PlanUsageCard({ planUsage }: PlanUsageCardProps) {
    const isExplorer = planUsage.plan === "explorer";

    function pct(used: number, limit: number) {
        return limit > 0 ? Math.round((used / limit) * 100) : 0;
    }

    const lessonPct = pct(planUsage.lessonsUsed, planUsage.lessonsLimit);
    const quizPct = pct(planUsage.quizzesUsed, planUsage.quizzesLimit);
    const projectPct = pct(planUsage.projectsUsed, planUsage.projectsLimit);
    const chatPct = pct(planUsage.chatMessagesUsed, planUsage.chatMessagesLimit);

    const showLessons = lessonPct > 50 || isExplorer;
    const showQuizzes = (quizPct > 50 || isExplorer) && planUsage.quizzesLimit > 0;
    const showProjects = projectPct > 50 && planUsage.projectsLimit > 0;
    const showChat = chatPct > 50 && planUsage.chatMessagesLimit > 0;

    if (!showLessons && !showQuizzes && !showProjects && !showChat) return null;

    const planName = PLAN_DISPLAY_NAMES[planUsage.plan] ?? planUsage.plan;

    return (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {planName} plan
                {isExplorer && (
                    <span className="ml-1 normal-case font-normal">· daily limits</span>
                )}
            </p>

            {showLessons && (
                <QuotaBar
                    label={isExplorer ? "Daily lessons" : "Lessons"}
                    used={planUsage.lessonsUsed}
                    limit={planUsage.lessonsLimit}
                />
            )}
            {showQuizzes && (
                <QuotaBar
                    label="Practice Exams"
                    used={planUsage.quizzesUsed}
                    limit={planUsage.quizzesLimit}
                />
            )}
            {showProjects && (
                <QuotaBar
                    label="Projects"
                    used={planUsage.projectsUsed}
                    limit={planUsage.projectsLimit}
                />
            )}
            {showChat && (
                <QuotaBar
                    label="Chat messages"
                    used={planUsage.chatMessagesUsed}
                    limit={planUsage.chatMessagesLimit}
                />
            )}

            <Link
                href="/plans"
                className="ml-auto text-xs text-primary underline-offset-2 hover:underline whitespace-nowrap"
            >
                View plans
            </Link>
        </div>
    );
}
