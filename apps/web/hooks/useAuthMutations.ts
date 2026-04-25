"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type {
    AccountTypePayload,
    FirstLookSubmission,
    LoginPayload,
    ProfileSetupPayload,
    RegisterPayload,
} from "@lernard/shared-types";

import {
    getMe,
    login,
    logout,
    persistAuthResponse,
    register,
    saveProfileSetup,
    saveSubjects,
    setAccountType,
    skipFirstLook,
    startFirstLook,
    submitFirstLook,
} from "@/lib/auth-client";

export function useLoginMutation() {
    return useMutation({
        mutationFn: (payload: LoginPayload) => login(payload),
        onSuccess: persistAuthResponse,
    });
}

export function useRegisterMutation() {
    return useMutation({
        mutationFn: (payload: RegisterPayload) => register(payload),
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
    return useMutation({
        mutationFn: (payload: AccountTypePayload) => setAccountType(payload),
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