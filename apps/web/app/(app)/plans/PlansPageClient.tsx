"use client";

import { CheckmarkCircle01Icon } from "hugeicons-react";

import { Plan } from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { useAuthMeQuery } from "@/hooks/useAuthMutations";

interface PlanConfig {
    key: Plan;
    name: string;
    tagline: string;
    price: string;
    priceDetail: string;
    cta: string;
    featured: boolean;
    features: string[];
}

const plans: PlanConfig[] = [
    {
        key: Plan.EXPLORER,
        name: "Explorer",
        tagline: "For anyone getting started",
        price: "Free",
        priceDetail: "No card needed",
        cta: "Current plan",
        featured: false,
        features: [
            "Unlimited subject tracking",
            "First Look baseline assessment",
            "Progress snapshot (streak, level, strengths)",
            "Daily goal setting",
            "Guide and Companion modes",
        ],
    },
    {
        key: Plan.SCHOLAR,
        name: "Scholar",
        tagline: "For serious learners",
        price: "Coming soon",
        priceDetail: "Billed monthly",
        cta: "Join the waitlist",
        featured: true,
        features: [
            "Everything in Explorer",
            "Unlimited conversation history",
            "Deep-dive session mode",
            "Priority topic recommendations",
            "Weekly progress reports",
            "Guardian sharing (read-only)",
        ],
    },
    {
        key: Plan.HOUSEHOLD,
        name: "Household",
        tagline: "For families learning together",
        price: "Coming soon",
        priceDetail: "Covers up to 4 learners",
        cta: "Join the waitlist",
        featured: false,
        features: [
            "Everything in Scholar",
            "Up to 4 student accounts",
            "Guardian dashboard",
            "Cross-account progress view",
            "Companion controls per child",
            "Shared daily goal tracking",
        ],
    },
];

export function PlansPageClient() {
    const { data: me } = useAuthMeQuery();
    const currentPlan = me?.plan ?? Plan.EXPLORER;

    return (
        <div className="flex flex-col gap-8">
            {/* Page heading */}
            <div className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-500">
                    Plans &amp; billing
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-text-primary">
                    Simple, transparent pricing
                </h1>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                    Lernard grows with you. Start free and unlock more when you are ready.
                </p>
            </div>

            {/* Plan cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                {plans.map((plan) => {
                    const isCurrent = currentPlan === plan.key;

                    return (
                        <Card
                            className={cn(
                                "relative flex flex-col",
                                plan.featured
                                    ? "border-2 border-primary-400 shadow-[0_0_0_4px_rgba(99,102,241,0.08)]"
                                    : "border-border",
                            )}
                            key={plan.key}
                        >
                            {plan.featured && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <Badge tone="primary" className="px-3 py-1 text-xs">
                                        Most popular
                                    </Badge>
                                </div>
                            )}

                            <CardHeader className="pb-3">
                                <CardTitle className="text-xl">{plan.name}</CardTitle>
                                <CardDescription>{plan.tagline}</CardDescription>
                            </CardHeader>

                            <CardContent className="flex flex-1 flex-col gap-6">
                                {/* Price */}
                                <div>
                                    <p className="text-3xl font-bold text-text-primary">{plan.price}</p>
                                    <p className="mt-0.5 text-xs text-text-tertiary">{plan.priceDetail}</p>
                                </div>

                                {/* CTA */}
                                <Button
                                    className="w-full"
                                    disabled={isCurrent}
                                    variant={plan.featured ? "primary" : "secondary"}
                                >
                                    {isCurrent ? "Your current plan" : plan.cta}
                                </Button>

                                {/* Features */}
                                <ul className="flex flex-col gap-2.5">
                                    {plan.features.map((feature) => (
                                        <li className="flex items-start gap-2.5 text-sm text-text-secondary" key={feature}>
                                            <CheckmarkCircle01Icon className="mt-0.5 shrink-0 text-primary-500" size={16} />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <p className="text-center text-xs text-text-tertiary">
                Scholar and Household plans are in development. Join the waitlist to be first to know.
            </p>
        </div>
    );
}
