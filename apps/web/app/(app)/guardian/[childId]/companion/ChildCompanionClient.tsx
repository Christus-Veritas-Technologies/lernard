"use client";

import { useState } from "react";

import { PageHero } from "../../../../../components/dashboard/PageHero";
import { StatCard } from "../../../../../components/dashboard/StatCard";
import { Badge } from "../../../../../components/ui/Badge";
import { Button } from "../../../../../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/Card";
import { formatRelativeDate } from "../../../../../lib/formatters";
import { companionControlState } from "../../../../../lib/page-mock-data";
import { ToggleCard } from "../../../../../components/guardian/ToggleCard";

interface ChildCompanionClientProps {
    childId: string;
    childName: string;
}

export function ChildCompanionClient({ childId, childName }: ChildCompanionClientProps) {
    const [controls, setControls] = useState(companionControlState);
    const [statusMessage, setStatusMessage] = useState(
        "Changes have not been saved yet.",
    );

    function updateControl(key: "showCorrectAnswers" | "allowHints" | "allowSkip", value: boolean) {
        setControls((current) => ({
            ...current,
            [key]: value,
        }));
        setStatusMessage("Changes staged locally. Save when you're ready.");
    }

    function saveChanges() {
        setControls((current) => ({
            ...current,
            lastChangedAt: new Date().toISOString(),
        }));
        setStatusMessage("Companion controls updated for this child.");
    }

    function resetDefaults() {
        setControls({
            ...companionControlState,
            showCorrectAnswers: true,
            allowHints: true,
            allowSkip: false,
        });
        setStatusMessage("Controls reset to the recommended default mix.");
    }

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
                description={`Tune how much help ${childName} receives during lessons and quizzes. Use these guardrails when you want support to feel calmer, firmer, or more independent.`}
                eyebrow="Companion controls"
                title={`Adjust ${childName}'s support settings`}
            >
                <Badge tone="primary">Child ID: {childId}</Badge>
                <Badge tone="warm">Last changed by {controls.lastChangedBy}</Badge>
                <Button onClick={saveChanges}>Save changes</Button>
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
                            <CardTitle>Guardian notes</CardTitle>
                            <CardDescription>
                                A quick summary of what the current mix of help is encouraging.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm leading-6 text-text-secondary">
                            <p>
                                Show correct answers is best kept on while English inference remains a growth area.
                            </p>
                            <p>
                                Hints are still useful because recent science quizzes show effort, but not total fluency.
                            </p>
                            <p>
                                Skip is off right now to encourage persistence before asking for a new prompt.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Update status</CardTitle>
                            <CardDescription>
                                Final verification can be added later through the guardian password check flow.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm leading-6 text-text-secondary">{statusMessage}</p>
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={saveChanges}>Save now</Button>
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