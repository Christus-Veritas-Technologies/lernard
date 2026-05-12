import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
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

export function PlanUsageCard({ planUsage }: PlanUsageCardProps) {
    const router = useRouter();
    const isExplorer = planUsage.plan === "explorer";

    function pct(used: number, limit: number) {
        return limit > 0 ? used / limit : 0;
    }

    const lessonPct = pct(planUsage.lessonsUsed, planUsage.lessonsLimit);
    const quizPct = pct(planUsage.quizzesUsed, planUsage.quizzesLimit);
    const projectPct = pct(planUsage.projectsUsed, planUsage.projectsLimit);
    const chatPct = pct(planUsage.chatMessagesUsed, planUsage.chatMessagesLimit);

    const showLessons = lessonPct > 0.5 || isExplorer;
    const showQuizzes = (quizPct > 0.5 || isExplorer) && planUsage.quizzesLimit > 0;
    const showProjects = projectPct > 0.5 && planUsage.projectsLimit > 0;
    const showChat = chatPct > 0.5 && planUsage.chatMessagesLimit > 0;

    if (!showLessons && !showQuizzes && !showProjects && !showChat) return null;

    const planName = PLAN_DISPLAY_NAMES[planUsage.plan] ?? planUsage.plan;

    return (
        <View className="rounded-2xl border border-border bg-surface px-4 py-3 gap-3">
            <View className="flex-row items-center justify-between">
                <Text className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {planName} plan{isExplorer ? " · daily limits" : ""}
                </Text>
                <Pressable onPress={() => router.push("/(app)/settings/plans" as any)}>
                    <Text className="text-xs text-primary">View plans</Text>
                </Pressable>
            </View>

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
                    label="Chat"
                    used={planUsage.chatMessagesUsed}
                    limit={planUsage.chatMessagesLimit}
                />
            )}
        </View>
    );
}
