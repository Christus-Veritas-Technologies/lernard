import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { UserSettings } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { capitalize, formatDepthLabel } from '@/lib/formatters';
import { NativeAuthError, nativeApiFetch } from '@/lib/native-api';

interface AuthUser {
    id: string;
    name: string;
    email: string | null;
    role: string;
    plan: string;
    onboardingComplete: boolean;
    firstLookComplete: boolean;
    profilePictureUrl: string | null;
}

export default function ProfileScreen() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function loadProfile() {
            setLoading(true);
            setError(null);

            try {
                const [authUser, userSettings] = await Promise.all([
                    nativeApiFetch<AuthUser>(ROUTES.AUTH.ME),
                    nativeApiFetch<UserSettings>(ROUTES.SETTINGS.GET),
                ]);

                if (cancelled) return;
                setUser(authUser);
                setSettings(userSettings);
            } catch (loadError) {
                if (cancelled) return;
                setError(loadError instanceof Error ? loadError : new Error('Could not load profile.'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadProfile();
        return () => {
            cancelled = true;
        };
    }, [requestVersion]);

    async function onPickAvatar() {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];
        const uri = asset.uri;
        const fileName = uri.split('/').pop() ?? 'avatar.jpg';
        const mimeType = asset.mimeType ?? 'image/jpeg';

        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('file', { uri, name: fileName, type: mimeType } as any);

            const response = await nativeApiFetch<{ profilePictureUrl: string }>(
                ROUTES.SETTINGS.AVATAR_UPLOAD,
                { method: 'POST', body: formData },
            );

            setUser((current) => current ? { ...current, profilePictureUrl: response.profilePictureUrl } : current);
        } catch {
            // silently ignore upload errors — the user can try again
        } finally {
            setUploadingAvatar(false);
        }
    }

    if (loading) {
        return <RoleFullScreenLoadingOverlay forceVisible />;
    }

    if (error || !user || !settings) {
        const isAuthError = error instanceof NativeAuthError;

        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle={isAuthError ? 'Back to home' : 'Try again'}
                        badge={isAuthError ? 'Sign in required' : 'Profile failed to load'}
                        description={error?.message ?? 'Something interrupted profile loading.'}
                        onActionPress={isAuthError ? () => router.push('/(app)/(home)') : () => setRequestVersion((v) => v + 1)}
                        title="Profile unavailable"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const initials = user.name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Profile</Text>

                    <TouchableOpacity
                        className="mt-4 self-start"
                        disabled={uploadingAvatar}
                        onPress={() => void onPickAvatar()}
                    >
                        {user.profilePictureUrl ? (
                            <Image
                                className="rounded-full"
                                source={{ uri: user.profilePictureUrl }}
                                style={{ width: 72, height: 72 }}
                            />
                        ) : (
                            <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-indigo-100">
                                <Text className="text-2xl font-semibold text-indigo-600">{initials}</Text>
                            </View>
                        )}
                        <View className="mt-2">
                            <Text className="text-xs text-indigo-500">
                                {uploadingAvatar ? 'Uploading...' : 'Tap to change'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <Text className="mt-3 text-3xl font-semibold text-slate-900">{user.name}</Text>
                    <Text className="mt-2 text-base leading-7 text-slate-600">{user.email ?? 'No email available'}</Text>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Account</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">Role: {user.role}</Text>
                    <Text className="mt-1 text-base leading-7 text-slate-600">Plan: {user.plan}</Text>
                    <Text className="mt-1 text-base leading-7 text-slate-600">
                        Onboarding: {user.onboardingComplete ? 'Complete' : 'In progress'}
                    </Text>
                    <Text className="mt-1 text-base leading-7 text-slate-600">
                        First Look: {user.firstLookComplete ? 'Complete' : 'Pending'}
                    </Text>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Learning defaults</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        Mode: {capitalize(settings.learningMode)}
                    </Text>
                    <Text className="mt-1 text-base leading-7 text-slate-600">
                        Appearance: {capitalize(settings.appearance)}
                    </Text>
                    <Text className="mt-1 text-base leading-7 text-slate-600">
                        Preferred depth: {formatDepthLabel(settings.preferredDepth)}
                    </Text>
                    <Text className="mt-1 text-base leading-7 text-slate-600">
                        Daily goal: {settings.dailyGoal} sessions
                    </Text>
                    <Button className="mt-5 self-start" onPress={() => router.push('/settings')} title="Back to settings" variant="ghost" />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
