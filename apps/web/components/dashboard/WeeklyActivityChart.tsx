import type { DayActivity } from "@lernard/shared-types";

interface WeeklyActivityChartProps {
    activity: DayActivity[];
    streak: number;
}

const SVG_W = 340;
const SVG_H = 160;
const PADDING_X = 20;
const PADDING_TOP = 40;
const PADDING_BOTTOM = 28;

const CHART_W = SVG_W - PADDING_X * 2;
const CHART_H = SVG_H - PADDING_TOP - PADDING_BOTTOM;

const PRIMARY_COLOR = "#6478B8";
const PRIMARY_FILL = "#6478B8";

function getY(active: boolean): number {
    return PADDING_TOP + (active ? 0.1 : 0.8) * CHART_H;
}

function buildCubicPath(points: Array<{ x: number; y: number }>): string {
    if (points.length < 2) return "";
    let d = `M ${points[0]!.x} ${points[0]!.y}`;
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]!;
        const curr = points[i]!;
        const cpX = (prev.x + curr.x) / 2;
        d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
}

export function WeeklyActivityChart({ activity, streak }: WeeklyActivityChartProps) {
    const days = activity.length > 0 ? activity : Array.from({ length: 7 }, (_, i) => ({
        day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
        active: false,
    }));

    const xStep = CHART_W / (days.length - 1);

    const points = days.map((d, i) => ({
        x: PADDING_X + i * xStep,
        y: getY(d.active),
    }));

    const linePath = buildCubicPath(points);

    // Area: close back along the bottom
    const baseY = PADDING_TOP + CHART_H;
    const areaPath =
        linePath +
        ` L ${points[points.length - 1]!.x} ${baseY}` +
        ` L ${points[0]!.x} ${baseY} Z`;

    // Find peak (most-recent active day) for the badge
    let peakIndex = days.length - 1;
    for (let i = days.length - 1; i >= 0; i--) {
        if (days[i]!.active) {
            peakIndex = i;
            break;
        }
    }
    const badgeX = points[peakIndex]!.x;
    const badgeY = points[peakIndex]!.y - 14;

    const badgeText = `${streak} day streak`;
    const badgeW = badgeText.length * 6.5 + 16;
    const badgeH = 22;

    return (
        <div className="flex flex-col gap-1">
            <svg
                height={SVG_H}
                overflow="visible"
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                width="100%"
            >
                {/* Area fill */}
                <defs>
                    <linearGradient id="wac-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={PRIMARY_FILL} stopOpacity="0.18" />
                        <stop offset="100%" stopColor={PRIMARY_FILL} stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#wac-fill)" />

                {/* Line */}
                <path
                    d={linePath}
                    fill="none"
                    stroke={PRIMARY_COLOR}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                />

                {/* Data points */}
                {points.map((p, i) => (
                    <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        fill={days[i]!.active ? PRIMARY_COLOR : "#D1D5E8"}
                        r={3.5}
                    />
                ))}

                {/* Floating streak badge */}
                {streak > 0 && (
                    <g>
                        <rect
                            fill="#1A1A2E"
                            height={badgeH}
                            rx={8}
                            ry={8}
                            width={badgeW}
                            x={badgeX - badgeW / 2}
                            y={badgeY - badgeH}
                        />
                        <text
                            dominantBaseline="middle"
                            fill="white"
                            fontSize={10}
                            fontWeight="600"
                            textAnchor="middle"
                            x={badgeX}
                            y={badgeY - badgeH / 2}
                        >
                            {badgeText}
                        </text>
                    </g>
                )}

                {/* X-axis labels */}
                {days.map((d, i) => (
                    <text
                        key={i}
                        dominantBaseline="hanging"
                        fill="#9CA3AF"
                        fontSize={10}
                        textAnchor="middle"
                        x={points[i]!.x}
                        y={PADDING_TOP + CHART_H + 8}
                    >
                        {d.day}
                    </text>
                ))}
            </svg>
        </div>
    );
}
