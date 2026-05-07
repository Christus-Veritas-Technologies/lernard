import { Pressable, View } from 'react-native';

import { ArrowLeft01Icon } from 'hugeicons-react-native';

import { Text } from '@rnr/text';

interface NativePageHeaderProps {
    title: string;
    subtitle?: string;
    onBackPress?: () => void;
}

export function NativePageHeader({ title, subtitle, onBackPress }: NativePageHeaderProps) {
    return (
        <View className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <View className="flex-row items-center gap-3">
                {onBackPress ? (
                    <Pressable
                        className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                        onPress={onBackPress}
                    >
                        <ArrowLeft01Icon color="#0F172A" size={18} strokeWidth={1.8} />
                    </Pressable>
                ) : null}
                <View className="flex-1">
                    <Text className="text-xl font-semibold text-slate-900">{title}</Text>
                    {subtitle ? <Text className="mt-1 text-sm text-slate-600">{subtitle}</Text> : null}
                </View>
            </View>
        </View>
    );
}
