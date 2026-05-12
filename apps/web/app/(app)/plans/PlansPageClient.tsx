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
    limits: string[];
}

const studentPlans: PlanConfig[] = [
    {
        key: Plan.EXPLORER,
        name: "Explorer",
        tagline: "For anyone getting started",
        price: "Free",
        priceDetail: "No card needed",
        cta: "Current plan",
        featured: false,
        features: [
            "First Look baseline assessment",
            "Progress snapshot (streak, level, strengths)",
            "Daily goal setting",
            "Guide and Companion modes",
        ],
        limits: [
            "2 lessons per day",
            "2 quizzes per day",
            "1 project per day",
            "10 chat messages per day",
            "100 MB storage",
        ],
    },
    {
        key: Plan.STUDENT_SCHOLAR,
        name: "Student Scholar",
        tagline: "For consistent learners",
        price: "Coming soon",
        priceDetail: "Billed monthly",
        cta: "Join the waitlist",
        featured: false,
        features: [
            "Everything in Explorer",
            "Full conversation history",
            "Guardian sharing (read-only)",
            "Weekly progress reports",
        ],
        limits: [
            "40 lessons per month",
            "40 quizzes per month",
            "5 projects per month",
            "500 chat messages per month",
            "500 MB storage",
        ],
    },
    {
        key: Plan.STUDENT_PRO,
        name: "Student Pro",
        tagline: "For serious exam preparation",
        price: "Coming soon",
        priceDetail: "Billed monthly",
        cta: "Join the waitlist",
        featured: true,
        features: [
            "Everything in Student Scholar",
            "Extended sessions",
            "Priority content recommendations",
            "Deep-dive mode",
        ],
        limits: [
            "120 lessons per month",
            "120 quizzes per month",
            "15 projects per month",
            "1,500 chat messages per month",
            "2 GB storage",
        ],
    },
];

const guardianPlans: PlanConfig[] = [
    {
        key: Plan.GUARDIAN_FAMILY_STARTER,
        name: "Family Starter",
        tagline: "For households beginning with Lernard",
        price: "Coming soon",
        priceDetail: "Billed monthly",
        cta: "Join the waitlist",
        featured: false,
        features: [
            "Guardian dashboard",
            "Companion controls per child",
            "Cross-account progress view",
            "Shared daily goal tracking",
        ],
        limits: [
            "50 lessons per child/month",
            "50 quizzes per child/month",
            "5 projects per child/month",
            "600 chat messages per child/month",
            "1 GB storage",
        ],
    },
    {
        key: Plan.GUARDIAN_FAMILY_STANDARD,
        name: "Family Standard",
        tagline: "For active families",
        price: "Coming soon",
        priceDetail: "Billed monthly",
        cta: "Join the waitlist",
        featured: true,
        features: [
            "Everything in Family Starter",
            "Priority support",
            "Detailed learning insights per child",
        ],
        limits: [
            "80 lessons per child/month",
            "80 quizzes per child/month",
            "10 projects per child/month",
            "800 chat messages per child/month",
            "2 GB storage",
        ],
    },
    {
        key: Plan.GUARDIAN_FAMILY_PREMIUM,
        name: "Family Premium",
        tagline: "For families who want it all",
        price: "Coming soon",
        priceDetail: "Billed monthly",
        cta: "Join the waitlist",
        featured: false,
        features: [
            "Everything in Family Standard",
            "Dedicated onboarding call",
            "Custom study plans per child",
        ],
        limits: [
            "150 lessons per child/month",
            "150 quizzes per child/month",
            "15 projects per child/month",
            "1,200 chat messages per child/month",
            "5 GB storage",
        ],
    },
];

function PlanCard({ plan, currentPlan }: { plan: PlanConfig; currentPlan: Plan }) {
    const isCurrent = currentPlan === plan.key;

    return (
        <Card
            className={cn(
                "relative flex flex-col",
                plan.featured
                    ? "border-2 border-primary-400 shadow-[0_0_0_4px_rgba(99,102,241,0.08)]"
                    : "border-border",
            )}
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

                {/* Limits */}
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                        {plan.key === Plan.EXPLORER ? "Daily limits" : "Monthly limits"}
                    </p>
                    <ul className="flex flex-col gap-2">
                        {plan.limits.map((limit) => (
                            <li className="text-sm text-text-secondary" key={limit}>
                                <span className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-primary-300" />
                                {limit}
                            </li>
                        ))}
                    </ul>
                </div>

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
}

export function PlansPageClient() {
    const { data: me } = useAuthMeQuery();
    const currentPlan = me?.plan ?? Plan.EXPLORER;

    return (
        <div className="flex flex-col gap-10">
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

            {/* Student plans */}
            <section className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-text-primary">Student plans</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                    {studentPlans.map((plan) => (
                        <PlanCard key={plan.key} plan={plan} currentPlan={currentPlan} />
                    ))}
                </div>
            </section>

            {/* Guardian plans */}
            <section className="flex flex-col gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-text-primary">Guardian plans</h2>
                    <p className="mt-1 text-sm text-text-secondary">
                        Manage multiple student accounts from a single Guardian dashboard.
                    </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    {guardianPlans.map((plan) => (
                        <PlanCard key={plan.key} plan={plan} currentPlan={currentPlan} />
                    ))}
                </div>
            </section>

            <p className="text-center text-xs text-text-tertiary">
                Paid plans are in development. Join the waitlist to be notified at launch.
            </p>
        </div>
    );
}
