import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

export interface TextProps extends RNTextProps {
    className?: string;
}

export function Text(props: TextProps) {
    return <RNText {...props} />;
}