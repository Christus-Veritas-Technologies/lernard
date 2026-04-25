import type { ComponentType, ReactNode } from "react";

import { ArrowRight01Icon, SparklesIcon } from "hugeicons-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

interface AuthHighlight {
    title: string;
    description: string;
    icon: ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
    tone?: "primary" | "secondary";
}

interface AuthShellProps {
    badge: string;
    title: string;
    description: string;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
    highlights?: AuthHighlight[];
}

const defaultHighlights: AuthHighlight[] = [
    {
        title: "One calm place to start",
        description: "Set your account up once, then Lernard keeps the next step ready for you.",
        icon: SparklesIcon,
        tone: "primary",
    },
    {
        title: "Your learning path adapts fast",
        description: "Login, register, and onboarding all talk to the real backend flow you’ve already started wiring.",
        icon: ArrowRight01Icon,
        tone: "secondary",
    },
];

export function AuthShell({
    badge,
    children,
    className,
    description,
    footer,
    highlights = defaultHighlights,
    title,
}: AuthShellProps) {
    return (
        <div className={cn("grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch", className)}>
            <div className="auth-orb-background relative overflow-hidden rounded-4xl border border-white/70 px-6 py-8 shadow-[0_24px_80px_-48px_rgba(30,42,84,0.55)] sm:px-8 lg:min-h-170 lg:px-10 lg:py-10">
                <div className="absolute inset-x-8 top-8 h-28 rounded-full bg-primary-200/40 blur-3xl" />
                <div className="relative flex h-full flex-col justify-between gap-8">
                    <div className="max-w-xl space-y-5">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary-700 ring-1 ring-inset ring-primary-100">
                            {badge}
                        </span>
                        <div className="space-y-4">
                            <h1 className="max-w-lg text-4xl font-semibold tracking-tight text-primary-900 sm:text-5xl">
                                {title}
                            </h1>
                            <p className="max-w-lg text-base leading-7 text-text-secondary sm:text-lg">
                                {description}
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {highlights.map((highlight) => {
                            const Icon = highlight.icon;

                            return (
                                <Card
                                    className={cn(
                                        "border-white/70 bg-white/80 backdrop-blur",
                                        highlight.tone === "secondary" && "bg-secondary-50/80",
                                    )}
                                    key={highlight.title}
                                >
                                    <div className="flex items-start gap-4">
                                        <span
                                            className={cn(
                                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                                                highlight.tone === "secondary"
                                                    ? "bg-secondary-100 text-secondary-700"
                                                    : "bg-primary-100 text-primary-700",
                                            )}
                                        >
                                            <Icon size={22} strokeWidth={1.7} />
                                        </span>
                                        <div className="space-y-1.5">
                                            <p className="text-sm font-semibold text-text-primary">{highlight.title}</p>
                                            <p className="text-sm leading-6 text-text-secondary">{highlight.description}</p>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>

            <Card className="flex flex-col justify-between rounded-4xl bg-white/95 p-6 sm:p-8 lg:min-h-170">
                <div className="space-y-6">{children}</div>
                {footer ? <div className="mt-8 border-t border-border pt-6 text-sm text-text-secondary">{footer}</div> : null}
            </Card>
        </div>
    );
}