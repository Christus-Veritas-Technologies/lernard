import { Redirect, Stack } from 'expo-router';

import { Role } from '@lernard/shared-types';

import { useAuthStore } from '@/store/store';

export default function OnboardingLayout() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const onboardingComplete = useAuthStore((state) => state.onboardingComplete);
    const role = useAuthStore((state) => state.role);

    if (!isAuthenticated) {
        return <Redirect href="/(auth)/login" />;
    }

    if (onboardingComplete) {
        return <Redirect href={role === Role.GUARDIAN ? '/(app)/guardian' : '/(app)/(home)'} />;
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}
