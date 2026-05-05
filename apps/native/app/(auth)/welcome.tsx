import { useRouter } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookOpen01Icon, StarsIcon } from 'hugeicons-react-native';

import { Text } from '@rnr/text';
import { GoogleIcon } from '@/components/auth/GoogleIcon';
import { useNativeGoogleAuth } from '@/hooks/useAuthMutations';

export default function WelcomeScreen() {
    const router = useRouter();
    const { signIn, isLoading: isGoogleLoading, error: googleError } = useNativeGoogleAuth();

    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
            <View className="flex-1 justify-between px-5 pb-8 pt-6">
                {/* Hero card */}
                <View className="overflow-hidden rounded-[32px] bg-primary px-7 pb-8 pt-8 shadow-sm">
                    <View className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
                    <View className="absolute -bottom-12 left-2 h-32 w-32 rounded-full bg-white/10" />
                    <View className="gap-5">
                        <View className="flex-row items-center gap-2 self-start rounded-full bg-white/20 px-3 py-1.5">
                            <StarsIcon size={14} color="#E0E9FF" />
                            <Text className="text-xs font-semibold uppercase tracking-widest text-blue-100">
                                AI Tutor
                            </Text>
                        </View>
                        <View className="gap-2">
                            <Text className="text-5xl font-bold text-white">Lernard</Text>
                            <Text className="text-base leading-7 text-blue-100">
                                Your personal tutor.{`\n`}Always ready.
                            </Text>
                        </View>
                        <View className="flex-row items-center gap-3 rounded-2xl bg-white/15 px-4 py-3">
                            <BookOpen01Icon size={20} color="#E0E9FF" />
                            <Text className="flex-1 text-sm leading-6 text-blue-100">
                                Every lesson is generated fresh, just for you.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* CTAs */}
                <View className="gap-3">
                    <TouchableOpacity
                        onPress={() => router.push('/(auth)/register')}
                        className="h-14 items-center justify-center rounded-[24px] bg-primary shadow-sm active:opacity-80"
                        activeOpacity={0.8}
                    >
                        <Text className="text-base font-bold text-white">Get started — it&apos;s free</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/(auth)/login')}
                        className="h-14 items-center justify-center rounded-[24px] border border-slate-200 bg-white active:opacity-80"
                        activeOpacity={0.8}
                    >
                        <Text className="text-base font-semibold text-slate-700">I already have an account</Text>
                    </TouchableOpacity>

                    <View className="flex-row items-center gap-3 py-1">
                        <View className="h-px flex-1 bg-slate-200" />
                        <Text className="text-xs text-slate-400">or</Text>
                        <View className="h-px flex-1 bg-slate-200" />
                    </View>

                    {googleError ? (
                        <View className="rounded-xl bg-red-50 px-4 py-2">
                            <Text className="text-center text-sm text-red-600">{googleError}</Text>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        onPress={signIn}
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

                    <Text className="text-center text-xs text-slate-400">
                        By continuing, you agree to our Terms and Privacy Policy.
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}
