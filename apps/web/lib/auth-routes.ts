import type { AuthUser } from "@lernard/shared-types";

export function getPostAuthRoute(user: AuthUser): string {
    return user.onboardingComplete ? "/home" : "/onboarding/profile-setup";
}

export function getPostAccountTypeRoute(): string {
    return "/onboarding/profile-setup";
}