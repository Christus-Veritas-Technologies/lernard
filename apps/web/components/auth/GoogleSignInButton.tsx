import { GoogleIcon } from "./GoogleIcon";

export function GoogleSignInButton() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const href = `${apiUrl}/v1/auth/google?state=${encodeURIComponent("client=web")}`;

    return (
        <a
            href={href}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-surface text-sm font-semibold text-text-primary ring-1 ring-inset ring-border shadow-sm transition-colors hover:bg-background-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
            <GoogleIcon size={18} />
            Continue with Google
        </a>
    );
}
