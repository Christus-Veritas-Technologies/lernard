import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, View, type PressableProps, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';
import { Text, type TextProps } from '@rnr/text';

interface TabsContextValue {
    value: string;
    onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabsContext() {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error('Tabs components must be used within a Tabs component');
    }
    return context;
}

interface TabsProps extends ViewProps {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
}

export function Tabs({ value, onValueChange, className, children, ...props }: TabsProps) {
    return (
        <TabsContext.Provider value={{ value, onValueChange }}>
            <View className={cn('', className)} {...props}>
                {children}
            </View>
        </TabsContext.Provider>
    );
}

interface TabsListProps extends ViewProps {
    className?: string;
}

export function TabsList({ className, children, ...props }: TabsListProps & { children: ReactNode }) {
    return (
        <View
            className={cn('flex-row rounded-2xl bg-background-subtle p-1', className)}
            {...props}
        >
            {children}
        </View>
    );
}

interface TabsTriggerProps extends PressableProps {
    value: string;
    className?: string;
}

export function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps & { children: ReactNode }) {
    const { value: selectedValue, onValueChange } = useTabsContext();
    const isActive = selectedValue === value;

    return (
        <Pressable
            onPress={() => onValueChange(value)}
            className={cn(
                'flex-1 items-center justify-center rounded-xl py-2.5 px-3',
                isActive && 'bg-white shadow-sm',
                className
            )}
            {...props}
        >
            {typeof children === 'string' ? (
                <Text className={cn('text-sm font-semibold', isActive ? 'text-primary' : 'text-text-secondary')}>
                    {children}
                </Text>
            ) : (
                children
            )}
        </Pressable>
    );
}

interface TabsContentProps extends ViewProps {
    value: string;
    className?: string;
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps & { children: ReactNode }) {
    const { value: selectedValue } = useTabsContext();

    if (selectedValue !== value) {
        return null;
    }

    return (
        <View className={cn('', className)} {...props}>
            {children}
        </View>
    );
}
