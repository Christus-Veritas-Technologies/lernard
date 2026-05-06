import type { AuthUser } from "@lernard/shared-types";

export function getPostAuthRoute(user: AuthUser): string {
    return getPostCallbackRoute(user.onboardingComplete);
}

export function getPostAccountTypeRoute(): string {
    return "/profile-setup";
}

export function getPostCallbackRoute(onboardingComplete: boolean): string {
    return onboardingComplete ? "/home" : "/account-type";
}