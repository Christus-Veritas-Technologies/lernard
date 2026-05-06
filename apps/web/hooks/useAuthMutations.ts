"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
    AccountTypePayload,
    FirstLookSubmission,
    MagicLinkRequestPayload,
    MagicLinkVerifyPayload,
    ProfileSetupPayload,
} from "@lernard/shared-types";

import {
    getMe,
    logout,
    persistAuthResponse,
    requestMagicLink,
    saveProfileSetup,
    saveSubjects,
    setAccountType,
    skipFirstLook,
    startFirstLook,
    submitFirstLook,
    verifyMagicLink,
} from "@/lib/auth-client";

export function useRequestMagicLinkMutation() {
    return useMutation({
        mutationFn: (payload: MagicLinkRequestPayload) => requestMagicLink(payload),
    });
}

export function useVerifyMagicLinkMutation() {
    return useMutation({
        mutationFn: (payload: MagicLinkVerifyPayload) => verifyMagicLink(payload),
        onSuccess: persistAuthResponse,
    });
}

export function useLogoutMutation() {
    return useMutation({
        mutationFn: logout,
    });
}

export function useAuthMeQuery(enabled = true) {
    return useQuery({
        queryKey: ["auth", "me"],
        queryFn: getMe,
        enabled,
        retry: 0,
    });
}

export function useAccountTypeMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: AccountTypePayload) => setAccountType(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        },
    });
}

export function useProfileSetupMutation() {
    return useMutation({
        mutationFn: (payload: ProfileSetupPayload) => saveProfileSetup(payload),
    });
}

export function useSubjectsMutation() {
    return useMutation({
        mutationFn: (subjects: string[]) => saveSubjects(subjects),
    });
}

export function useFirstLookStartQuery(enabled = true) {
    return useQuery({
        queryKey: ["auth", "onboarding", "first-look"],
        queryFn: startFirstLook,
        enabled,
        retry: 0,
    });
}

export function useFirstLookSubmitMutation() {
    return useMutation({
        mutationFn: (payload: FirstLookSubmission) => submitFirstLook(payload),
    });
}

export function useFirstLookSkipMutation() {
    return useMutation({
        mutationFn: skipFirstLook,
    });
}
