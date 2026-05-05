interface SessionsHighlightCardProps {
    totalSessions: number;
    xpLevel: number;
    dailyGoalProgress: number;
    dailyGoalTarget: number;
}

export function SessionsHighlightCard({
    totalSessions,
    xpLevel,
    dailyGoalProgress,
    dailyGoalTarget,
}: SessionsHighlightCardProps) {
    const goalPct = Math.min(
        100,
        Math.round((dailyGoalProgress / Math.max(dailyGoalTarget, 1)) * 100),
    );

    return (
        <div className="relative flex h-full min-h-45 flex-col justify-between overflow-hidden rounded-3xl bg-linear-to-br from-primary-700 to-primary-500 p-6 text-white shadow-lg">
            {/* Background decorative circles */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-6 right-10 h-20 w-20 rounded-full bg-white/8" />

            {/* Content */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary-200">
                    All time
                </p>
                <p className="mt-2 text-4xl font-bold leading-none">
                    {totalSessions.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-primary-100">Sessions completed</p>
            </div>

            {/* Bottom: level + mini goal bar */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                        Level {xpLevel}
                    </span>
                    <span className="text-xs text-primary-100">
                        {dailyGoalProgress}/{dailyGoalTarget} today
                    </span>
                </div>

                {/* Goal progress bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                    <div
                        className="h-full rounded-full bg-white transition-all duration-500"
                        style={{ width: `${goalPct}%` }}
                    />
                </div>
            </div>

            {/* Decorative wave */}
            <svg
                className="pointer-events-none absolute bottom-12 left-0 w-full opacity-20"
                height="40"
                preserveAspectRatio="none"
                viewBox="0 0 200 40"
            >
                <path
                    d="M0 25 C20 10 40 35 60 22 C80 9 100 30 120 20 C140 10 160 28 180 18 L200 15 L200 40 L0 40 Z"
                    fill="white"
                />
            </svg>
        </div>
    );
}
