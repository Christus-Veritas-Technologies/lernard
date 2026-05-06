"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import type { ReactNode } from "react";
import { useState } from "react";

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: 1,
                        staleTime: 30_000,
                    },
                    mutations: {
                        retry: 0,
                    },
                },
            }),
    );

    const content = <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

    if (!googleClientId) {
        return content;
    }

    return <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>;
}