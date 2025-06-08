import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Collapsible } from '../components/Collapsible';
import { Text } from 'react-native';

describe('Collapsible', () => {
  it('renders the title correctly', () => {
    const { getByText } = render(<Collapsible title="Title"><Text>Hidden content</Text></Collapsible>);
    expect(getByText('Title')).toBeTruthy();
  });

  it('does not show content initially', () => {
    const { queryByText } = render(<Collapsible title="Title"><Text>Hidden content</Text></Collapsible>);
    expect(queryByText('Hidden content')).toBeNull();
  });

  it('shows content after clicking title', () => {
    const { getByText, queryByText } = render(
      <Collapsible title="Title"><Text>Hidden content</Text></Collapsible>
    );
    fireEvent.press(getByText('Title'));
    expect(queryByText('Hidden content')).toBeTruthy(); // 修正：children 包成 <Text>
  });

  it('toggles content on double press', () => {
    const { getByText, queryByText } = render(
      <Collapsible title="Title"><Text>Hidden content</Text></Collapsible>
    );
    const title = getByText('Title');

    // 展開
    fireEvent.press(title);
    expect(queryByText('Hidden content')).toBeTruthy();

    // 收起
    fireEvent.press(title);
    expect(queryByText('Hidden content')).toBeNull();
  });
});
