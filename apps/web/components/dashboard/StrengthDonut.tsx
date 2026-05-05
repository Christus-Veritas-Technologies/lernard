import { UserMultiple02Icon } from "hugeicons-react";

import type { StrengthBreakdown } from "@lernard/shared-types";

interface StrengthDonutProps {
    breakdown: StrengthBreakdown;
}

const SIZE = 140;
const STROKE_W = 18;
const RADIUS = (SIZE - STROKE_W) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CX = SIZE / 2;
const CY = SIZE / 2;

const STRONG_COLOR = "#6478B8";
const DEVELOPING_COLOR = "#72B08C";
const NEEDS_WORK_COLOR = "#E8937F";
const TRACK_COLOR = "#F0F2F8";

export function StrengthDonut({ breakdown }: StrengthDonutProps) {
    const total = breakdown.strong + breakdown.developing + breakdown.needsWork;

    if (total === 0) {
        return (
            <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex h-35 w-35 items-center justify-center rounded-full border-18 border-background-subtle">
                    <UserMultiple02Icon className="text-text-tertiary" size={28} strokeWidth={1.5} />
                </div>
                <p className="text-center text-sm text-text-secondary">
                    No topic data yet
                </p>
            </div>
        );
    }

    const strongRatio = breakdown.strong / total;
    const developingRatio = breakdown.developing / total;
    const needsWorkRatio = breakdown.needsWork / total;

    const strongArc = strongRatio * CIRCUMFERENCE;
    const developingArc = developingRatio * CIRCUMFERENCE;
    const needsWorkArc = needsWorkRatio * CIRCUMFERENCE;

    // Largest segment percentage shown in centre
    const largestPct = Math.round(strongRatio * 100);

    return (
        <div className="flex flex-col items-center gap-5">
            <div className="relative flex items-center justify-center">
                <svg
                    className="-rotate-90"
                    height={SIZE}
                    viewBox={`0 0 ${SIZE} ${SIZE}`}
                    width={SIZE}
                >
                    {/* Track */}
                    <circle
                        cx={CX}
                        cy={CY}
                        fill="none"
                        r={RADIUS}
                        stroke={TRACK_COLOR}
                        strokeWidth={STROKE_W}
                    />
                    {/* Strong segment */}
                    <circle
                        cx={CX}
                        cy={CY}
                        fill="none"
                        r={RADIUS}
                        stroke={STRONG_COLOR}
                        strokeDasharray={`${strongArc} ${CIRCUMFERENCE}`}
                        strokeDashoffset={0}
                        strokeLinecap="butt"
                        strokeWidth={STROKE_W}
                    />
                    {/* Developing segment */}
                    <circle
                        cx={CX}
                        cy={CY}
                        fill="none"
                        r={RADIUS}
                        stroke={DEVELOPING_COLOR}
                        strokeDasharray={`${developingArc} ${CIRCUMFERENCE}`}
                        strokeDashoffset={-strongArc}
                        strokeLinecap="butt"
                        strokeWidth={STROKE_W}
                    />
                    {/* Needs work segment */}
                    <circle
                        cx={CX}
                        cy={CY}
                        fill="none"
                        r={RADIUS}
                        stroke={NEEDS_WORK_COLOR}
                        strokeDasharray={`${needsWorkArc} ${CIRCUMFERENCE}`}
                        strokeDashoffset={-(strongArc + developingArc)}
                        strokeLinecap="butt"
                        strokeWidth={STROKE_W}
                    />
                </svg>

                {/* Centre label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-text-primary">{largestPct}%</span>
                    <UserMultiple02Icon
                        className="mt-0.5 text-text-secondary"
                        size={18}
                        strokeWidth={1.5}
                    />
                </div>
            </div>

            {/* Legend */}
            <div className="grid w-full grid-cols-1 gap-2">
                {[
                    {
                        color: STRONG_COLOR,
                        label: "Strong",
                        count: breakdown.strong,
                    },
                    {
                        color: DEVELOPING_COLOR,
                        label: "Developing",
                        count: breakdown.developing,
                    },
                    {
                        color: NEEDS_WORK_COLOR,
                        label: "Needs work",
                        count: breakdown.needsWork,
                    },
                ].map(({ color, label, count }) => (
                    <div className="flex items-center gap-2" key={label}>
                        <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: color }}
                        />
                        <span className="flex-1 text-sm text-text-secondary">{label}</span>
                        <span className="text-sm font-semibold text-text-primary">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
