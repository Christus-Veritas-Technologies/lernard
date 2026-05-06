"use client";

import { useAuthMeQuery } from "@/hooks/useAuthMutations";

import { GuardianHomePageClient } from "./GuardianHomePageClient";
import { StudentHomePageClient } from "./StudentHomePageClient";

export function HomePageClient() {
    const { data: me, isLoading } = useAuthMeQuery();

    if (isLoading) {
        return <div className="h-72 rounded-3xl bg-background-subtle" />;
    }

    if (me?.role === "guardian") {
        return <GuardianHomePageClient />;
    }

    return <StudentHomePageClient />;
}
