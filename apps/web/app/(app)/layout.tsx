import { AppShellNav } from "./AppShellNav";
import { RequireWebAuth } from "@/components/auth/RequireWebAuth";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <RequireWebAuth>
            <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8fbff_0%,#ffffff_42%,#fff8f3_100%)]">
                <AppShellNav />

                <main className="pb-24 lg:ml-72 lg:pb-0">
                    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                        {children}
                    </div>
                </main>
            </div>
        </RequireWebAuth>
    );
}
