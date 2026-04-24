"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "../../lib/cn";

interface NavItem {
    href: string;
    label: string;
    description: string;
}

const navItems: NavItem[] = [
    {
        href: "/home",
        label: "Home",
        description: "Today",
    },
    {
        href: "/learn",
        label: "Learn",
        description: "Lessons",
    },
    {
        href: "/quiz",
        label: "Quiz",
        description: "Practice",
    },
    {
        href: "/chat",
        label: "Chat",
        description: "Ask Lernard",
    },
    {
        href: "/progress",
        label: "Progress",
        description: "Read on You",
    },
    {
        href: "/settings",
        label: "Settings",
        description: "Your setup",
    },
    {
        href: "/guardian",
        label: "Household",
        description: "Guardian",
    },
];

export function AppShellNav() {
    const pathname = usePathname();

    return (
        <>
            <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_48%,#fff8f4_100%)] lg:block">
                <div className="flex h-full flex-col px-4 py-5">
                    <div className="rounded-3xl border border-border bg-surface p-5 shadow-[0_20px_60px_-36px_rgba(30,42,84,0.45)]">
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-500">
                            Lernard
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold text-text-primary">
                            Your learning studio
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">
                            Move between lessons, practice, settings, and your Household without losing context.
                        </p>
                    </div>

                    <nav className="mt-6 flex-1 space-y-2">
                        {navItems.map((item) => {
                            const isActive = matchesPath(pathname, item.href);

                            return (
                                <Link
                                    className={cn(
                                        "flex items-center justify-between rounded-2xl px-4 py-3 transition",
                                        isActive
                                            ? "bg-primary-500 text-text-inverse shadow-[0_16px_40px_-24px_rgba(72,94,224,0.7)]"
                                            : "bg-white/70 text-text-primary hover:bg-surface",
                                    )}
                                    href={item.href}
                                    key={item.href}
                                >
                                    <div>
                                        <p className="text-sm font-semibold">{item.label}</p>
                                        <p
                                            className={cn(
                                                "text-xs",
                                                isActive ? "text-primary-100" : "text-text-secondary",
                                            )}
                                        >
                                            {item.description}
                                        </p>
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

                    <div className="rounded-3xl border border-border bg-surface/90 p-4 text-sm leading-6 text-text-secondary">
                        Home, Learn, Guardian, and Companion controls are now live. The remaining sections below are aligned visually here while their deeper flows are still landing.
                    </div>
                </div>
            </aside>

            <nav className="fixed bottom-3 left-3 right-3 z-20 rounded-[28px] border border-border bg-surface/95 p-2 shadow-[0_18px_50px_-30px_rgba(30,42,84,0.45)] backdrop-blur lg:hidden">
                <div className="grid grid-cols-4 gap-2">
                    {navItems.slice(0, 4).map((item) => {
                        const isActive = matchesPath(pathname, item.href);

                        return (
                            <Link
                                className={cn(
                                    "flex min-h-14 flex-col items-center justify-center rounded-2xl px-2 text-center transition",
                                    isActive
                                        ? "bg-primary-500 text-text-inverse"
                                        : "text-text-secondary hover:bg-background-subtle",
                                )}
                                href={item.href}
                                key={item.href}
                            >
                                <span className="text-xs font-semibold">{item.label}</span>
                                <span
                                    className={cn(
                                        "mt-1 text-[11px]",
                                        isActive ? "text-primary-100" : "text-text-tertiary",
                                    )}
                                >
                                    {item.description}
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