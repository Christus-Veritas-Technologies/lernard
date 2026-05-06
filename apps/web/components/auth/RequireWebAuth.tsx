"use client";

import { getAccessToken, getRefreshToken } from "@lernard/auth-core";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

interface RequireWebAuthProps {
    children: ReactNode;
}

export function RequireWebAuth({ children }: RequireWebAuthProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);

    const hasSession = useMemo(() => {
        return Boolean(getAccessToken() || getRefreshToken());
    }, []);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted || hasSession) {
            return;
        }

        const next = encodeURIComponent(pathname || "/home");
        router.replace(`/login?next=${next}`);
    }, [hasSession, isMounted, pathname, router]);

    if (!isMounted) {
        return <div className="min-h-screen bg-background" />;
    }

    if (!hasSession) {
        return <div className="min-h-screen bg-background" />;
    }

    return <>{children}</>;
}