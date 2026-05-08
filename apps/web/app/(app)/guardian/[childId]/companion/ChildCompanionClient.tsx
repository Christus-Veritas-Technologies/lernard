"use client";

import { ROUTES } from "@lernard/routes";
import type { ChildCompanionContent } from "@lernard/shared-types";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { PageHero } from "@/components/dashboard/PageHero";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { usePagePayload } from "@/hooks/usePagePayload";
import { browserApiFetch } from "@/lib/browser-api";
import { formatRelativeDate } from "@/lib/formatters";

const LOCKED_SETTINGS_OPTIONS = [
    { key: "mode_toggle", label: "Lock learning mode", description: "Prevents switching between Guide and Companion" },
    { key: "subject_manager", label: "Lock subject manager", description: "Prevents adding or removing subjects" },
    { key: "companion_answer_reveal", label: "Lock answer reveal timing", description: "Prevents changing when answers are shown" },
];

interface StagedControls {
    learningMode: "guide" | "companion";
    answerRevealTiming: "after_quiz" | "immediate";
    quizPassThreshold: number;
    lockedSettings: string[];
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

interface ChildCompanionClientProps {
    childId: string;
}

export function ChildCompanionClient({ childId }: ChildCompanionClientProps) {
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<ChildCompanionContent>(
        ROUTES.GUARDIAN.CHILD_COMPANION_PAYLOAD(childId),
    );

    const [staged, setStaged] = useState<StagedControls | null>(null);
    const [saved, setSaved] = useState<StagedControls | null>(null);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const passwordInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!data?.content.controls) return;
        const controls = data.content.controls as any;
        const initial: StagedControls = {
            learningMode: controls.learningMode ?? "guide",
            answerRevealTiming: controls.answerRevealTiming ?? "after_quiz",
            quizPassThreshold: controls.quizPassThreshold ?? 0.7,
            lockedSettings: controls.lockedSettings ?? [],
        };
        setStaged(initial);
        setSaved(initial);
    }, [data]);

    const hasUnsavedChanges = staged !== null && saved !== null && JSON.stringify(staged) !== JSON.stringify(saved);
    const childName = data?.content.child.name ?? "this child";

    function toggleLockedSetting(key: string) {
        setStaged((prev) => {
            if (!prev) return prev;
            const current = prev.lockedSettings;
            return {
                ...prev,
                lockedSettings: current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
            };
        });
    }

    function openPasswordDialog() {
        setPassword("");
        setPasswordError("");
        setShowPasswordDialog(true);
        setTimeout(() => passwordInputRef.current?.focus(), 100);
    }

    async function confirmSave() {
        if (!staged || !password.trim()) return;
        setIsSaving(true);
        setPasswordError("");

        try {
            // Step 1: verify guardian password
            await browserApiFetch(ROUTES.AUTH.GUARDIAN_VERIFY_PASSWORD, {
                method: "POST",
                body: JSON.stringify({ password }),
            });
        } catch {
            setPasswordError("Incorrect password. Please try again.");
            setIsSaving(false);
            return;
        }

        try {
            // Step 2: save companion controls
            await browserApiFetch(ROUTES.GUARDIAN.CHILD_COMPANION_CONTROLS(childId), {
                method: "PATCH",
                body: JSON.stringify({
                    learningMode: staged.learningMode,
                    answerRevealTiming: staged.answerRevealTiming,
                    quizPassThreshold: staged.quizPassThreshold,
                    lockedSettings: staged.lockedSettings,
                }),
            });

            setSaved(staged);
            setShowPasswordDialog(false);
            setToast(`Settings saved for ${childName}.`);
            setTimeout(() => setToast(null), 3000);
        } catch (saveErr) {
            setToast(saveErr instanceof Error ? saveErr.message : "Something went wrong. Please try again.");
            setTimeout(() => setToast(null), 4000);
        } finally {
            setIsSaving(false);
        }
    }

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warm">Sign in required</Badge>
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
                    <Badge className="w-fit" tone="warning">Live payload failed</Badge>
                    <CardTitle>Companion controls could not load right now</CardTitle>
                    <CardDescription>{error.message}</CardDescription>
                </CardHeader>
                <CardContent><Button onClick={refetch}>Try again</Button></CardContent>
            </Card>
        );
    }

    if (loading || !staged || !data) {
        return (
            <div className="grid gap-6">
                <div className="h-48 rounded-3xl bg-background-subtle" />
                <div className="h-64 rounded-3xl bg-background-subtle" />
            </div>
        );
    }

    const controls = data.content.controls as any;

    return (
        <div className="flex flex-col gap-6">
            <PageHero
                aside={
                    <>
                        <StatCard
                            detail="Guardian review stays attached to every change."
                            eyebrow="Audit"
                            label="Last updated"
                            tone="primary"
                            value={formatRelativeDate(controls.lastChangedAt)}
                        />
                        <StatCard
                            detail="The number of settings currently locked from the student."
                            eyebrow="Locked"
                            label="Locked settings"
                            tone="cool"
                            value={`${staged.lockedSettings.length} / ${LOCKED_SETTINGS_OPTIONS.length}`}
                        />
                    </>
                }
                description={`Tune how ${childName} learns — mode, answer timing, pass threshold, and which settings they can change themselves.`}
                eyebrow="Companion controls"
                title={`Adjust ${childName}'s settings`}
            >
                <Badge tone="primary">Last changed by {controls.lastChangedBy}</Badge>
                <Button disabled={!hasUnsavedChanges} onClick={openPasswordDialog}>
                    Save changes
                </Button>
            </PageHero>

            <motion.div
                animate="visible"
                className="flex flex-col gap-6"
                initial="hidden"
                variants={containerVariants}
            >
                {/* Section 1: Learning Mode */}
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Learning mode</CardTitle>
                            <CardDescription>Which mode should {childName} use?</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup
                                onValueChange={(v) => setStaged((p) => p ? { ...p, learningMode: v as "guide" | "companion" } : p)}
                                value={staged.learningMode}
                            >
                                <div className="flex items-start gap-3 rounded-xl border border-border p-4">
                                    <RadioGroupItem id="mode-guide" value="guide" />
                                    <Label className="cursor-pointer" htmlFor="mode-guide">
                                        <p className="font-semibold">Guide</p>
                                        <p className="mt-0.5 text-sm text-text-secondary">
                                            Lernard nudges {childName} toward answers using hints and examples. Best for building independent thinking.
                                        </p>
                                    </Label>
                                </div>
                                <div className="flex items-start gap-3 rounded-xl border border-border p-4">
                                    <RadioGroupItem id="mode-companion" value="companion" />
                                    <Label className="cursor-pointer" htmlFor="mode-companion">
                                        <p className="font-semibold">Companion</p>
                                        <p className="mt-0.5 text-sm text-text-secondary">
                                            Lernard teaches the concept first, quizzes {childName}, then reveals the answer. Best for structured learning with clear milestones.
                                        </p>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Section 2: Answer Reveal (Companion only) */}
                {staged.learningMode === "companion" && (
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Answer reveal timing</CardTitle>
                                <CardDescription>When should Lernard reveal the answer to {childName}?</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <RadioGroup
                                    onValueChange={(v) => setStaged((p) => p ? { ...p, answerRevealTiming: v as "after_quiz" | "immediate" } : p)}
                                    value={staged.answerRevealTiming}
                                >
                                    <div className="flex items-start gap-3 rounded-xl border border-border p-4">
                                        <RadioGroupItem id="reveal-after" value="after_quiz" />
                                        <Label className="cursor-pointer" htmlFor="reveal-after">
                                            <p className="font-semibold">Only after the quiz is passed</p>
                                            <p className="mt-0.5 text-sm text-text-secondary">
                                                {childName} must pass the quiz before seeing the answer. Recommended.
                                            </p>
                                        </Label>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-xl border border-border p-4">
                                        <RadioGroupItem id="reveal-immediate" value="immediate" />
                                        <Label className="cursor-pointer" htmlFor="reveal-immediate">
                                            <p className="font-semibold">Immediately after the concept breakdown</p>
                                            <p className="mt-0.5 text-sm text-text-secondary">
                                                The answer is shown after the explanation, before the quiz. The quiz still runs to reinforce understanding.
                                            </p>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Section 3: Quiz Pass Threshold (Companion only) */}
                {staged.learningMode === "companion" && (
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Quiz pass threshold</CardTitle>
                                <CardDescription>
                                    {childName} must score at least this percentage to receive the answer.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-text-secondary">Minimum score</span>
                                    <span className="text-lg font-bold text-text-primary">
                                        {Math.round(staged.quizPassThreshold * 100)}%
                                    </span>
                                </div>
                                <input
                                    className="w-full accent-[#4f46e5]"
                                    max={100}
                                    min={50}
                                    onChange={(e) => setStaged((p) => p ? { ...p, quizPassThreshold: Number(e.target.value) / 100 } : p)}
                                    step={10}
                                    type="range"
                                    value={Math.round(staged.quizPassThreshold * 100)}
                                />
                                <div className="flex justify-between text-xs text-text-secondary">
                                    <span>50%</span>
                                    <span>70% (recommended)</span>
                                    <span>100%</span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Section 4: Locked Settings */}
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Lock settings from {childName}</CardTitle>
                            <CardDescription>
                                {childName} won&apos;t be able to change these in their own settings.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {LOCKED_SETTINGS_OPTIONS.map((option) => (
                                <label
                                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 hover:bg-background-subtle"
                                    key={option.key}
                                >
                                    <input
                                        checked={staged.lockedSettings.includes(option.key)}
                                        className="mt-0.5 accent-[#4f46e5]"
                                        onChange={() => toggleLockedSetting(option.key)}
                                        type="checkbox"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold">{option.label}</p>
                                        <p className="mt-0.5 text-sm text-text-secondary">{option.description}</p>
                                    </div>
                                </label>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Section 5: Save */}
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardContent className="pt-6">
                            <Button className="w-full" disabled={!hasUnsavedChanges} onClick={openPasswordDialog}>
                                Save changes
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Guardian Password Dialog */}
            <Dialog onOpenChange={setShowPasswordDialog} open={showPasswordDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm your password</DialogTitle>
                        <DialogDescription>
                            To protect {childName}&apos;s settings, please enter your Lernard password.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="guardian-password">Password</Label>
                            <input
                                autoFocus
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                id="guardian-password"
                                onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                                onKeyDown={(e) => e.key === "Enter" && confirmSave()}
                                placeholder="Enter your password"
                                ref={passwordInputRef}
                                type="password"
                                value={password}
                            />
                            {passwordError && (
                                <p className="text-sm text-red-600">{passwordError}</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button className="flex-1" disabled={isSaving || !password.trim()} onClick={confirmSave}>
                                {isSaving ? "Saving..." : "Confirm"}
                            </Button>
                            <Button className="flex-1" onClick={() => setShowPasswordDialog(false)} variant="secondary">
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-2xl bg-text-primary px-5 py-3 text-sm text-white shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}
