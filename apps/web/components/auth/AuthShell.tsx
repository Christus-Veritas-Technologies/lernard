import type { ComponentType, ReactNode } from "react";

import { ArrowRight01Icon, SparklesIcon } from "hugeicons-react";

import { Card } from "@/components/ui/Card";
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
        <Card className={cn("auth-orb-background relative overflow-hidden rounded-4xl border border-white/70 bg-white/92 p-0 shadow-[0_24px_80px_-48px_rgba(30,42,84,0.55)] backdrop-blur", className)}>
            <div className="absolute inset-x-6 top-6 h-24 rounded-full bg-primary-200/35 blur-3xl" />

            <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:min-h-150 lg:gap-8 lg:p-7">
                <div className="max-w-lg space-y-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary-700 ring-1 ring-inset ring-primary-100">
                        {badge}
                    </span>
                    <div className="space-y-3">
                        <h1 className="max-w-md text-3xl font-semibold tracking-tight text-primary-900 sm:text-4xl">
                            {title}
                        </h1>
                        <p className="max-w-md text-sm leading-6 text-text-secondary sm:text-base">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="grid gap-3">
                    {highlights.map((highlight) => {
                        const Icon = highlight.icon;

                        return (
                            <Card
                                className={cn(
                                    "border-white/80 bg-white/85 backdrop-blur",
                                    highlight.tone === "secondary" && "bg-secondary-50/85",
                                )}
                                key={highlight.title}
                            >
                                <div className="flex items-start gap-3.5">
                                    <span
                                        className={cn(
                                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                                            highlight.tone === "secondary"
                                                ? "bg-secondary-100 text-secondary-700"
                                                : "bg-primary-100 text-primary-700",
                                        )}
                                    >
                                        <Icon size={20} strokeWidth={1.7} />
                                    </span>
                                    <div className="space-y-1.5">
                                        <p className="text-sm font-semibold text-text-primary">{highlight.title}</p>
                                        <p className="text-xs leading-5 text-text-secondary sm:text-sm">{highlight.description}</p>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                <div className="mx-auto w-full max-w-md space-y-6">{children}</div>
                {footer ? <div className="border-t border-border pt-6 text-sm text-text-secondary">{footer}</div> : null}
            </div>
        </Card>
    );
}