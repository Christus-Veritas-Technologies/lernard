import { GoogleIcon } from "./GoogleIcon";

export function GoogleSignInButton() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const href = `${apiUrl}/v1/auth/google?state=${encodeURIComponent("client=web")}`;

    return (
        <a
            href={href}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-white text-sm font-semibold text-text-primary shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100"
        >
            <GoogleIcon size={18} />
            Continue with Google
        </a>
    );
}
