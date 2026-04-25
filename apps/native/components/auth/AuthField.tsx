import type { ReactNode } from 'react';
import type { TextInputProps } from 'react-native';
import { View } from 'react-native';

import { Input } from '@rnr/input';
import { Text } from '@rnr/text';

interface AuthFieldProps extends TextInputProps {
    label: string;
    hint?: string;
    error?: string;
    icon?: ReactNode;
    trailing?: ReactNode;
}

export function AuthField({ error, hint, icon, label, trailing, ...props }: AuthFieldProps) {
    return (
        <View className="gap-2">
            <Text className="text-sm font-semibold text-slate-900">{label}</Text>
            <Input hasError={Boolean(error)} leading={icon} trailing={trailing} {...props} />
            {error ? <Text className="text-sm text-rose-600">{error}</Text> : null}
            {!error && hint ? <Text className="text-sm leading-6 text-slate-500">{hint}</Text> : null}
        </View>
    );
}