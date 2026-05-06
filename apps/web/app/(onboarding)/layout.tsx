export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <div className="w-full max-w-md">
                <div className="mb-8 h-1 w-full rounded-full bg-primary-100">
                    <div className="h-1 w-1/3 rounded-full bg-primary-400 transition-all" />
                </div>
                {children}
            </div>
        </div>
    );
}
