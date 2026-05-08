"use client";

import { ROUTES } from "@lernard/routes";
import type { ChildCompanionContent, CompanionControls } from "@lernard/shared-types";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChartBarLineIcon, Settings02Icon } from "hugeicons-react";

import { PageHero } from "@/components/dashboard/PageHero";
import { ToggleCard } from "@/components/guardian/ToggleCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { usePagePayload } from "@/hooks/usePagePayload";
import { browserApiFetch } from "@/lib/browser-api";
import { formatRelativeDate } from "@/lib/formatters";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};

interface ChildCompanionClientProps {
    childId: string;
}

export function ChildCompanionClient({ childId }: ChildCompanionClientProps) {
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<ChildCompanionContent>(
        ROUTES.GUARDIAN.CHILD_COMPANION_PAYLOAD(childId),
    );
    const [controls, setControls] = useState<CompanionControls | null>(null);
    const [savedControls, setSavedControls] = useState<CompanionControls | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Changes have not been saved yet.");

    useEffect(() => {
        if (!data?.content.controls) {
            return;
        }

        setControls(data.content.controls);
        setSavedControls(data.content.controls);
        setStatusMessage("Live companion controls loaded.");
    }, [data]);

    function updateControl(key: "showCorrectAnswers" | "allowHints" | "allowSkip", value: boolean) {
        setControls((current) => {
            const nextControls = ensureControls(current);

            return {
                ...nextControls,
                [key]: value,
            };
        });
        setStatusMessage("Changes staged locally. Save when you're ready.");
    }

    async function saveChanges() {
        if (!controls) {
            return;
        }

        setIsSaving(true);
        setStatusMessage("Saving live changes to Lernard...");

        try {
            const updatedControls = await browserApiFetch<CompanionControls>(
                ROUTES.GUARDIAN.CHILD_COMPANION_CONTROLS(childId),
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        showCorrectAnswers: controls.showCorrectAnswers,
                        allowHints: controls.allowHints,
                        allowSkip: controls.allowSkip,
                    }),
                },
            );

            setControls(updatedControls);
            setSavedControls(updatedControls);
            setStatusMessage("Companion controls updated for this child.");
        } catch (saveError) {
            setStatusMessage(
                saveError instanceof Error
                    ? saveError.message
                    : "Something interrupted the save.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    function resetDefaults() {
        setControls({
            ...ensureControls(controls),
            showCorrectAnswers: true,
            allowHints: true,
            allowSkip: false,
        });
        setStatusMessage("Controls reset to the recommended default mix.");
    }

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warm">
                        Sign in required
                    </Badge>
                    <CardTitle>Companion controls need your guardian session</CardTitle>
                    <CardDescription>
                        Lernard can only load and save live companion settings once the guardian session is active.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warning">
                        Live payload failed
                    </Badge>
                    <CardTitle>Companion controls could not load right now</CardTitle>
                    <CardDescription>{error.message}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={refetch}>Try again</Button>
                </CardContent>
            </Card>
        );
    }

    if (loading || !controls || !data) {
        return (
            <div className="grid gap-6">
                <Card className="overflow-hidden bg-[linear-gradient(135deg,#f9fbff_0%,#ffffff_55%,#fff7f2_100%)]">
                    <CardContent className="mt-0 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.9fr)] lg:items-start">
                        <div className="space-y-4">
                            <div className="h-4 w-28 rounded-full bg-background-subtle" />
                            <div className="h-10 w-2/3 rounded-2xl bg-background-subtle" />
                            <div className="h-24 w-full rounded-3xl bg-background-subtle" />
                        </div>
                        <div className="grid gap-4">
                            <div className="h-36 rounded-3xl bg-background-subtle" />
                            <div className="h-36 rounded-3xl bg-background-subtle" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const childName = data.content.child.name;
    const hasUnsavedChanges = Boolean(
        savedControls
        && (
            savedControls.showCorrectAnswers !== controls.showCorrectAnswers
            || savedControls.allowHints !== controls.allowHints
            || savedControls.allowSkip !== controls.allowSkip
        ),
    );

    return (
        <div className="flex flex-col gap-6">
            <PageHero
                aside={
                    <>
                        <StatCard
                            detail="Guardian review stays attached to every change so companion settings remain deliberate."
                            eyebrow="Audit"
                            label="Last updated"
                            tone="primary"
                            value={formatRelativeDate(controls.lastChangedAt)}
                        />
                        <StatCard
                            detail="Hints and answer reveals are currently keeping support high while skip stays locked."
                            eyebrow="Current blend"
                            label="Active supports"
                            tone="cool"
                            value={`${Number(controls.showCorrectAnswers) + Number(controls.allowHints) + Number(controls.allowSkip)}/3`}
                        />
                    </>
                }
                description={`Tune how much help ${childName} receives in lessons and quizzes.`}
                eyebrow="Companion controls"
                title={`Adjust ${childName}'s support settings`}
            >
                <Badge tone="primary">Child ID: {childId}</Badge>
                <Badge tone="warm">Last changed by {controls.lastChangedBy}</Badge>
                <Button disabled={!hasUnsavedChanges || isSaving} onClick={saveChanges}>
                    {isSaving ? "Saving..." : "Save changes"}
                </Button>
                <Button onClick={resetDefaults} variant="secondary">
                    Reset defaults
                </Button>
            </PageHero>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <div className="grid gap-4">
                    <ToggleCard
                        checked={controls.showCorrectAnswers}
                        description="Leave this on when you want quick reassurance after mistakes, or switch it off to keep reflection slower and more deliberate."
                        onCheckedChange={(value) => updateControl("showCorrectAnswers", value)}
                        title="Show correct answers"
                    />
                    <ToggleCard
                        checked={controls.allowHints}
                        description="Hints give a prompt before the full answer. Good when confidence is low but persistence is still the goal."
                        onCheckedChange={(value) => updateControl("allowHints", value)}
                        title="Allow hints"
                    />
                    <ToggleCard
                        checked={controls.allowSkip}
                        description="Skipping can protect momentum, but locking it keeps learners sitting with the hard parts a little longer."
                        onCheckedChange={(value) => updateControl("allowSkip", value)}
                        title="Allow skip"
                    />
                </div>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ChartBarLineIcon size={18} strokeWidth={1.8} />
                                Guardian notes
                            </CardTitle>
                            <CardDescription>
                                Snapshot of the current support mix.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
                                Correct answers: reassurance after mistakes
                            </div>
                            <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
                                Hints: prompts before full answers
                            </div>
                            <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
                                Skip: locked to encourage persistence
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings02Icon size={18} strokeWidth={1.8} />
                                Update status
                            </CardTitle>
                            <CardDescription>
                                Saves directly to the live companion-controls endpoint.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm leading-6 text-text-secondary">{statusMessage}</p>
                            <div className="flex flex-wrap gap-2">
                                <Button disabled={!hasUnsavedChanges || isSaving} onClick={saveChanges}>
                                    {isSaving ? "Saving..." : "Save now"}
                                </Button>
                                <Button onClick={resetDefaults} variant="secondary">
                                    Restore defaults
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    );
}

function ensureControls(controls: CompanionControls | null) {
    return controls ?? {
        showCorrectAnswers: true,
        allowHints: true,
        allowSkip: false,
        lockedByGuardian: true,
        lastChangedAt: new Date().toISOString(),
        lastChangedBy: "Guardian",
    };
}