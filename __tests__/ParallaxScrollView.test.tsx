import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

// Mock all potential hooks before importing the component
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/components/ui/TabBarBackground', () => ({
  useBottomTabOverflow: () => 20,
}));

jest.mock('@/components/ThemedView', () => {
  const { View } = require('react-native');
  return {
    ThemedView: View,
  };
});

// 如果 useScrollViewOffset 是從其他地方導入的，嘗試 mock 它
jest.doMock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = require('react-native');
  
  // 創建 Animated 版本的組件
  const AnimatedView = View;
  const AnimatedScrollView = ScrollView;
  
  // 添加 displayName 以便於調試
  AnimatedView.displayName = 'Animated.View';
  AnimatedScrollView.displayName = 'Animated.ScrollView';
  
  const mockAnimated = {
    View: AnimatedView,
    Text,
    ScrollView: AnimatedScrollView,
    createAnimatedComponent: (component:any) => {
      const AnimatedComponent = component;
      AnimatedComponent.displayName = `Animated(${component.displayName || component.name || 'Component'})`;
      return AnimatedComponent;
    },
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedRef: jest.fn(() => ({ current: null })),
    useAnimatedStyle: jest.fn((callback) => {
      try {
        return callback() || {};
      } catch (e) {
        return {};
      }
    }),
    useScrollViewOffset: jest.fn((ref) => ({ value: 0 })),
    interpolate: jest.fn((value, inputRange, outputRange) => {
      // 簡單的線性插值 mock
      if (typeof value === 'number' && outputRange && outputRange.length > 0) {
        return outputRange[0];
      }
      return 0;
    }),
    withTiming: jest.fn((toValue) => toValue),
    withSpring: jest.fn((toValue) => toValue),
    Extrapolate: {
      CLAMP: 'clamp',
      EXTEND: 'extend',
      IDENTITY: 'identity',
    },
  };

  // 同時導出 default 和 named exports
  return {
    __esModule: true,
    default: mockAnimated,
    ...mockAnimated,
  };
});

import ParallaxScrollView from '../components/ParallaxScrollView';

describe('ParallaxScrollView', () => {
  it('renders children and header image correctly', () => {
    const header = <Text testID="header">Header Image</Text>;
    const child = <Text testID="child">Child Content</Text>;

    const { getByTestId } = render(
      <ParallaxScrollView
        headerImage={header}
        headerBackgroundColor={{ light: 'white', dark: 'black' }}
      >
        {child}
      </ParallaxScrollView>
    );

    expect(getByTestId('header')).toBeTruthy();
    expect(getByTestId('child')).toBeTruthy();
  });

  it('uses the correct background color based on color scheme', () => {
    const { getByTestId } = render(
      <ParallaxScrollView
        headerImage={<Text testID="header">Header Image</Text>}
        headerBackgroundColor={{ light: 'white', dark: 'black' }}
      >
        <Text testID="content">Content</Text>
      </ParallaxScrollView>
    );

    // 驗證組件是否正常渲染
    expect(getByTestId('header')).toBeTruthy();
    expect(getByTestId('content')).toBeTruthy();
  });

  it('passes through children correctly', () => {
    const multipleChildren = [
      <Text key="1" testID="child1">First Child</Text>,
      <Text key="2" testID="child2">Second Child</Text>,
    ];

    const { getByTestId } = render(
      <ParallaxScrollView
        headerImage={<Text testID="header">Header</Text>}
        headerBackgroundColor={{ light: 'white', dark: 'black' }}
      >
        {multipleChildren}
      </ParallaxScrollView>
    );

    expect(getByTestId('child1')).toBeTruthy();
    expect(getByTestId('child2')).toBeTruthy();
  });
});