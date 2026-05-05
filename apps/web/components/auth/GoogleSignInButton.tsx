import { Button } from "@/components/ui/button";
import { GoogleIcon } from "./GoogleIcon";

export function GoogleSignInButton() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const href = `${apiUrl}/v1/auth/google?state=${encodeURIComponent("client=web")}`;

    return (
        <Button asChild variant="secondary" className="w-full h-12 text-sm font-semibold">
            <a href={href} className="flex items-center justify-center gap-3">
                <GoogleIcon size={18} />
                Continue with Google
            </a>
        </Button>
    );
}
