import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/store/store';

export default function OnboardingLayout() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const onboardingComplete = useAuthStore((state) => state.onboardingComplete);

    if (!isAuthenticated) {
        return <Redirect href="/(auth)/login" />;
    }

    if (onboardingComplete) {
        return <Redirect href="/(app)/(home)" />;
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}
