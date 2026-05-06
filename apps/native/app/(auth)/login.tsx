import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Mail01Icon } from 'hugeicons-react-native';

import { Text } from '@rnr/text';

import { AuthField } from '@/components/auth/AuthField';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleIcon } from '@/components/auth/GoogleIcon';
import { useNativeRequestMagicLink, useNativeGoogleAuth } from '@/hooks/useAuthMutations';

export default function LoginScreen() {
    const router = useRouter();
    const { mutate, isLoading, error } = useNativeRequestMagicLink();
    const { signIn: googleSignIn, isLoading: isGoogleLoading, error: googleError } = useNativeGoogleAuth();

    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState<string | undefined>();

    function validate() {
        if (!email.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
        return null;
    }

    function handleSubmit() {
        const err = validate();
        if (err) {
            setEmailError(err);
            return;
        }
        setEmailError(undefined);

        mutate(
            { email: email.trim().toLowerCase() },
            {
                onSuccess: () => {
                    router.push({
                        pathname: '/(auth)/check-email',
                        params: { email: email.trim().toLowerCase() },
                    });
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
                    badge="Welcome"
                    title="Sign in"
                    description="Enter your email and we'll send you a one-tap sign-in link."
                >
                    {error ? (
                        <View className="rounded-xl bg-red-50 px-4 py-3">
                            <Text className="text-sm text-red-600">{error}</Text>
                        </View>
                    ) : null}

                    <AuthField
                        label="Email address"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChangeText={setEmail}
                        error={emailError}
                        icon={<Mail01Icon size={18} color="#9CA3AF" />}
                    />

                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={isLoading}
                        className="h-14 items-center justify-center rounded-[24px] bg-primary active:opacity-80"
                        style={{ opacity: isLoading ? 0.6 : 1 }}
                        activeOpacity={0.8}
                    >
                        <Text className="text-base font-bold text-white">
                            {isLoading ? 'Sending link…' : 'Send sign-in link'}
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
