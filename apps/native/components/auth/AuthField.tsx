import type { ReactNode } from 'react';
import { useState } from 'react';
import type { TextInputProps } from 'react-native';
import { View } from 'react-native';

import { EyeIcon } from 'hugeicons-react-native';

import { Input } from '@rnr/input';
import { Text } from '@rnr/text';

interface AuthFieldProps extends TextInputProps {
    label: string;
    hint?: string;
    error?: string;
    icon?: ReactNode;
    trailing?: ReactNode;
}

export function AuthField({ error, hint, icon, label, secureTextEntry, trailing, ...props }: AuthFieldProps) {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordField = secureTextEntry;

    return (
        <View className="gap-2">
            <Text className="text-sm font-semibold text-slate-900">{label}</Text>
            <Input
                hasError={Boolean(error)}
                leading={icon}
                secureTextEntry={isPasswordField && !showPassword}
                trailing={
                    isPasswordField ? (
                        <View
                            className="active:opacity-60"
                            onTouchEnd={() => setShowPassword(!showPassword)}
                        >
                            <EyeIcon size={18} color="#6B7280" opacity={showPassword ? 1 : 0.5} strokeWidth={showPassword ? 1.5 : 1} />
                        </View>
                    ) : trailing
                }
                {...props}
            />
            {error ? <Text className="text-sm text-rose-600">{error}</Text> : null}
            {!error && hint ? <Text className="text-sm leading-6 text-slate-500">{hint}</Text> : null}
        </View>
    );
}