import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Moon02Icon, Settings02Icon } from 'hugeicons-react-native';

import { ROUTES } from '@lernard/routes';
import { Appearance, type SettingsContent, type UserSettings } from '@lernard/shared-types';

import { Switch } from '@rnr/switch';
import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { NativePageHeader } from '@/components/NativePageHeader';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { nativeApiFetch } from '@/lib/native-api';

const THEME_OPTIONS = [
    { value: Appearance.LIGHT, label: 'Light' },
    { value: Appearance.DARK, label: 'Dark', icon: Moon02Icon },
    { value: Appearance.SYSTEM, label: 'System', icon: Settings02Icon },
];

const TEXT_SIZES: { value: string; label: string }[] = [
    { value: 'small', label: 'Sm' },
    { value: 'medium', label: 'Md' },
    { value: 'large', label: 'Lg' },
    { value: 'xl', label: 'XL' },
];

export default function PreferencesScreen() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(ROUTES.SETTINGS.PAYLOAD);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [savingField, setSavingField] = useState<string | null>(null);

    useEffect(() => {
        if (data?.content?.roleView === 'student') {
            setSettings(data.content.settings);
        }
    }, [data]);

    async function saveAppearance(field: string, value: unknown) {
        setSavingField(field);
        setSettings((s) => s ? { ...s, [field]: value } : s);
        try {
            await nativeApiFetch(ROUTES.SETTINGS.APPEARANCE, {
                method: 'PATCH',
                body: JSON.stringify({ [field]: value }),
            });
        } catch {
            await refetch();
        } finally {
            setSavingField(null);
        }
    }

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice badge="Sign in required" description="Sign in to edit appearance settings." title="Appearance unavailable" tone="warm" />
                </View>
            </SafeAreaView>
        );
    }

    if (loading) return <RoleFullScreenLoadingOverlay forceVisible />;

    if (error || !settings) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Try again"
                        badge="Appearance failed to load"
                        description={error?.message ?? 'Something went wrong.'}
                        onActionPress={refetch}
                        title="Appearance unavailable"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const s = settings as any;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96, paddingTop: 24, gap: 24 }}>
                <NativePageHeader
                    onBackPress={() => router.push('/settings')}
                    subtitle="Theme, text size, and motion"
                    title="Appearance"
                />

                {/* Theme */}
                <View className="gap-2">
                    <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Theme</Text>
                    <View className="flex-row gap-3">
                        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                            <Pressable
                                className={`flex-1 items-center gap-2 rounded-[18px] border py-4 ${
                                    settings.appearance === value
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-slate-200 bg-white'
                                } ${savingField === 'appearance' ? 'opacity-60' : ''}`}
                                disabled={savingField === 'appearance'}
                                key={value}
                                onPress={() => void saveAppearance('appearance', value)}
                            >
                                <Icon color={settings.appearance === value ? '#6366f1' : '#94a3b8'} size={22} />
                                <Text className={`text-xs font-semibold ${settings.appearance === value ? 'text-indigo-700' : 'text-slate-600'}`}>
                                    {label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Text size */}
                <View className="gap-2">
                    <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Text size</Text>
                    <View className="flex-row gap-2">
                        {TEXT_SIZES.map((opt) => (
                            <Pressable
                                className={`flex-1 items-center rounded-[14px] border py-3 ${
                                    s.textSize === opt.value
                                        ? 'border-indigo-500 bg-indigo-500'
                                        : 'border-slate-200 bg-white'
                                } ${savingField === 'textSize' ? 'opacity-60' : ''}`}
                                disabled={savingField === 'textSize'}
                                key={opt.value}
                                onPress={() => void saveAppearance('textSize', opt.value)}
                            >
                                <Text className={`text-sm font-semibold ${s.textSize === opt.value ? 'text-white' : 'text-slate-700'}`}>
                                    {opt.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Reduced motion */}
                <View className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                    <View className={`flex-row items-center justify-between px-4 py-3.5 ${savingField === 'reducedMotion' ? 'opacity-60' : ''}`}>
                        <View className="flex-1 pr-4">
                            <Text className="text-sm font-semibold text-slate-800">Reduced motion</Text>
                            <Text className="mt-0.5 text-xs text-slate-500">Minimise animations across the app</Text>
                        </View>
                        <Switch
                            disabled={savingField === 'reducedMotion'}
                            ios_backgroundColor="#cbd5e1"
                            onValueChange={(v) => void saveAppearance('reducedMotion', v)}
                            thumbColor="#ffffff"
                            trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
                            value={!!s.reducedMotion}
                        />
                    </View>
                </View>

                <Button onPress={() => router.push('/settings')} title="Back to settings" variant="ghost" />
            </ScrollView>
        </SafeAreaView>
    );
}


