// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */

const projectRoot = path.resolve(__dirname);
const config = getDefaultConfig(projectRoot);

module.exports = withNativeWind(config, { input: './global.css' });
