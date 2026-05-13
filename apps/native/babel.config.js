module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  plugins.push('react-native-worklets/plugin');
  plugins.push('nativewind/babel');

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],

    plugins,
  };
};
