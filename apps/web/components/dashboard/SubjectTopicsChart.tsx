import type { SubjectTopicBreakdown } from "@lernard/shared-types";

interface SubjectTopicsChartProps {
    data: SubjectTopicBreakdown[];
}

const STRONG_COLOR = "#6478B8";
const DEVELOPING_COLOR = "#72B08C";

const SVG_W = 480;
const SVG_H = 200;
const PAD_L = 38;
const PAD_R = 12;
const PAD_T = 10;
const PAD_B = 38;
const INNER_W = SVG_W - PAD_L - PAD_R;
const INNER_H = SVG_H - PAD_T - PAD_B;

export function SubjectTopicsChart({ data }: SubjectTopicsChartProps) {
    if (data.length === 0) {
        return (
            <div className="flex h-32 items-center justify-center text-sm text-text-secondary">
                Add subjects to see your topic breakdown here.
            </div>
        );
    }

    const maxVal = Math.max(
        1,
        ...data.flatMap((d) => [d.strongCount, d.developingCount]),
    );
    const yMax = Math.ceil(maxVal / 5) * 5 || 5;

    const gridValues = [0, 0.25, 0.5, 0.75, 1].map((pct) => Math.round(yMax * pct));

    const groupW = INNER_W / data.length;
    const barW = Math.min(20, groupW * 0.28);
    const barGap = 4;

    // Find subject with highest combined bar for floating badge
    const totalTopics = data.reduce(
        (sum, d) => sum + d.strongCount + d.developingCount + d.needsWorkCount,
        0,
    );
    let peakGroupIndex = 0;
    let peakVal = -1;
    data.forEach((d, i) => {
        const top = Math.max(d.strongCount, d.developingCount);
        if (top > peakVal) {
            peakVal = top;
            peakGroupIndex = i;
        }
    });
    const peakCx = PAD_L + (peakGroupIndex + 0.5) * groupW;
    const peakBarH = (peakVal / yMax) * INNER_H;
    const peakBarY = PAD_T + INNER_H - peakBarH;
    const badgeLabel = `${totalTopics} topics`;
    const badgeW = badgeLabel.length * 6.8 + 16;
    const badgeH = 22;
    const badgeY = peakBarY - badgeH - 6;

    return (
        <div>
            <svg
                className="w-full"
                preserveAspectRatio="xMidYMid meet"
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            >
                {/* Grid lines */}
                {gridValues.map((val) => {
                    const y = PAD_T + INNER_H - (val / yMax) * INNER_H;
                    return (
                        <g key={val}>
                            <line
                                stroke="#E5E7EB"
                                strokeWidth="1"
                                x1={PAD_L}
                                x2={SVG_W - PAD_R}
                                y1={y}
                                y2={y}
                            />
                            <text
                                dominantBaseline="middle"
                                fill="#9CA3AF"
                                fontSize="11"
                                textAnchor="end"
                                x={PAD_L - 6}
                                y={y}
                            >
                                {val}
                            </text>
                        </g>
                    );
                })}

                {/* Bars per subject */}
                {data.map((d, i) => {
                    const cx = PAD_L + (i + 0.5) * groupW;
                    const b1x = cx - barGap / 2 - barW;
                    const b2x = cx + barGap / 2;

                    const strongH = (d.strongCount / yMax) * INNER_H;
                    const devH = (d.developingCount / yMax) * INNER_H;

                    const strongY = PAD_T + INNER_H - strongH;
                    const devY = PAD_T + INNER_H - devH;

                    const label =
                        d.subjectName.length > 9
                            ? d.subjectName.slice(0, 8) + "…"
                            : d.subjectName;

                    return (
                        <g key={d.subjectId}>
                            {/* Strong bar */}
                            <rect
                                fill={STRONG_COLOR}
                                height={Math.max(strongH, 2)}
                                rx="3"
                                ry="3"
                                width={barW}
                                x={b1x}
                                y={strongY}
                            />
                            {/* Developing bar */}
                            <rect
                                fill={DEVELOPING_COLOR}
                                height={Math.max(devH, 2)}
                                rx="3"
                                ry="3"
                                width={barW}
                                x={b2x}
                                y={devY}
                            />
                            {/* Subject label */}
                            <text
                                dominantBaseline="hanging"
                                fill="#6B7280"
                                fontSize="11"
                                textAnchor="middle"
                                x={cx}
                                y={PAD_T + INNER_H + 8}
                            >
                                {label}
                            </text>
                        </g>
                    );
                })}

                {/* Bottom axis */}
                <line
                    stroke="#E5E7EB"
                    strokeWidth="1"
                    x1={PAD_L}
                    x2={SVG_W - PAD_R}
                    y1={PAD_T + INNER_H}
                    y2={PAD_T + INNER_H}
                />

                {/* Floating total topics badge */}
                {totalTopics > 0 && (
                    <g>
                        <rect
                            fill="#1A1A2E"
                            height={badgeH}
                            rx={8}
                            ry={8}
                            width={badgeW}
                            x={peakCx - badgeW / 2}
                            y={badgeY}
                        />
                        <text
                            dominantBaseline="middle"
                            fill="white"
                            fontSize={10}
                            fontWeight="600"
                            textAnchor="middle"
                            x={peakCx}
                            y={badgeY + badgeH / 2}
                        >
                            {badgeLabel}
                        </text>
                    </g>
                )}
            </svg>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                    <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: STRONG_COLOR }}
                    />
                    <span className="text-xs text-text-secondary">Strong topics</span>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: DEVELOPING_COLOR }}
                    />
                    <span className="text-xs text-text-secondary">Developing topics</span>
                </div>
            </div>
        </div>
    );
}
