import type {
    ChildProfileContent,
    CompanionControls,
    GuardianDashboardContent,
    GuardianSummary,
    HomeContent,
    LearnContent,
    PendingInvite,
    SessionRecord,
    SubjectProgress,
} from "@lernard/shared-types";
import { SessionDepth, StrengthLevel } from "@lernard/shared-types";

export interface LearnRecommendation {
    topic: string;
    subject: string;
    reason: string;
    depth: string;
    estimatedMinutes: number;
}

export interface LearnDraft {
    id: string;
    topic: string;
    subject: string;
    status: string;
    nextStep: string;
}

export const homeContent: HomeContent = {
    greeting: "Good afternoon, Kin.",
    streak: 7,
    xpLevel: 12,
    lastLesson: {
        id: "lesson-fractions-01",
        topic: "Equivalent fractions",
        subject: "Mathematics",
    },
    dailyGoalProgress: 3,
    dailyGoalTarget: 5,
    subjects: [
        {
            subjectId: "maths",
            name: "Mathematics",
            priorityIndex: 0,
            strengthLevel: StrengthLevel.DEVELOPING,
            lastActiveAt: "2026-04-24T11:30:00.000Z",
        },
        {
            subjectId: "science",
            name: "Science",
            priorityIndex: 1,
            strengthLevel: StrengthLevel.STRONG,
            lastActiveAt: "2026-04-23T14:00:00.000Z",
        },
        {
            subjectId: "english",
            name: "English",
            priorityIndex: 2,
            strengthLevel: StrengthLevel.NEEDS_WORK,
            lastActiveAt: "2026-04-22T09:15:00.000Z",
        },
    ],
    recentSessions: [
        {
            id: "session-1",
            type: "lesson",
            topic: "Equivalent fractions",
            subject: "Mathematics",
            createdAt: "2026-04-24T11:30:00.000Z",
        },
        {
            id: "session-2",
            type: "quiz",
            topic: "States of matter",
            subject: "Science",
            createdAt: "2026-04-23T14:00:00.000Z",
        },
        {
            id: "session-3",
            type: "lesson",
            topic: "Inference from dialogue",
            subject: "English",
            createdAt: "2026-04-22T09:15:00.000Z",
        },
    ],
};

export const homeQuickActions = [
    {
        title: "Continue your maths run",
        description: "Pick up right where you left off with equivalent fractions.",
        eyebrow: "Continue learning",
        primaryAction: "Resume lesson",
        secondaryAction: "Preview notes",
        detail: "9 minutes left in your current session.",
    },
    {
        title: "Turn a growth area into Set Work",
        description: "Lernard spotted inference as the next skill to strengthen.",
        eyebrow: "Targeted practice",
        primaryAction: "Build lesson",
        secondaryAction: "Start quiz",
        detail: "Recommended because English accuracy dipped this week.",
    },
    {
        title: "Ask for help in chat",
        description: "Switch to Companion mode for worked examples and calm step-by-step help.",
        eyebrow: "Need a nudge?",
        primaryAction: "Open chat",
        secondaryAction: "See recap",
        detail: "Best for confidence checks before tonight's homework.",
    },
];

export const weeklyMomentum = [
    { label: "Mon", value: 45, trailing: "35 min" },
    { label: "Tue", value: 62, trailing: "48 min" },
    { label: "Wed", value: 80, trailing: "1h 3m" },
    { label: "Thu", value: 30, trailing: "22 min" },
    { label: "Fri", value: 72, trailing: "56 min" },
];

export const learnContent: LearnContent = {
    drafts: [
        {
            id: "draft-1",
            topic: "Equivalent fractions",
            subject: "Mathematics",
            status: "Paused midway through section 3",
            nextStep: "Resume lesson",
        },
        {
            id: "draft-2",
            topic: "Writing evidence-backed conclusions",
            subject: "English",
            status: "Saved for later review",
            nextStep: "Review notes",
        },
    ],
    focusTopic: "Inference from character dialogue",
    preferredDepth: SessionDepth.STANDARD,
    preferredSessionLength: 15,
    recommendations: [
        {
            topic: "Fractions on number lines",
            subject: "Mathematics",
            reason: "Builds directly on your unfinished fractions lesson.",
            depth: SessionDepth.QUICK,
            estimatedMinutes: 12,
        },
        {
            topic: "Particle movement in gases",
            subject: "Science",
            reason: "You answered phase-change questions correctly but paused on explanations.",
            depth: SessionDepth.STANDARD,
            estimatedMinutes: 15,
        },
        {
            topic: "Inference from character dialogue",
            subject: "English",
            reason: "This is the clearest growth area in your last two reading sessions.",
            depth: SessionDepth.DEEP,
            estimatedMinutes: 18,
        },
    ],
    subjects: [
        { subjectId: "maths", name: "Mathematics" },
        { subjectId: "science", name: "Science" },
        { subjectId: "english", name: "English" },
    ],
};

export const learnRecommendations: LearnRecommendation[] = learnContent.recommendations.map((recommendation) => ({
    ...recommendation,
    depth:
        recommendation.depth === "quick"
            ? "Quick refresher"
            : recommendation.depth === "deep"
                ? "Deep dive"
                : "Worked examples",
}));

export const learnDrafts: LearnDraft[] = learnContent.drafts;

export const guardianDashboardContent: GuardianDashboardContent = {
    summary: {
        childrenCount: 2,
        activeThisWeek: 2,
        pendingInvites: 1,
        averageStreak: 6,
    },
    children: [
        {
            studentId: "child-ada",
            name: "Ada",
            streak: 9,
            lastActiveAt: "2026-04-24T08:30:00.000Z",
            subjects: [
                { name: "Mathematics", strengthLevel: "strong" },
                { name: "Science", strengthLevel: "developing" },
            ],
        },
        {
            studentId: "child-sam",
            name: "Sam",
            streak: 4,
            lastActiveAt: "2026-04-23T17:45:00.000Z",
            subjects: [
                { name: "English", strengthLevel: "needs_work" },
                { name: "History", strengthLevel: "developing" },
            ],
        },
    ],
    pendingInvites: [
        {
            id: "invite-1",
            childEmail: "new-family-member@example.com",
            sentAt: "2026-04-23T13:10:00.000Z",
            status: "Awaiting acceptance",
        },
    ],
};

export const guardianSummary: GuardianSummary = guardianDashboardContent.summary;

export const pendingInvites: PendingInvite[] = guardianDashboardContent.pendingInvites;

const childProgress: SubjectProgress[] = [
    {
        subjectId: "maths",
        subjectName: "Mathematics",
        strengthLevel: StrengthLevel.STRONG,
        totalLessons: 18,
        totalQuizzes: 9,
        averageScore: 84,
        topics: [
            {
                topic: "Equivalent fractions",
                level: "confident",
                score: 88,
                lastTestedAt: "2026-04-24T08:30:00.000Z",
            },
            {
                topic: "Comparing decimals",
                level: "getting_there",
                score: 68,
                lastTestedAt: "2026-04-21T08:30:00.000Z",
            },
        ],
        lastActiveAt: "2026-04-24T08:30:00.000Z",
    },
    {
        subjectId: "science",
        subjectName: "Science",
        strengthLevel: StrengthLevel.DEVELOPING,
        totalLessons: 11,
        totalQuizzes: 5,
        averageScore: 73,
        topics: [
            {
                topic: "States of matter",
                level: "getting_there",
                score: 74,
                lastTestedAt: "2026-04-23T15:45:00.000Z",
            },
            {
                topic: "Particle movement",
                level: "needs_work",
                score: 58,
                lastTestedAt: "2026-04-19T15:45:00.000Z",
            },
        ],
        lastActiveAt: "2026-04-23T15:45:00.000Z",
    },
    {
        subjectId: "english",
        subjectName: "English",
        strengthLevel: StrengthLevel.NEEDS_WORK,
        totalLessons: 7,
        totalQuizzes: 4,
        averageScore: 61,
        topics: [
            {
                topic: "Inference from dialogue",
                level: "needs_work",
                score: 54,
                lastTestedAt: "2026-04-22T10:20:00.000Z",
            },
            {
                topic: "Finding supporting evidence",
                level: "getting_there",
                score: 67,
                lastTestedAt: "2026-04-20T10:20:00.000Z",
            },
        ],
        lastActiveAt: "2026-04-22T10:20:00.000Z",
    },
];

const childSessions: SessionRecord[] = [
    {
        id: "child-session-1",
        ownerId: "child-ada",
        type: "lesson",
        subject: "Mathematics",
        topic: "Equivalent fractions",
        duration: 24,
        xpEarned: 35,
        createdAt: "2026-04-24T08:30:00.000Z",
        resourceId: "lesson-fractions-01",
    },
    {
        id: "child-session-2",
        ownerId: "child-ada",
        type: "quiz",
        subject: "Science",
        topic: "States of matter",
        duration: 12,
        xpEarned: 18,
        createdAt: "2026-04-23T15:45:00.000Z",
        resourceId: "quiz-states-02",
    },
    {
        id: "child-session-3",
        ownerId: "child-ada",
        type: "lesson",
        subject: "English",
        topic: "Inference from dialogue",
        duration: 19,
        xpEarned: 22,
        createdAt: "2026-04-22T10:20:00.000Z",
        resourceId: "lesson-inference-04",
    },
];

export const childProfileContent: ChildProfileContent = {
    child: guardianDashboardContent.children[0]!,
    progress: childProgress,
    recentSessions: childSessions,
};

export const companionControlState: CompanionControls = {
    showCorrectAnswers: true,
    allowHints: true,
    allowSkip: false,
    lockedByGuardian: true,
    lastChangedAt: "2026-04-21T19:10:00.000Z",
    lastChangedBy: "Guardian",
};

export function getChildProfileContent(childId: string): ChildProfileContent {
    if (childId === "child-sam") {
        return {
            child: guardianDashboardContent.children[1]!,
            progress: childProgress.slice(1),
            recentSessions: childSessions.slice(1),
        };
    }

    return childProfileContent;
}