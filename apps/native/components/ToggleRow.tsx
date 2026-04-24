import { Switch, Text, View } from 'react-native';

interface ToggleRowProps {
    checked: boolean;
    title: string;
    description: string;
    disabled?: boolean;
    onCheckedChange: (value: boolean) => void;
}

export function ToggleRow({
    checked,
    title,
    description,
    disabled = false,
    onCheckedChange,
}: ToggleRowProps) {
    return (
        <View className={joinClasses('rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm', disabled ? 'opacity-70' : undefined)}>
            <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                    <Text className="text-lg font-semibold text-slate-900">{title}</Text>
                    <Text className="mt-2 text-sm leading-6 text-slate-600">{description}</Text>
                </View>
                <Switch
                    disabled={disabled}
                    ios_backgroundColor="#cbd5e1"
                    onValueChange={onCheckedChange}
                    thumbColor="#ffffff"
                    trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
                    value={checked}
                />
            </View>
        </View>
    );
}

function joinClasses(...classes: Array<string | undefined>) {
    return classes.filter(Boolean).join(' ');
}