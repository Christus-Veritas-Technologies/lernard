import { GoogleIcon } from "./GoogleIcon";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const href = `${apiUrl}/v1/auth/google?state=${encodeURIComponent("client=web")}`;

    return (
        <Button className=""
            variant="secondary"
        >
            <Link
                href={href}
                className="flex w-full items-center justify-center gap-3 rounded-2xl text-sm font-semibold transition-colors"
            >
                <GoogleIcon size={18} />
                Continue with Google
            </Link>
        </Button>
    );
}
