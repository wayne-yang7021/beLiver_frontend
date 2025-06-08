/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { HelloWave } from '../components/HelloWave'; // 路徑請依實際調整

// Mock ThemedText component
jest.mock('@/components/ThemedText', () => ({
  ThemedText: ({ children, style, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text style={style} {...props}>{children}</Text>;
  },
}));

describe('HelloWave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('應該渲染波浪 emoji', () => {
    const { getByText } = render(<HelloWave />);
    
    expect(getByText('👋')).toBeTruthy();
  });

  it('應該套用正確的樣式', () => {
    const { getByText } = render(<HelloWave />);
    
    const waveText = getByText('👋');
    
    // 檢查樣式是否包含預期的屬性
    expect(waveText.props.style).toEqual(
      expect.objectContaining({
        fontSize: 28,
        lineHeight: 32,
        marginTop: -6,
      })
    );
  });

  it('應該初始化 shared value', () => {
    const mockUseSharedValue = require('react-native-reanimated').useSharedValue;
    
    render(<HelloWave />);
    
    expect(mockUseSharedValue).toHaveBeenCalledWith(0);
  });

  it('應該使用 animated style', () => {
    const mockUseAnimatedStyle = require('react-native-reanimated').useAnimatedStyle;
    
    render(<HelloWave />);
    
    expect(mockUseAnimatedStyle).toHaveBeenCalled();
    
    // 測試 animated style callback
    const styleCallback = mockUseAnimatedStyle.mock.calls[0][0];
    const result = styleCallback();
    
    // 檢查回傳的樣式結構是否正確
    expect(result).toEqual(
      expect.objectContaining({
        transform: expect.arrayContaining([
          expect.objectContaining({
            rotate: expect.stringContaining('deg')
          })
        ])
      })
    );
  });

  it('應該設定重複動畫', () => {
    const mockWithRepeat = require('react-native-reanimated').withRepeat;
    const mockWithSequence = require('react-native-reanimated').withSequence;
    const mockWithTiming = require('react-native-reanimated').withTiming;
    
    render(<HelloWave />);
    
    // 檢查是否呼叫了動畫相關函數
    expect(mockWithTiming).toHaveBeenCalledWith(25, { duration: 150 });
    expect(mockWithTiming).toHaveBeenCalledWith(0, { duration: 150 });
    expect(mockWithSequence).toHaveBeenCalled();
    expect(mockWithRepeat).toHaveBeenCalledWith(expect.anything(), 4);
  });

  it('應該渲染 Animated.View 包裝器', () => {
    const { UNSAFE_getByType } = render(<HelloWave />);
    
    // 由於我們 mock 了 Animated.View 為普通 View，檢查是否存在 View
    const { View } = require('react-native');
    expect(UNSAFE_getByType(View)).toBeTruthy();
  });

  it('應該在 useEffect 中觸發動畫', () => {
    const mockWithRepeat = require('react-native-reanimated').withRepeat;
    
    // 清除之前的 mock 呼叫
    mockWithRepeat.mockClear();
    
    render(<HelloWave />);
    
    // 檢查 withRepeat 是否被呼叫（表示動畫被觸發）
    expect(mockWithRepeat).toHaveBeenCalled();
  });
});