import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { SettingsContent, StudentSettingsContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { NativePageHeader } from '@/components/NativePageHeader';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { capitalize } from '@/lib/formatters';
import { nativeApiFetch } from '@/lib/native-api';
import { useAuthStore } from '@/store/store';

export default function AccountScreen() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(ROUTES.SETTINGS.PAYLOAD);
    const logout = useAuthStore((s) => s.logout);

    const [resetConfirm, setResetConfirm] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [unlinkPassword, setUnlinkPassword] = useState('');
    const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isWorking, setIsWorking] = useState(false);
    const [actionError, setActionError] = useState('');

    const content = data?.content?.roleView === 'student' ? (data.content as StudentSettingsContent) : null;

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice badge="Sign in required" description="Sign in to manage your account." title="Account unavailable" tone="warm" />
                </View>
            </SafeAreaView>
        );
    }

    if (loading) return <RoleFullScreenLoadingOverlay forceVisible />;

    if (error || !content) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Try again"
                        badge="Account failed to load"
                        description={error?.message ?? 'Something went wrong.'}
                        onActionPress={refetch}
                        title="Account unavailable"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const { viewer, guardianName, guardianLinkedSince } = content;

    async function handleSignOut() {
        setIsWorking(true);
        try {
            await nativeApiFetch(ROUTES.AUTH.LOGOUT, { method: 'POST' });
        } catch {
            // ignore — clear local auth regardless
        } finally {
            logout();
            router.replace('/(auth)/welcome');
        }
    }

    async function handleResetProgress() {
        if (resetConfirm !== 'RESET') return;
        setIsWorking(true);
        setActionError('');
        try {
            await nativeApiFetch(ROUTES.PROGRESS.RESET, { method: 'DELETE' });
            setResetConfirm('');
            await refetch();
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not reset progress.');
        } finally {
            setIsWorking(false);
        }
    }

    async function handleUnlinkGuardian() {
        setIsWorking(true);
        setActionError('');
        try {
            await nativeApiFetch(ROUTES.SETTINGS.UNLINK_GUARDIAN, {
                method: 'POST',
                body: JSON.stringify({ password: unlinkPassword }),
            });
            setShowUnlinkConfirm(false);
            setUnlinkPassword('');
            await refetch();
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not unlink guardian.');
        } finally {
            setIsWorking(false);
        }
    }

    async function handleDeleteAccount() {
        if (deleteConfirm !== 'DELETE') return;
        setIsWorking(true);
        setActionError('');
        try {
            await nativeApiFetch(ROUTES.SETTINGS.DELETE_ACCOUNT, {
                method: 'DELETE',
                body: JSON.stringify({ password: deletePassword }),
            });
            logout();
            router.replace('/(auth)/welcome');
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not delete account.');
            setIsWorking(false);
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <NativePageHeader
                    onBackPress={() => router.push('/settings')}
                    subtitle="Plan, linked guardian, and data controls"
                    title="Account"
                />

                {/* Plan */}
                <View className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current plan</Text>
                    <Text className="mt-1.5 text-2xl font-semibold text-slate-900">{capitalize(viewer.plan)}</Text>
                    <Button
                        className="mt-4 self-start"
                        onPress={() => router.push('/settings/plans')}
                        title="View plans"
                        variant="secondary"
                    />
                </View>

                {/* Guardian link */}
                {guardianName ? (
                    <View className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Linked guardian</Text>
                        <Text className="mt-1.5 text-base font-semibold text-slate-900">{guardianName}</Text>
                        {guardianLinkedSince ? (
                            <Text className="mt-0.5 text-xs text-slate-500">
                                Linked since {new Date(guardianLinkedSince).toLocaleDateString()}
                            </Text>
                        ) : null}

                        {!showUnlinkConfirm ? (
                            <Button
                                className="mt-4 self-start"
                                onPress={() => setShowUnlinkConfirm(true)}
                                title="Unlink guardian"
                                variant="secondary"
                            />
                        ) : (
                            <View className="mt-4 gap-3">
                                <Text className="text-sm text-slate-700">Enter your password to unlink <Text className="font-semibold">{guardianName}</Text>:</Text>
                                <TextInput
                                    className="rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
                                    maxLength={200}
                                    onChangeText={setUnlinkPassword}
                                    placeholder="Password"
                                    secureTextEntry
                                    value={unlinkPassword}
                                />
                                <View className="flex-row gap-2">
                                    <Button
                                        disabled={isWorking || !unlinkPassword}
                                        onPress={() => void handleUnlinkGuardian()}
                                        title={isWorking ? 'Unlinking...' : 'Confirm unlink'}
                                    />
                                    <Button onPress={() => { setShowUnlinkConfirm(false); setUnlinkPassword(''); }} title="Cancel" variant="ghost" />
                                </View>
                            </View>
                        )}
                    </View>
                ) : null}

                {/* Reset progress */}
                <View className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <Text className="text-base font-semibold text-slate-900">Reset progress</Text>
                    <Text className="mt-1 text-sm text-slate-500">This removes all subject progress, lessons, and quiz history. Your account is kept.</Text>
                    <View className="mt-4 gap-3">
                        <TextInput
                            className="rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
                            maxLength={10}
                            onChangeText={setResetConfirm}
                            placeholder='Type "RESET" to confirm'
                            value={resetConfirm}
                        />
                        <Button
                            disabled={resetConfirm !== 'RESET' || isWorking}
                            onPress={() => void handleResetProgress()}
                            title={isWorking ? 'Resetting...' : 'Reset all progress'}
                            variant="secondary"
                        />
                    </View>
                </View>

                {/* Delete account */}
                <View className="rounded-[24px] border border-red-100 bg-white p-5 shadow-sm">
                    <Text className="text-base font-semibold text-red-700">Delete account</Text>
                    <Text className="mt-1 text-sm text-slate-500">Permanently deletes your account and all data. This cannot be undone.</Text>

                    {!showDeleteConfirm ? (
                        <Button
                            className="mt-4 self-start"
                            onPress={() => setShowDeleteConfirm(true)}
                            title="Delete my account"
                            variant="secondary"
                        />
                    ) : (
                        <View className="mt-4 gap-3">
                            <TextInput
                                className="rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
                                maxLength={10}
                                onChangeText={setDeleteConfirm}
                                placeholder='Type "DELETE" to confirm'
                                value={deleteConfirm}
                            />
                            <TextInput
                                className="rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
                                maxLength={200}
                                onChangeText={setDeletePassword}
                                placeholder="Password"
                                secureTextEntry
                                value={deletePassword}
                            />
                            <View className="flex-row gap-2">
                                <Button
                                    disabled={deleteConfirm !== 'DELETE' || isWorking}
                                    onPress={() => void handleDeleteAccount()}
                                    title={isWorking ? 'Deleting...' : 'Delete permanently'}
                                />
                                <Button onPress={() => { setShowDeleteConfirm(false); setDeleteConfirm(''); setDeletePassword(''); }} title="Cancel" variant="ghost" />
                            </View>
                        </View>
                    )}
                </View>

                {/* Errors */}
                {actionError ? (
                    <View className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3">
                        <Text className="text-sm text-red-700">{actionError}</Text>
                    </View>
                ) : null}

                {/* Sign out */}
                <Pressable
                    className="items-center rounded-[20px] border border-slate-200 bg-white py-4"
                    disabled={isWorking}
                    onPress={() => void handleSignOut()}
                >
                    <Text className="text-sm font-semibold text-slate-700">Sign out</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}
