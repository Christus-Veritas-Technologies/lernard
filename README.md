New error:
PS C:\Users\kinzi\Desktop\lernard> Set-Location "C:\Users\kinzi\Desktop\lernard\apps\native"; bun run start -- --clear
$ expo start --dev-client --clear
Starting project at C:\Users\kinzi\Desktop\lernard\apps\native
Starting Metro Bundler
warning: Bundler cache is empty, rebuilding (this may take a minute)
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █ ▄▄ █▀ █▄█▄█▀▄ █▀█ ▄▄▄▄▄ █
█ █   █ ██▄█▀█ ▄█    ▀ ▀ ██ █   █ █
█ █▄▄▄█ █ ▀▀▄ ▄██ ▄▀█▄▀ ███ █▄▄▄█ █
█▄▄▄▄▄▄▄█ ▀▄█▄█ █▄█▄█ █▄█▄█▄▄▄▄▄▄▄█
█▄ ▄██▄▄▀ ▄█ ██ ▀██▀▀ █▀ ▀   ▄▀▀▄ █
█▀▀█▄ █▄█▄▄ ▄▄██▄█▄█ ▄▄█ ▀▄█▀▄ ▄▀ █
█▀▀▀▄ █▄▀▄  ▀█▀  ██▀ ▀▀▄▀ ▀  █ █▄▀█
█▄▄▀█▀ ▄▄▀ █▄▄▄▄  ▄▄▄▀▄▀▄ ▄▄▀▀▀▄▄▄█
█▄  ▀▀▀▄ █ █ █▀▄▄ █▄ ▀██▀ █ ▄███  █
█  ▄██▄▄  █▀▄▄██ ▄▄▀ ▀█ ▄▀▀▀▀▀ ██▄█
█▄ ▄▄ ▀▄▄▄██▀██  ██ ▀█▀█  ▄ ▄█ ▀ ▀█
█▄▄▀▄ ▄▄▀█▄▀▄█▄ ▄▀█  ▀▄█  ▀█▄▀ █▀▄█
█▄▄███▄▄▄  ▄▄ ▀▄ ▄▄█▀▄▀█  ▄▄▄ ▄██ █
█ ▄▄▄▄▄ █▀ ▀ ███  ▄ ▄ ▄ ▀ █▄█ ▀▄█ █
█ █   █ ██▄▀ █▀ ▄ █▄ ▀██ ▄ ▄  ██▄██
█ █▄▄▄█ █ ▄▀▄▀▄▄ ▄▄▀  ▄▀█  █▄▄ ██▄█
█▄▄▄▄▄▄▄█▄█▄▄▄█▄▄██▄█▄███▄▄▄█▄▄██▄█

› Metro waiting on
exp+lernard://expo-development-client/?url=http%3A%2F%2F192.168.1.8%3A8081
› Scan the QR code above to open the project in a development build. Learn more:
https://expo.fyi/start

› Using development build
› Press s │ switch to Expo Go

› Press a │ open Android
› Press w │ open web

› Press j │ open debugger
› Press r │ reload app
› Press m │ toggle menu
› shift+m │ more tools
› Press o │ open project code in your editor

› Press ? │ show all commands

Logs for your project will appear below. Press Ctrl+C to exit.
Android Bundled 23125ms node_modules\.bun\expo-router@6.0.23+d810a8eaec11917d\node_modules\expo-router\entry.js (5850 modules)
 ERROR  A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} /> {key: someKey, d: ..., stroke: ..., strokeLinejoin: ..., strokeWidth: ...} Path {d: ..., stroke: ..., strokeLinejoin: ..., strokeWidth: ...} Path 

Call Stack
  construct (apps\native\<native>)
  apply (apps\native\<native>)
  _construct (node_modules\.bun\@babel+runtime@7.29.2\node_modules\@babel\runtime\helpers\construct.js)
  Wrapper (node_modules\.bun\@babel+runtime@7.29.2\node_modules\@babel\runtime\helpers\wrapNativeSuper.js)
  construct (apps\native\<native>)
  _callSuper (node_modules\.bun\@babel+runtime@7.29.2\node_modules\@babel\runtime\helpers\callSuper.js)
  NamelessError (node_modules\.bun\@expo+metro-runtime@6.1.2+245a6c089f6d1b20\node_modules\@expo\metro-runtime\src\metroServerLogs.native.ts)
  captureCurrentStack (node_modules\.bun\@expo+metro-runtime@6.1.2+245a6c089f6d1b20\node_modules\@expo\metro-runtime\src\metroServerLogs.native.ts)
  HMRClient.log (node_modules\.bun\@expo+metro-runtime@6.1.2+245a6c089f6d1b20\node_modules\@expo\metro-runtime\src\metroServerLogs.native.ts)
  console.level (node_modules\.bun\react-native@0.81.5+395f71ae3c4cac51\node_modules\react-native\Libraries\Core\setUpDeveloperTools.js)
  jsxDEVImpl (node_modules\.bun\react@19.1.0\node_modules\react\cjs\react-jsx-runtime.development.js)
  exports.jsx (node_modules\.bun\react@19.1.0\node_modules\react\cjs\react-jsx-runtime.development.js)
  f.m.map$argument_0 (node_modules\.bun\hugeicons-react-native@0.0.2+6b2d21d9f63ca339\node_modules\hugeicons-react-native\dist\esm\create-hugeicon-component.js)
  map (apps\native\<native>)
  w$argument_0 (node_modules\.bun\hugeicons-react-native@0.0.2+6b2d21d9f63ca339\node_modules\hugeicons-react-native\dist\esm\create-hugeicon-component.js)
  callComponent.reactStackBottomFrame (node_modules\.bun\react-native@0.81.5+395f71ae3c4cac51\node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  renderWithHooks (node_modules\.bun\react-native@0.81.5+395f71ae3c4cac51\node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  updateForwardRef (node_modules\.bun\react-native@0.81.5+395f71ae3c4cac51\node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  beginWork (node_modules\.bun\react-native@0.81.5+395f71ae3c4cac51\node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  runWithFiberInDEV (node_modules\.bun\react-native@0.81.5+395f71ae3c4cac51\node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  performUnitOfWork (node_modules\.bun\react-native@0.81.5+395f71ae3c4cac51\node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  workLoopSync (node_modules\.bun\react-native@0.81.5+395f71ae3c4cac51\node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  renderRootSync (node_modules\.bun\react-native@0.81.5+395f71ae3c4cac51\node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  performWorkOnRoot (node_modules\.bun\react-native@0.81.5+395f71ae3c4cac51\node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  performSyncWorkOnRoot (node_modules\.bun\react-native@0.81.5+395f71ae3c4cac51\node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  flushSyncWorkAcrossRoots_impl (node_modules\.bun\react-native@0.81.5+395f71ae3c4cac51\node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  flushPassiveEffects (node_modules\.bun\react-native@0.81.5+395f71ae3c4cac51\node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  scheduleCallback$argument_1 (node_modules\.bun\react-native@0.81.5+395f71ae3c4cac51\node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js) 

Call Stack
  call (apps\native\<native>)
  apply (apps\native\<native>)
  <anonymous> (node_modules\.bun\react-native-css-interop@0.2.3+dd195d037b083b1a\node_modules\react-native-css-interop\dist\runtime\wrap-jsx.js)
  LoginScreen (apps\native\app\(auth)\login.tsx)
  call (apps\native\<native>)
  apply (apps\native\<native>)
  <anonymous> (node_modules\.bun\react-native-css-interop@0.2.3+dd195d037b083b1a\node_modules\react-native-css-interop\dist\runtime\wrap-jsx.js)
  BaseRoute (node_modules\.bun\expo-router@6.0.23+d810a8eaec11917d\node_modules\expo-router\build\useScreens.js)
  SceneView (node_modules\.bun\@react-navigation+core@7.17.1+4bcfe187168658ad\node_modules\@react-navigation\core\lib\module\SceneView.js)
  render (node_modules\.bun\@react-navigation+core@7.17.1+4bcfe187168658ad\node_modules\@react-navigation\core\lib\module\useDescriptors.js)
  routes.reduce$argument_0 (node_modules\.bun\@react-navigation+core@7.17.1+4bcfe187168658ad\node_modules\@react-navigation\core\lib\module\useDescriptors.js)
  reduce (apps\native\<native>)
  useDescriptors (node_modules\.bun\@react-navigation+core@7.17.1+4bcfe187168658ad\node_modules\@react-navigation\core\lib\module\useDescriptors.js)
  useNavigationBuilder (node_modules\.bun\@react-navigation+core@7.17.1+4bcfe187168658ad\node_modules\@react-navigation\core\lib\module\useNavigationBuilder.js)
  NativeStackNavigator (node_modules\.bun\expo-router@6.0.23+d810a8eaec11917d\node_modules\expo-router\build\fork\native-stack\createNativeStackNavigator.js)
  call (apps\native\<native>)
  apply (apps\native\<native>)
  <anonymous> (node_modules\.bun\react-native-css-interop@0.2.3+dd195d037b083b1a\node_modules\react-native-css-interop\dist\runtime\wrap-jsx.js)
  <anonymous> (node_modules\.bun\expo-router@6.0.23+d810a8eaec11917d\node_modules\expo-router\build\layouts\withLayoutContext.js)
  call (apps\native\<native>)
  apply (apps\native\<native>)
  <anonymous> (node_modules\.bun\react-native-css-interop@0.2.3+dd195d037b083b1a\node_modules\react-native-css-interop\dist\runtime\wrap-jsx.js)
  Object.assign$argument_0 (node_modules\.bun\expo-router@6.0.23+d810a8eaec11917d\node_modules\expo-router\build\layouts\StackClient.js)
  call (apps\native\<native>)
  apply (apps\native\<native>)
  <anonymous> (node_modules\.bun\react-native-css-interop@0.2.3+dd195d037b083b1a\node_modules\react-native-css-interop\dist\runtime\wrap-jsx.js)
  AuthLayout (apps\native\app\(auth)\_layout.tsx)
  call (apps\native\<native>)
  apply (apps\native\<native>)
  <anonymous> (node_modules\.bun\react-native-css-interop@0.2.3+dd195d037b083b1a\node_modules\react-native-css-interop\dist\runtime\wrap-jsx.js)
  BaseRoute (node_modules\.bun\expo-router@6.0.23+d810a8eaec11917d\node_modules\expo-router\build\useScreens.js)
  SceneView (node_modules\.bun\@react-navigation+core@7.17.1+4bcfe187168658ad\node_modules\@react-navigation\core\lib\module\SceneView.js)
  render (node_modules\.bun\@react-navigation+core@7.17.1+4bcfe187168658ad\node_modules\@react-navigation\core\lib\module\useDescriptors.js)
  routes.reduce$argument_0 (node_modules\.bun\@react-navigation+core@7.17.1+4bcfe187168658ad\node_modules\@react-navigation\core\lib\module\useDescriptors.js)
  reduce (apps\native\<native>)
  useDescriptors (node_modules\.bun\@react-navigation+core@7.17.1+4bcfe187168658ad\node_modules\@react-navigation\core\lib\module\useDescriptors.js)
  useNavigationBuilder (node_modules\.bun\@react-navigation+core@7.17.1+4bcfe187168658ad\node_modules\@react-navigation\core\lib\module\useNavigationBuilder.js)
  NativeStackNavigator (node_modules\.bun\expo-router@6.0.23+d810a8eaec11917d\node_modules\expo-router\build\fork\native-stack\createNativeStackNavigator.js)
  call (apps\native\<native>)
  apply (apps\native\<native>)
  <anonymous> (node_modules\.bun\react-native-css-interop@0.2.3+dd195d037b083b1a\node_modules\react-native-css-interop\dist\runtime\wrap-jsx.js)
  <anonymous> (node_modules\.bun\expo-router@6.0.23+d810a8eaec11917d\node_modules\expo-router\build\layouts\withLayoutContext.js)
  call (apps\native\<native>)
  apply (apps\native\<native>)
  <anonymous> (node_modules\.bun\react-native-css-interop@0.2.3+dd195d037b083b1a\node_modules\react-native-css-interop\dist\runtime\wrap-jsx.js)
  Object.assign$argument_0 (node_modules\.bun\expo-router@6.0.23+d810a8eaec11917d\node_modules\expo-router\build\layouts\StackClient.js)
  call (apps\native\<native>)
  apply (apps\native\<native>)
  <anonymous> (node_modules\.bun\react-native-css-interop@0.2.3+dd195d037b083b1a\node_modules\react-native-css-interop\dist\runtime\wrap-jsx.js)
  RootLayout (apps\native\app\_layout.tsx)
  call (apps\native\<native>)
  apply (apps\native\<native>)
  <anonymous> (node_modules\.bun\react-native-css-interop@0.2.3+dd195d037b083b1a\node_modules\react-native-css-interop\dist\runtime\wrap-jsx.js)
  BaseRoute (node_modules\.bun\expo-router@6.0.23+d810a8eaec11917d\node_modules\expo-router\build\useScreens.js)
  SceneView (node_modules\.bun\@react-navigation+core@7.17.1+4bcfe187168658ad\node_modules\@react-navigation\core\lib\module\SceneView.js)
  render (node_modules\.bun\@react-navigation+core@7.17.1+4bcfe187168658ad\node_modules\@react-navigation\core\lib\module\useDescriptors.js)
  routes.reduce$argument_0 (node_modules\.bun\@react-navigation+core@7.17.1+4bcfe187168658ad\node_modules\@react-navigation\core\lib\module\useDescriptors.js)
  reduce (apps\native\<native>)
  useDescriptors (node_modules\.bun\@react-navigation+core@7.17.1+4bcfe187168658ad\node_modules\@react-navigation\core\lib\module\useDescriptors.js)
  useNavigationBuilder (node_modules\.bun\@react-navigation+core@7.17.1+4bcfe187168658ad\node_modules\@react-navigation\core\lib\module\useNavigationBuilder.js)
  Content (node_modules\.bun\expo-router@6.0.23+d810a8eaec11917d\node_modules\expo-router\build\ExpoRoot.js)
  call (apps\native\<native>)
  apply (apps\native\<native>)
  <anonymous> (node_modules\.bun\react-native-css-interop@0.2.3+dd195d037b083b1a\node_modules\react-native-css-interop\dist\runtime\wrap-jsx.js)
  ContextNavigator (node_modules\.bun\expo-router@6.0.23+d810a8eaec11917d\node_modules\expo-router\build\ExpoRoot.js)
  call (apps\native\<native>)
  apply (apps\native\<native>)
  <anonymous> (node_modules\.bun\react-native-css-interop@0.2.3+dd195d037b083b1a\node_modules\react-native-css-interop\dist\runtime\wrap-jsx.js)
  ExpoRoot (node_modules\.bun\expo-router@6.0.23+d810a8eaec11917d\node_modules\expo-router\build\ExpoRoot.js)
  call (apps\native\<native>)
  apply (apps\native\<native>)
  <anonymous> (node_modules\.bun\react-native-css-interop@0.2.3+dd195d037b083b1a\node_modules\react-native-css-interop\dist\runtime\wrap-jsx.js)
  App (node_modules\.bun\expo-router@6.0.23+d810a8eaec11917d\node_modules\expo-router\build\qualified-entry.js)
  call (apps\native\<native>)
  apply (apps\native\<native>)
  <anonymous> (node_modules\.bun\react-native-css-interop@0.2.3+dd195d037b083b1a\node_modules\react-native-css-interop\dist\runtime\wrap-jsx.js)
  WithDevTools (node_modules\.bun\expo@54.0.33+245a6c089f6d1b20\node_modules\expo\src\launch\withDevTools.tsx)
