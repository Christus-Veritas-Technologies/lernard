import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, CardContent, CardHeader, CardTitle } from '@rnr/card';
import { Text } from '@rnr/text';

interface AuthShellProps {
    badge: string;
    title: string;
    description: string;
    children: ReactNode;
    cardTitle?: string;
    cardSubtitle?: string;
    footer?: ReactNode;
    hero?: ReactNode;
}

export function AuthShell({
    badge,
    children,
    cardSubtitle,
    cardTitle,
    description,
    footer,
    hero,
    title,
}: AuthShellProps) {
    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
            <View className="flex-1 px-5 pb-6 pt-4">
                {/* Hero panel */}
                <View className="mb-6 overflow-hidden rounded-[36px] border border-white bg-auth-primary-soft px-6 py-8 shadow-sm">
                    <View className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-auth-secondary-soft" />
                    <View className="absolute -bottom-12 left-4 h-28 w-28 rounded-full bg-white/60" />
                    <View className="gap-5">
                        <View className="self-start rounded-full bg-white/85 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-auth-primary-strong">
                                {badge}
                            </Text>
                        </View>
                        <View className="gap-2">
                            <Text className="text-4xl font-semibold leading-[44px] text-auth-primary-strong">
                                {title}
                            </Text>
                            <Text className="text-base leading-7 text-slate-600">{description}</Text>
                        </View>
                        {hero ? <View>{hero}</View> : null}
                    </View>
                </View>

                {/* Form card */}
                <Card className="rounded-[32px] border border-slate-200 bg-white p-6">
                    {(cardTitle || cardSubtitle) ? (
                        <CardHeader className="gap-1 pb-5">
                            {cardTitle ? <CardTitle className="text-xl">{cardTitle}</CardTitle> : null}
                            {cardSubtitle ? (
                                <Text className="text-sm leading-6 text-slate-500">{cardSubtitle}</Text>
                            ) : null}
                        </CardHeader>
                    ) : null}
                    <CardContent className="gap-5">{children}</CardContent>
                    {footer ? <View className="mt-6 border-t border-slate-100 pt-5">{footer}</View> : null}
                </Card>
            </View>
        </SafeAreaView>
    );
}
