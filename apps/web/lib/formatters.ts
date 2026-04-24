export function formatRelativeDate(value: string | null) {
    if (!value) {
        return "No recent activity";
    }

    const date = new Date(value);
    const now = new Date();
    const diffInHours = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
        return diffInHours <= 1 ? "Just now" : `${diffInHours}h ago`;
    }

    const diffInDays = Math.round(diffInHours / 24);

    if (diffInDays < 7) {
        return `${diffInDays}d ago`;
    }

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
    });
}

export function formatMinutes(value: number) {
    if (value < 60) {
        return `${value} min`;
    }

    const hours = Math.floor(value / 60);
    const minutes = value % 60;

    if (!minutes) {
        return `${hours}h`;
    }

    return `${hours}h ${minutes}m`;
}

export function formatPercent(value: number | null) {
    if (value === null) {
        return "Awaiting first score";
    }

    return `${Math.round(value)}%`;
}

export function formatSessionsLabel(value: number) {
    return value === 1 ? "1 session" : `${value} sessions`;
}