const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.watchFolders = [path.resolve(__dirname, '../../packages')];
config.resolver.blockList = [
  /.*[\\/]apps[\\/]api[\\/]dist[\\/].*/,
  /.*[\\/]apps[\\/]api[\\/]src[\\/].*/,
];

module.exports = config;