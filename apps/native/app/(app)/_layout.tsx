import { Redirect, Tabs, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';

import { Role } from '@lernard/shared-types';
import { ROUTES } from '@lernard/routes';

import { TabBar } from '@/components/TabBar';
import { GuardianFullScreenLoading } from '@/components/GuardianFullScreenLoading';
import { StudentFullScreenLoading } from '@/components/StudentFullScreenLoading';
import { StudentDrawer } from '@/components/StudentDrawer';
import { nativeApiFetch } from '@/lib/native-api';
import { useAuthStore } from '@/store/store';

export default function AppLayout() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const onboardingComplete = useAuthStore((state) => state.onboardingComplete);
    const role = useAuthStore((state) => state.role);
    const setRole = useAuthStore((state) => state.setRole);
    const setOnboardingComplete = useAuthStore((state) => state.setOnboardingComplete);
    const segments = useSegments();
    const [bootstrapping, setBootstrapping] = useState(isAuthenticated);

    useEffect(() => {
        let cancelled = false;

        if (!isAuthenticated) {
            setBootstrapping(false);
            return () => {
                cancelled = true;
            };
        }

        async function bootstrapRole() {
            setBootstrapping(true);
            try {
                const me = await nativeApiFetch<{ role: Role; onboardingComplete: boolean }>(ROUTES.AUTH.ME);

                if (cancelled) {
                    return;
                }

                setRole(me.role);
                setOnboardingComplete(me.onboardingComplete);
            } catch {
                if (!cancelled) {
                    setRole(null);
                }
            } finally {
                if (!cancelled) {
                    setBootstrapping(false);
                }
            }
        }

        void bootstrapRole();

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, setOnboardingComplete, setRole]);

    if (!isAuthenticated) {
        return <Redirect href="/(auth)/login" />;
    }

    if (bootstrapping) {
        return role === Role.GUARDIAN ? <GuardianFullScreenLoading /> : <StudentFullScreenLoading />;
    }

    if (!onboardingComplete) {
        return <Redirect href="/(auth)/account-type" />;
    }

    const appSection = segments[1] ?? '';

    if (role === Role.GUARDIAN) {
        if (appSection !== 'guardian' && appSection !== 'settings') {
            return <Redirect href="/(app)/guardian" />;
        }
    } else if (role === Role.STUDENT && appSection === 'guardian') {
        return <Redirect href="/(app)/(home)" />;
    }

    return (
        <>
            <Tabs
                initialRouteName={role === Role.GUARDIAN ? 'guardian' : '(home)'}
                screenOptions={{
                    headerShown: false,
                    sceneStyle: {
                        backgroundColor: '#F8FAFC',
                    },
                }}
                tabBar={(props) => <TabBar {...props} />}
            >
                <Tabs.Screen name="(home)" options={{ title: 'Home', href: role === Role.GUARDIAN ? null : undefined }} />
                <Tabs.Screen name="learn/index" options={{ title: 'Lessons', href: role === Role.GUARDIAN ? null : undefined }} />
                <Tabs.Screen name="practice-exams/index" options={{ title: 'Practice Exams', href: role === Role.GUARDIAN ? null : undefined }} />
                <Tabs.Screen name="(chat)/index" options={{ title: 'Chat', href: role === Role.GUARDIAN ? null : undefined }} />
                <Tabs.Screen name="(progress)" options={{ title: 'Progress', href: null }} />
                <Tabs.Screen name="projects/index" options={{ title: 'Projects', href: null }} />
                <Tabs.Screen name="settings" options={{ title: 'Settings', href: role === Role.GUARDIAN ? undefined : null }} />
                <Tabs.Screen name="guardian" options={{ title: 'Household', href: role === Role.GUARDIAN ? undefined : null }} />
                <Tabs.Screen name="learn/[lessonId]" options={{ href: null }} />
                <Tabs.Screen name="learn/complete" options={{ href: null }} />
                <Tabs.Screen name="projects/[projectId]" options={{ href: null }} />
                <Tabs.Screen name="practice-exams/create" options={{ href: null }} />
                <Tabs.Screen name="practice-exams/entry" options={{ href: null }} />
                <Tabs.Screen name="practice-exams/[quizId]" options={{ href: null }} />
                <Tabs.Screen name="practice-exams/results/[quizId]" options={{ href: null }} />
            </Tabs>
            {role === Role.STUDENT ? <StudentDrawer /> : null}
        </>
    );
}
