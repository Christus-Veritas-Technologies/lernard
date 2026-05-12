import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowLeft01Icon, Mail01Icon } from 'hugeicons-react-native';

import { Text } from '@rnr/text';

import { useNativeRequestMagicLink, useNativeVerifyMagicLink } from '@/hooks/useAuthMutations';

const OTP_LENGTH = 6;

export default function CheckEmailScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams<{ email: string }>();

    const { mutate: requestLink, isLoading: isResending } = useNativeRequestMagicLink();
    const { mutate: verify, isLoading: isVerifying, error: verifyError } = useNativeVerifyMagicLink();

    const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [resent, setResent] = useState(false);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const otp = digits.join('');
    const isComplete = otp.length === OTP_LENGTH;

    function handleDigitChange(text: string, index: number) {
        const digit = text.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[index] = digit;
        setDigits(next);

        if (digit && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        if (digit && index === OTP_LENGTH - 1) {
            const fullCode = next.join('');
            if (fullCode.length === OTP_LENGTH && email) {
                submitCode(fullCode);
            }
        }
    }

    function handleKeyPress(key: string, index: number) {
        if (key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    }

    function submitCode(code = otp) {
        if (!email || code.length !== OTP_LENGTH) return;
        verify(
            { email, otp: code },
            {
                onSuccess: (data) => {
                    router.replace(data.onboardingComplete ? '/(app)/(home)' : '/(auth)/account-type');
                },
            },
        );
    }

    function handleResend() {
        if (!email) return;
        setDigits(Array(OTP_LENGTH).fill(''));
        setResent(false);
        requestLink({ email }, { onSuccess: () => setResent(true) });
    }

    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 16 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Back */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mb-8 flex-row items-center gap-2 self-start"
                        activeOpacity={0.7}
                    >
                        <ArrowLeft01Icon size={18} color="#6B7280" />
                        <Text className="text-sm text-slate-500">Back</Text>
                    </TouchableOpacity>

                    {/* Hero */}
                    <View className="mb-8 overflow-hidden rounded-[36px] border border-white bg-auth-primary-soft px-6 py-8 shadow-sm">
                        <View className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-auth-secondary-soft" />
                        <View className="gap-4">
                            <View className="self-start rounded-full bg-white/85 px-3 py-1">
                                <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-auth-primary-strong">
                                    Check your inbox
                                </Text>
                            </View>
                            <View className="gap-2">
                                <Text className="text-4xl font-semibold leading-[44px] text-auth-primary-strong">
                                    Enter the code
                                </Text>
                                <Text className="text-base leading-7 text-slate-600">
                                    We sent a 6-digit code to{'\n'}
                                    <Text className="font-semibold text-auth-primary-strong">{email}</Text>
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-2 self-start rounded-2xl bg-white/15 px-4 py-2.5">
                                <Mail01Icon size={15} color="#4B5EAA" />
                                <Text className="text-sm text-slate-600">Expires in 15 minutes</Text>
                            </View>
                        </View>
                    </View>

                    {/* OTP grid */}
                    <View className="mb-5 flex-row gap-2">
                        {digits.map((digit, i) => (
                            <TextInput
                                key={i}
                                ref={(ref) => { inputRefs.current[i] = ref; }}
                                className="h-14 flex-1 rounded-2xl border bg-white text-center text-2xl font-bold text-slate-900"
                                style={{ borderColor: digit ? '#4f63d2' : '#E2E8F0' }}
                                maxLength={1}
                                keyboardType="number-pad"
                                value={digit}
                                onChangeText={(text) => handleDigitChange(text, i)}
                                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                                selectTextOnFocus
                            />
                        ))}
                    </View>

                    {/* Error */}
                    {verifyError ? (
                        <View className="mb-4 rounded-2xl bg-red-50 px-4 py-3">
                            <Text className="text-sm text-red-600">{verifyError}</Text>
                        </View>
                    ) : null}

                    {/* Verify */}
                    <TouchableOpacity
                        onPress={() => submitCode()}
                        disabled={isVerifying || !isComplete}
                        className="mb-5 h-14 items-center justify-center rounded-[24px] bg-primary"
                        style={{ opacity: isVerifying || !isComplete ? 0.45 : 1 }}
                        activeOpacity={0.8}
                    >
                        <Text className="text-base font-bold text-white">
                            {isVerifying ? 'Verifying…' : 'Verify code'};/
                        </Text>
                    </TouchableOpacity>

                    {/* Resend */}
                    <View className="items-center gap-2">
                        {resent ? (
                            <Text className="text-sm font-medium text-green-600">A new code has been sent.</Text>
                        ) : null}
                        <TouchableOpacity onPress={handleResend} disabled={isResending} activeOpacity={0.7}>
                            <Text className="text-sm text-slate-500">
                                Didn&apos;t receive it?{' '}
                                <Text className="font-semibold text-primary">
                                    {isResending ? 'Sending…' : 'Resend code'}
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
