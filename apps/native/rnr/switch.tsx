import { Switch as RNSwitch, type SwitchProps as RNSwitchProps } from 'react-native';

export interface SwitchProps extends RNSwitchProps { }

export function Switch(props: SwitchProps) {
    return <RNSwitch {...props} />;
}