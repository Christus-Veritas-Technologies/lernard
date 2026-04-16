export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background">
            {/* Desktop sidebar */}
            <aside className="fixed left-0 top-0 hidden h-full w-60 border-r border-border bg-surface lg:block">
                <div className="flex h-16 items-center px-6">
                    <span className="text-xl font-bold text-primary-400">Lernard</span>
                </div>
                <nav className="flex flex-col gap-1 px-3">
                    <span className="text-sm text-text-tertiary">Navigation placeholder</span>
                </nav>
            </aside>

            {/* Main content */}
            <main className="pb-16 lg:ml-60 lg:pb-0">
                <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>

            {/* Mobile bottom bar */}
            <nav className="fixed bottom-0 left-0 right-0 flex h-14 items-center justify-around border-t border-border bg-surface lg:hidden">
                <span className="text-xs text-text-tertiary">Navigation placeholder</span>
            </nav>
        </div>
    );
}
