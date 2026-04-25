import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LockPasswordIcon, Mail01Icon, UserIcon } from 'hugeicons-react-native';

import { Text } from '@rnr/text';

import { AuthField } from '@/components/auth/AuthField';
import { AuthShell } from '@/components/auth/AuthShell';
import { useNativeRegister } from '@/hooks/useAuthMutations';

export default function RegisterScreen() {
    const router = useRouter();
    const { mutate, isLoading, error } = useNativeRegister();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accountType, setAccountType] = useState<'student' | 'guardian'>('student');
    const [fieldErrors, setFieldErrors] = useState<{
        name?: string;
        email?: string;
        password?: string;
    }>({});

    function validate() {
        const errors: typeof fieldErrors = {};
        if (!name.trim()) errors.name = 'Name is required';
        else if (name.trim().length > 50) errors.name = 'Name must be 50 characters or fewer';
        if (!email) errors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email';
        if (!password) errors.password = 'Password is required';
        else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
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
            { name: name.trim(), email: email.trim().toLowerCase(), password, accountType },
            {
                onSuccess: () => {
                    router.replace('/(auth)/account-type');
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
                    badge="Join Lernard"
                    title="Create account"
                    description="Your personal AI tutor, learning about you from day one."
                    footer={
                        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                            <Text className="text-center text-sm text-slate-500">
                                Already have an account?{' '}
                                <Text className="font-semibold text-primary">Log in</Text>
                            </Text>
                        </TouchableOpacity>
                    }
                >
                    {error ? (
                        <View className="rounded-xl bg-red-50 px-4 py-3">
                            <Text className="text-sm text-red-600">{error}</Text>
                        </View>
                    ) : null}

                    {/* Account type toggle */}
                    <View className="flex-row rounded-2xl bg-slate-100 p-1">
                        {(['student', 'guardian'] as const).map((type) => (
                            <TouchableOpacity
                                key={type}
                                onPress={() => setAccountType(type)}
                                className={`flex-1 items-center rounded-xl py-2.5 ${accountType === type ? 'bg-white shadow-sm' : ''
                                    }`}
                                activeOpacity={0.7}
                            >
                                <Text
                                    className={`text-sm font-semibold ${accountType === type ? 'text-primary' : 'text-slate-500'
                                        }`}
                                >
                                    {type === 'student' ? 'Student' : 'Guardian'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <AuthField
                        label="Full name"
                        autoCapitalize="words"
                        autoComplete="name"
                        placeholder="Your name"
                        maxLength={50}
                        value={name}
                        onChangeText={setName}
                        error={fieldErrors.name}
                        icon={<UserIcon size={18} color="#9CA3AF" />}
                    />

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
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={password}
                        onChangeText={setPassword}
                        error={fieldErrors.password}
                        icon={<LockPasswordIcon size={18} color="#9CA3AF" />}
                    />

                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={isLoading}
                        className="h-14 items-center justify-center rounded-[24px] bg-primary"
                        style={{ opacity: isLoading ? 0.6 : 1 }}
                        activeOpacity={0.8}
                    >
                        <Text className="text-base font-bold text-white">
                            {isLoading ? 'Creating account…' : 'Create account'}
                        </Text>
                    </TouchableOpacity>
                </AuthShell>
            </ScrollView>
        </SafeAreaView>
    );
}
