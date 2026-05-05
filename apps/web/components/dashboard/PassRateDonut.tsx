import { CheckmarkCircle01Icon } from "hugeicons-react";

interface PassRateDonutProps {
    masteredCount: number;
    totalCount: number;
}

const SIZE = 160;
const STROKE_W = 20;
const RADIUS = (SIZE - STROKE_W) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CX = SIZE / 2;
const CY = SIZE / 2;

const MASTERED_COLOR = "#6478B8";
const LEARNING_COLOR = "#E8C87F";
const TRACK_COLOR = "#F0F2F8";

export function PassRateDonut({ masteredCount, totalCount }: PassRateDonutProps) {
    if (totalCount === 0) {
        return (
            <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex h-40 w-40 items-center justify-center rounded-full border-20 border-background-subtle">
                    <CheckmarkCircle01Icon
                        className="text-text-tertiary"
                        size={28}
                        strokeWidth={1.5}
                    />
                </div>
                <p className="text-center text-sm text-text-secondary">No topics yet</p>
            </div>
        );
    }

    const masteredRatio = masteredCount / totalCount;
    const learningCount = totalCount - masteredCount;

    const masteredArc = masteredRatio * CIRCUMFERENCE;
    const learningArc = (1 - masteredRatio) * CIRCUMFERENCE;

    const masteryPct = Math.round(masteredRatio * 100);

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
                    {/* Still learning segment */}
                    <circle
                        cx={CX}
                        cy={CY}
                        fill="none"
                        r={RADIUS}
                        stroke={LEARNING_COLOR}
                        strokeDasharray={`${learningArc} ${CIRCUMFERENCE}`}
                        strokeDashoffset={-masteredArc}
                        strokeLinecap="butt"
                        strokeWidth={STROKE_W}
                    />
                    {/* Mastered segment */}
                    <circle
                        cx={CX}
                        cy={CY}
                        fill="none"
                        r={RADIUS}
                        stroke={MASTERED_COLOR}
                        strokeDasharray={`${masteredArc} ${CIRCUMFERENCE}`}
                        strokeDashoffset={0}
                        strokeLinecap="butt"
                        strokeWidth={STROKE_W}
                    />
                </svg>

                {/* Centre label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-text-primary">{masteryPct}%</span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                        Mastery
                    </span>
                </div>
            </div>

            {/* Legend */}
            <div className="grid w-full grid-cols-1 gap-2">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span
                            className="block h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: MASTERED_COLOR }}
                        />
                        <span className="text-text-secondary">Mastered</span>
                    </div>
                    <span className="font-semibold text-text-primary">{masteredCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span
                            className="block h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: LEARNING_COLOR }}
                        />
                        <span className="text-text-secondary">Still learning</span>
                    </div>
                    <span className="font-semibold text-text-primary">{learningCount}</span>
                </div>
            </div>
        </div>
    );
}
