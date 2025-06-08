import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemedText } from '@/components/ThemedText';

// Mock the useThemeColor hook
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: jest.fn().mockReturnValue('#123456'),
}));

describe('ThemedText', () => {
  it('renders text correctly', () => {
    const { getByText } = render(<ThemedText>Test Content</ThemedText>);
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('applies default style type', () => {
    const { getByText } = render(<ThemedText>Default Text</ThemedText>);
    const text = getByText('Default Text');
    expect(text.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: '#123456' }),
        expect.objectContaining({ fontSize: 16, lineHeight: 24 }),
      ])
    );
  });

  it('applies title style type', () => {
    const { getByText } = render(<ThemedText type="title">Title Text</ThemedText>);
    const text = getByText('Title Text');
    expect(text.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontSize: 32, fontWeight: 'bold', lineHeight: 32 }),
      ])
    );
  });

  it('applies link style type', () => {
    const { getByText } = render(<ThemedText type="link">Link Text</ThemedText>);
    const text = getByText('Link Text');
    expect(text.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontSize: 16, lineHeight: 30, color: '#0a7ea4' }),
      ])
    );
  });

  it('accepts custom styles via props', () => {
    const { getByText } = render(
      <ThemedText style={{ fontSize: 20 }}>Custom Style</ThemedText>
    );
    const text = getByText('Custom Style');
    expect(text.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontSize: 20 }),
      ])
    );
  });
});
