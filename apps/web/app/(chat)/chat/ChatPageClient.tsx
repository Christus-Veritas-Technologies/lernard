"use client";

import { BookOpen01Icon, BulbIcon, MessageSquare01Icon } from "hugeicons-react";

const suggestions = [
    {
        icon: BookOpen01Icon,
        label: "Explain a topic",
        detail: "Ask Lernard to break down anything from your subjects.",
    },
    {
        icon: BulbIcon,
        label: "Help me understand",
        detail: "Stuck on a concept? Lernard will guide you through it step by step.",
    },
    {
        icon: MessageSquare01Icon,
        label: "Quiz me",
        detail: "Ask for a quick quiz on anything you are studying right now.",
    },
];

export function ChatPageClient() {
    return (
        <div className="flex flex-1 flex-col">
            {/* Empty state */}
            <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
                {/* Logo mark */}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500 shadow-lg shadow-primary-500/25">
                    <MessageSquare01Icon className="text-white" size={32} />
                </div>

                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-text-primary">
                        Ask Lernard anything
                    </h1>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-text-secondary">
                        Your personal tutor is almost here. Chat is in development — you will be able
                        to have full conversations with Lernard about your subjects.
                    </p>
                </div>

                {/* Suggestion cards */}
                <div className="grid w-full max-w-lg gap-3 sm:grid-cols-3">
                    {suggestions.map(({ detail, icon: Icon, label }) => (
                        <button
                            className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary-200 hover:bg-primary-50/50 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled
                            key={label}
                            type="button"
                        >
                            <Icon className="text-primary-500" size={18} />
                            <p className="text-sm font-medium text-text-primary">{label}</p>
                            <p className="text-xs leading-4 text-text-tertiary">{detail}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Disabled input bar */}
            <div className="border-t border-border bg-surface px-4 py-4">
                <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 opacity-60">
                    <input
                        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
                        disabled
                        placeholder="Chat is coming soon…"
                        type="text"
                    />
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/30">
                        <MessageSquare01Icon className="text-primary-400" size={16} />
                    </div>
                </div>
            </div>
        </div>
    );
}
