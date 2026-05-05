"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AuthApiError } from "@/lib/auth-client";
import { useProfileSetupMutation } from "@/hooks/useAuthMutations";
import { AgeGroup, LearningGoal, SessionDepth } from "@lernard/shared-types";

const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
    { value: AgeGroup.PRIMARY, label: "Primary school" },
    { value: AgeGroup.SECONDARY, label: "Secondary school" },
    { value: AgeGroup.UNIVERSITY, label: "University" },
    { value: AgeGroup.PROFESSIONAL, label: "Professional" },
];

const LEARNING_GOALS: { value: LearningGoal; label: string; description: string }[] = [
    { value: LearningGoal.EXAM_PREP, label: "Exam prep", description: "Get ready for upcoming exams" },
    { value: LearningGoal.KEEP_UP, label: "Keep up", description: "Stay on top of my coursework" },
    { value: LearningGoal.LEARN_NEW, label: "Learn something new", description: "Explore a topic from scratch" },
    { value: LearningGoal.FILL_GAPS, label: "Fill the gaps", description: "Strengthen weak areas" },
];

const DEPTHS: { value: SessionDepth; label: string; description: string }[] = [
    { value: SessionDepth.QUICK, label: "Quick", description: "Short bursts, key concepts only" },
    { value: SessionDepth.STANDARD, label: "Standard", description: "Balanced depth and pace" },
    { value: SessionDepth.DEEP, label: "Deep dive", description: "Full explanations and examples" },
];

const COMMON_SUBJECTS = [
    "Maths",
    "English",
    "Science",
    "History",
    "Geography",
    "French",
    "Spanish",
    "Biology",
    "Chemistry",
    "Physics",
    "Computer Science",
    "Art",
    "Music",
    "Economics",
    "Business Studies",
];

export function ProfileSetupClient() {
    const router = useRouter();
    const { mutate, isPending, isError, error } = useProfileSetupMutation();

    const [displayName, setDisplayName] = useState("");
    const [ageGroup, setAgeGroup] = useState<AgeGroup>(AgeGroup.SECONDARY);
    const [grade, setGrade] = useState("");
    const [learningGoal, setLearningGoal] = useState<LearningGoal>(LearningGoal.KEEP_UP);
    const [depth, setDepth] = useState<SessionDepth>(SessionDepth.STANDARD);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [subjectSearch, setSubjectSearch] = useState("");
    const [dailyGoal, setDailyGoal] = useState(3);
    const [formError, setFormError] = useState<string | null>(null);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const filteredSubjects = useMemo(() => {
        const query = subjectSearch.trim().toLowerCase();
        if (!query) {
            return COMMON_SUBJECTS;
        }

        return COMMON_SUBJECTS.filter((subject) => subject.toLowerCase().includes(query));
    }, [subjectSearch]);

    function toggleSubject(subject: string) {
        setSubjects((prev) =>
            prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject],
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormError(null);
        if (subjects.length === 0) {
            setFormError("Please pick at least one subject.");
            return;
        }

        mutate(
            {
                ...(displayName.trim() ? { name: displayName.trim() } : {}),
                ageGroup,
                grade: grade.trim() || null,
                subjects,
                learningGoal,
                preferredSessionLength: dailyGoal * 10,
                preferredDepth: depth,
                dailyGoal,
                timezone,
            },
            {
                onSuccess: () => {
                    router.push("/first-look");
                },
            },
        );
    }

    const apiError =
        isError && error instanceof AuthApiError
            ? error.message
            : isError
                ? "Something went wrong. Please try again."
                : null;

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            {/* Step indicator */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-700">
                        Step 1 of 2
                    </span>
                    <div className="h-px flex-1 bg-primary-200" />
                    <div className="h-1.5 w-6 rounded-full bg-border" />
                </div>
                <h1 className="text-3xl font-bold text-text-primary">Tell us about you</h1>
                <p className="text-sm text-text-secondary">
                    Lernard uses this to personalise every lesson and quiz.
                </p>
            </div>

            {(apiError ?? formError) && (
                <div className="rounded-xl bg-error-bg px-4 py-3 text-sm text-error">
                    {apiError ?? formError}
                </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-text-primary">Display name (optional)</span>
                    <input
                        className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none ring-primary-300 placeholder:text-text-tertiary focus:ring-2"
                        maxLength={50}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="How Lernard should address you"
                        value={displayName}
                    />
                </label>
                <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-text-primary">Grade / level (optional)</span>
                    <input
                        className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none ring-primary-300 placeholder:text-text-tertiary focus:ring-2"
                        maxLength={20}
                        onChange={(event) => setGrade(event.target.value)}
                        placeholder="e.g. Year 10"
                        value={grade}
                    />
                </label>
            </div>

            {/* Age group */}
            <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-text-primary">What stage are you at?</p>
                <div className="grid grid-cols-2 gap-2">
                    {AGE_GROUPS.map(({ value, label }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setAgeGroup(value)}
                            className={`rounded-xl border py-3 text-sm font-medium transition-all ${ageGroup === value
                                ? "border-primary-400 bg-primary-50 text-primary-700"
                                : "border-border bg-surface text-text-secondary hover:border-primary-200"
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Subjects */}
            <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-text-primary">
                    Which subjects?
                    <span className="font-normal text-text-tertiary"> (pick at least 1, up to 10)</span>
                </p>
                <input
                    className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none ring-primary-300 placeholder:text-text-tertiary focus:ring-2"
                    onChange={(event) => setSubjectSearch(event.target.value)}
                    placeholder="Search subjects"
                    value={subjectSearch}
                />
                <div className="flex flex-wrap gap-2">
                    {filteredSubjects.map((subject) => (
                        <button
                            key={subject}
                            type="button"
                            onClick={() => toggleSubject(subject)}
                            className={`rounded-full border px-3.5 py-1.5 text-sm transition-all ${subjects.includes(subject)
                                ? "border-primary-400 bg-primary-100 text-primary-700"
                                : "border-border bg-surface text-text-secondary hover:border-primary-200"
                                }`}
                        >
                            {subject}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-text-tertiary">{subjects.length} selected</p>
            </div>

            {/* Learning goal */}
            <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-text-primary">What&apos;s your main goal?</p>
                <div className="flex flex-col gap-2">
                    {LEARNING_GOALS.map(({ value, label, description }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setLearningGoal(value)}
                            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${learningGoal === value
                                ? "border-primary-400 bg-primary-50"
                                : "border-border bg-surface hover:border-primary-200"
                                }`}
                        >
                            <div
                                className={`h-4 w-4 shrink-0 rounded-full border-2 transition-all ${learningGoal === value
                                    ? "border-primary-500 bg-primary-500"
                                    : "border-border"
                                    }`}
                            />
                            <div>
                                <p className="text-sm font-semibold text-text-primary">{label}</p>
                                <p className="text-xs text-text-secondary">{description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Session depth */}
            <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-text-primary">How do you like to learn?</p>
                <div className="grid grid-cols-3 gap-2">
                    {DEPTHS.map(({ value, label, description }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setDepth(value)}
                            className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${depth === value
                                ? "border-primary-400 bg-primary-50"
                                : "border-border bg-surface hover:border-primary-200"
                                }`}
                        >
                            <span className="text-sm font-semibold text-text-primary">{label}</span>
                            <span className="text-xs leading-relaxed text-text-secondary">{description}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Daily goal */}
            <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-text-primary">
                    Daily lessons goal:{" "}
                    <span className="text-primary-600">{dailyGoal} lesson{dailyGoal !== 1 ? "s" : ""}</span>
                </p>
                <input
                    type="range"
                    min={1}
                    max={10}
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-xs text-text-tertiary">
                    <span>1</span>
                    <span>10</span>
                </div>
            </div>

            <button
                type="submit"
                disabled={isPending || subjects.length === 0}
                className="flex h-12 items-center justify-center rounded-2xl bg-primary-500 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:opacity-60"
            >
                {isPending ? "Saving…" : "Continue to First Look →"}
            </button>
        </form>
    );
}
