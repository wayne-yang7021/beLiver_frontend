/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { openBrowserAsync } from 'expo-web-browser';
import { ExternalLink } from '../components/ExternalLink'; // 路徑請依實際調整

// mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

describe('ExternalLink', () => {
  const href = 'https://example.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('在 web 平台按下時，不會呼叫 preventDefault，也不會呼叫 openBrowserAsync', () => {
    Platform.OS = 'web';

    const { getByTestId } = render(
      <ExternalLink href={href} testID="link" />
    );

    const event = { preventDefault: jest.fn() };

    fireEvent.press(getByTestId('link'), event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(openBrowserAsync).not.toHaveBeenCalled();
  });

  it('在非 web 平台按下時，會呼叫 preventDefault 且呼叫 openBrowserAsync', async () => {
    Platform.OS = 'ios'; // or 'android'

    const { getByTestId } = render(
      <ExternalLink href={href} testID="link" />
    );

    // fireEvent.press 不支援 async callback，改用 fireEvent(getByTestId('link'), 'press', event)
    // 但因 onPress async，建議直接呼叫 props.onPress 手動觸發。

    const link = getByTestId('link');
    const event = { preventDefault: jest.fn() };

    // 取得 onPress handler
    const onPressHandler = link.props.onPress;

    await onPressHandler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(openBrowserAsync).toHaveBeenCalledWith(href);
  });
});
