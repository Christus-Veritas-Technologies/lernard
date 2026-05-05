import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LockPasswordIcon, Mail01Icon } from 'hugeicons-react-native';

import { Text } from '@rnr/text';

import { AuthField } from '@/components/auth/AuthField';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleIcon } from '@/components/auth/GoogleIcon';
import { useNativeLogin, useNativeGoogleAuth } from '@/hooks/useAuthMutations';

export default function LoginScreen() {
    const router = useRouter();
    const { mutate, isLoading, error } = useNativeLogin();
    const { signIn: googleSignIn, isLoading: isGoogleLoading, error: googleError } = useNativeGoogleAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

    function validate() {
        const errors: typeof fieldErrors = {};
        if (!email) errors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email';
        if (!password) errors.password = 'Password is required';
        return errors;
    }

    async function handleSubmit() {
        const errors = validate();
        if (Object.keys(errors).length) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});

        await mutate(
            { email: email.trim().toLowerCase(), password },
            {
                onSuccess: (data) => {
                    if (!data.user.onboardingComplete) {
                        router.replace('/(auth)/account-type');
                    } else {
                        router.replace('/(app)/(home)');
                    }
                },
            },
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
            <ScrollView
                className="flex-1"
                contentContainerClassName="px-5 pb-8 pt-4"
                keyboardShouldPersistTaps="handled"
            >
                <AuthShell
                    badge="Welcome back"
                    title="Log in"
                    description="Lernard remembers exactly where you left off."
                    footer={
                        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                            <Text className="text-center text-sm text-slate-500">
                                Don&apos;t have an account?{' '}
                                <Text className="font-semibold text-primary">Sign up</Text>
                            </Text>
                        </TouchableOpacity>
                    }
                >
                    {error ? (
                        <View className="rounded-xl bg-red-50 px-4 py-3">
                            <Text className="text-sm text-red-600">{error}</Text>
                        </View>
                    ) : null}

                    <AuthField
                        label="Email"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChangeText={setEmail}
                        error={fieldErrors.email}
                        icon={<Mail01Icon size={18} color="#9CA3AF" />}
                    />

                    <AuthField
                        label="Password"
                        secureTextEntry
                        autoComplete="password"
                        placeholder="Your password"
                        value={password}
                        onChangeText={setPassword}
                        error={fieldErrors.password}
                        icon={<LockPasswordIcon size={18} color="#9CA3AF" />}
                    />

                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={isLoading}
                        className="h-14 items-center justify-center rounded-[24px] bg-primary active:opacity-80"
                        style={{ opacity: isLoading ? 0.6 : 1 }}
                        activeOpacity={0.8}
                    >
                        <Text className="text-base font-bold text-white">
                            {isLoading ? 'Logging in…' : 'Log in'}
                        </Text>
                    </TouchableOpacity>

                    <View className="flex-row items-center gap-3 py-1">
                        <View className="h-px flex-1 bg-slate-200" />
                        <Text className="text-xs text-slate-400">or</Text>
                        <View className="h-px flex-1 bg-slate-200" />
                    </View>

                    {googleError ? (
                        <View className="rounded-xl bg-red-50 px-4 py-2">
                            <Text className="text-sm text-red-600">{googleError}</Text>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        onPress={googleSignIn}
                        disabled={isGoogleLoading}
                        className="h-14 flex-row items-center justify-center gap-3 rounded-[24px] border border-slate-200 bg-white active:opacity-80"
                        style={{ opacity: isGoogleLoading ? 0.6 : 1 }}
                        activeOpacity={0.8}
                    >
                        <GoogleIcon size={18} />
                        <Text className="text-base font-semibold text-slate-700">
                            {isGoogleLoading ? 'Signing in…' : 'Continue with Google'}
                        </Text>
                    </TouchableOpacity>
                </AuthShell>
            </ScrollView>
        </SafeAreaView>
    );
}
