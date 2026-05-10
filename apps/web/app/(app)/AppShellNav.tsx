"use client";

import type { ComponentType } from "react";
import {
    BookOpen01Icon,
    ChartBarLineIcon,
    FolderLibraryIcon,
    Home01Icon,
    Message01Icon,
    SchoolBell01Icon,
    Settings02Icon,
    UserGroupIcon,
} from "hugeicons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

import { useAuthMeQuery } from "@/hooks/useAuthMutations";

type NavIcon = ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;

interface NavItem {
    href: string;
    label: string;
    description: string;
    icon: NavIcon;
}

const studentNavItems: NavItem[] = [
    { href: "/home", label: "Home", description: "Today", icon: Home01Icon },
    { href: "/learn", label: "Lessons", description: "Set Work", icon: BookOpen01Icon },
    { href: "/practice-exams", label: "Practice Exams", description: "Test yourself", icon: SchoolBell01Icon },
    { href: "/projects", label: "Projects", description: "Coursework", icon: FolderLibraryIcon },
    { href: "/progress", label: "Progress", description: "Read on You", icon: ChartBarLineIcon },
    { href: "/chat", label: "Chat", description: "Ask Lernard", icon: Message01Icon },
    { href: "/settings", label: "Settings", description: "Your setup", icon: Settings02Icon },
];

const guardianNavItems: NavItem[] = [
    { href: "/home", label: "Home", description: "Dashboard", icon: Home01Icon },
    { href: "/guardian", label: "My Children", description: "Household", icon: UserGroupIcon },
    { href: "/settings", label: "Settings", description: "Your setup", icon: Settings02Icon },
];

export function AppShellNav() {
    const pathname = usePathname();
    const { data: me } = useAuthMeQuery();
    const isGuardian = me?.role === "guardian";
    const navItems = isGuardian ? guardianNavItems : studentNavItems;
    const mobileNavItems = isGuardian ? guardianNavItems : studentNavItems.slice(0, 5);
    const sidebarDescription = isGuardian
        ? "Manage your children's learning and configure your household."
        : "Move between home, progress, chat, settings, and your household.";
    const mobileGridCols = isGuardian ? "grid-cols-3" : "grid-cols-5";

    return (
        <>
            <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_48%,#fff8f4_100%)] lg:block">
                <div className="flex h-full flex-col px-4 py-5">
                    <div className="rounded-3xl border border-border bg-surface p-5 shadow-[0_20px_60px_-36px_rgba(30,42,84,0.45)]">
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-500">
                            Lernard
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold text-text-primary">
                            {isGuardian ? "Guardian hub" : "Your learning studio"}
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">
                            {sidebarDescription}
                        </p>
                    </div>

                    <nav className="mt-6 flex-1 space-y-2">
                        {navItems.map((item) => {
                            const isActive = matchesPath(pathname, item.href);
                            const Icon = item.icon;

                            return (
                                <Link
                                    className={cn(
                                        "flex items-center justify-between rounded-2xl px-4 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                        isActive
                                            ? "bg-primary-500 text-text-inverse shadow-[0_16px_40px_-24px_rgba(72,94,224,0.7)]"
                                            : "bg-white/70 text-text-primary hover:bg-surface",
                                    )}
                                    href={item.href}
                                    key={item.href}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={cn(
                                                "flex h-11 w-11 items-center justify-center rounded-2xl",
                                                isActive ? "bg-white/16" : "bg-background text-primary-500",
                                            )}
                                        >
                                            <Icon className={isActive ? "text-text-inverse" : "text-primary-500"} size={22} strokeWidth={1.9} />
                                        </span>

                                        <div>
                                            <p className={cn("text-sm font-semibold", isActive ? "text-text-inverse" : "text-text-primary")}>
                                                {item.label}
                                            </p>
                                            <p className={cn("text-xs", isActive ? "text-primary-100" : "text-text-secondary")}>
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={cn(
                                            "rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-[0.16em]",
                                            isActive
                                                ? "bg-white/20 text-text-inverse"
                                                : "bg-background text-text-tertiary",
                                        )}
                                    >
                                        {item.label.slice(0, 1)}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            <nav className="fixed bottom-3 left-3 right-3 z-20 rounded-[28px] border border-border bg-surface/95 p-2 shadow-[0_18px_50px_-30px_rgba(30,42,84,0.45)] backdrop-blur lg:hidden">
                <div className={cn("grid gap-2", mobileGridCols)}>
                    {mobileNavItems.map((item) => {
                        const isActive = matchesPath(pathname, item.href);
                        const Icon = item.icon;

                        return (
                            <Link
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-4 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                    isActive
                                        ? "bg-primary-500 text-text-inverse"
                                        : "text-text-secondary hover:bg-background-subtle",
                                )}
                                href={item.href}
                                key={item.href}
                            >
                                <Icon className={isActive ? "text-text-inverse" : "text-primary-500"} size={20} strokeWidth={1.9} />
                                <span className={cn("text-xs font-semibold", isActive ? "text-text-inverse" : "text-text-primary")}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}

function matchesPath(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}