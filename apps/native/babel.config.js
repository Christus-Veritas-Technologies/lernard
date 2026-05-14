module.exports = function (api) {
  api.cache(true);
  const plugins = ['nativewind/babel', 'react-native-worklets/plugin'];

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
