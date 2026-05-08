import type { CompanionControls } from "@lernard/shared-types";

import { BrowserApiError } from "@/lib/browser-api";

export const DAILY_GOAL_PRESETS = [1, 2, 3, 5, 7, 10] as const;

export function ensureCompanionControls(companionControls: CompanionControls | null): CompanionControls {
    return companionControls ?? {
        answerRevealTiming: "after_quiz",
        quizPassThreshold: 0.7,
        lockedByGuardian: false,
        lastChangedAt: new Date().toISOString(),
        lastChangedBy: "Lernard",
    };
}

export function isLocked(lockedSettings: string[], key: string) {
    return lockedSettings.includes(key);
}

export function formatTokenLabel(value: string) {
    return value
        .split(/[_-]/g)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function getInitials(name: string) {
    return name
        .split(" ")
        .map((part) => part[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export function getErrorMessage(error: unknown) {
    if (error instanceof BrowserApiError) {
        try {
            const parsed = JSON.parse(error.body) as { message?: string | string[] };

            if (Array.isArray(parsed.message)) {
                return parsed.message[0] ?? "Something interrupted the save.";
            }

            if (parsed.message) {
                return parsed.message;
            }
        } catch {
            if (error.body.trim()) {
                return error.body;
            }
        }
    }

    return error instanceof Error ? error.message : "Something interrupted the save.";
}