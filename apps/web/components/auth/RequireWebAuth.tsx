"use client";

import { getAccessToken, getRefreshToken } from "@lernard/auth-core";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";

interface RequireWebAuthProps {
    children: ReactNode;
}

export function RequireWebAuth({ children }: RequireWebAuthProps) {
    const router = useRouter();
    const pathname = usePathname();

    const hasSession = useMemo(() => {
        return Boolean(getAccessToken() || getRefreshToken());
    }, []);

    useEffect(() => {
        if (hasSession) {
            return;
        }

        const next = encodeURIComponent(pathname || "/home");
        router.replace(`/login?next=${next}`);
    }, [hasSession, pathname, router]);

    if (!hasSession) {
        return null;
    }

    return <>{children}</>;
}