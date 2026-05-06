import { Button } from "@/components/ui/Button";

import { GoogleIcon } from "./GoogleIcon";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4002";

export function GoogleSignInButton() {
    return (
        <Button
            asChild
            className="flex w-full items-center justify-center gap-3 rounded-2xl text-sm font-semibold transition-colors"
            variant="secondary"
        >
            <a className="flex gap-2" href={`${apiUrl}/v1/auth/google`}>
                <GoogleIcon size={18} />
                Continue with Google
            </a>
        </Button>
    );
}
