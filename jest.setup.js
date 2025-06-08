// jest.setup.js

// Mock window.matchMedia (needed for react-native-reanimated)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock React Native Platform
import { Platform } from 'react-native';

// 預設設定 Platform.OS 為 'web'，測試時可以動態修改
Platform.OS = 'web';

// Mock expo-router 的基本功能
jest.mock('expo-router', () => ({
  Link: 'Link',
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => '/',
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve()),
  dismissBrowser: jest.fn(() => Promise.resolve()),
  warmUpAsync: jest.fn(() => Promise.resolve()),
  coolDownAsync: jest.fn(() => Promise.resolve()),
}));

// Mock @expo/vector-icons - 為 Login 組件的 Feather icons 添加
jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
  AntDesign: 'AntDesign',
  MaterialIcons: 'MaterialIcons',
  Ionicons: 'Ionicons',
  FontAwesome: 'FontAwesome',
  // 添加其他你可能用到的 icon sets
}));

// 設定全域的測試 timeout (可選)
jest.setTimeout(10000);

// Mock Expo Constants (如果需要)
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      name: 'test-app',
      slug: 'test-app',
    },
    platform: {
      ios: null,
      android: null,
      web: {},
    },
  },
}));

// Mock AsyncStorage (only if installed)
try {
  jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
  );
} catch (e) {
  // Module not installed, skip
}

// 處理 Expo 相關的警告
global.__DEV__ = true;

// 設定 fetch mock (如果需要 API 測試) - 為 Login 組件的 API 呼叫添加
global.fetch = jest.fn();
global.alert = jest.fn(); // 為 Login 組件的 alert 添加

// Mock require for images - 為 Login 組件的 liver.png 圖片添加
jest.mock('../assets/images/liver.png', () => 'liver-image-mock', { virtual: true });

// Mock process.env for Login component
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';

// 清理 fetch mock 和 alert mock
beforeEach(() => {
  if (global.fetch) {
    global.fetch.mockClear();
  }
  if (global.alert) {
    global.alert.mockClear();
  }
});

// Mock Expo Font (如果使用到自定義字體)
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
  isLoading: jest.fn(() => false),
}));

// Mock Expo Asset (如果使用到資源管理)
jest.mock('expo-asset', () => ({
  Asset: {
    loadAsync: jest.fn(() => Promise.resolve()),
    fromModule: jest.fn(() => ({ uri: 'mock-uri' })),
  },
}));

// 處理 React Native 的 timers (only if react-native-gesture-handler is installed)
try {
  require('react-native-gesture-handler/jestSetup');
} catch (e) {
  // Module not installed, skip
}

// Mock React Native Reanimated (改用更簡潔的方式)
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = require('react-native');
  
  const AnimatedView = View;
  const AnimatedText = Text;
  const AnimatedScrollView = ScrollView;
  
  // 為 Animated 組件添加 displayName
  AnimatedView.displayName = 'AnimatedView';
  AnimatedText.displayName = 'AnimatedText';
  AnimatedScrollView.displayName = 'AnimatedScrollView';
  
  const mockAnimated = {
    View: AnimatedView,
    Text: AnimatedText,
    ScrollView: AnimatedScrollView,
    createAnimatedComponent: (component) => {
      const AnimatedComponent = component;
      AnimatedComponent.displayName = `Animated(${component.displayName || component.name || 'Component'})`;
      return AnimatedComponent;
    },
    // 添加常用的 Reanimated 函數
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedRef: jest.fn(() => ({ current: null })),
    useAnimatedStyle: jest.fn((callback) => {
      try {
        return callback();
      } catch (e) {
        return {};
      }
    }),
    useAnimatedScrollHandler: jest.fn(() => ({})),
    useScrollViewOffset: jest.fn(() => ({ value: 0 })),
    useDerivedValue: jest.fn((callback) => {
      try {
        return { value: callback() };
      } catch (e) {
        return { value: 0 };
      }
    }),
    useAnimatedGestureHandler: jest.fn(() => ({})),
    // 添加其他可能的 Reanimated 函數
    measure: jest.fn(() => ({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      pageX: 0,
      pageY: 0,
    })),
    scrollTo: jest.fn(),
    withRepeat: jest.fn((animation, times) => animation),
    withSequence: jest.fn((...animations) => animations[0]),
    withTiming: jest.fn((toValue, config) => toValue),
    withSpring: jest.fn((toValue, config) => toValue),
    withDecay: jest.fn((config) => 0),
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    interpolate: jest.fn((value, inputRange, outputRange) => outputRange[0]),
    Extrapolate: {
      CLAMP: 'clamp',
      EXTEND: 'extend',
      IDENTITY: 'identity',
    },
  };

  return {
    default: mockAnimated,
    ...mockAnimated,
  };
});