// AddProjectModal.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AddProjectModal from '../components/AddProjectModal';

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ name: 'test.pdf', mimeType: 'application/pdf' }],
    })
  ),
}));

describe('AddProjectModal', () => {
  it('renders correctly when visible', () => {
    const { getByText } = render(
      <AddProjectModal visible={true} onClose={() => {}} />
    );
    expect(getByText('Add New Project')).toBeTruthy();
  });

  it('can type project name', () => {
    const { getByPlaceholderText } = render(
      <AddProjectModal visible={true} onClose={() => {}} />
    );

    const input = getByPlaceholderText('project name');
    fireEvent.changeText(input, 'My Test Project');

    expect(input.props.value).toBe('My Test Project');
  });

  it('calls onClose when Cancel is pressed', () => {
    const mockClose = jest.fn();
    const { getByText } = render(
      <AddProjectModal visible={true} onClose={mockClose} />
    );

    fireEvent.press(getByText('Cancel'));
    expect(mockClose).toHaveBeenCalled();
  });

  it('uploads document and displays file name', async () => {
    const { getByText, queryByText } = render(
      <AddProjectModal visible={true} onClose={() => {}} />
    );

    fireEvent.press(
      getByText('+ Upload your project requirements file (.docx or .pdf)')
    );

    await waitFor(() => {
      expect(queryByText('test.pdf')).toBeTruthy();
    });
  });

  it('can send and display chat message', () => {
    const { getByPlaceholderText, getByText } = render(
      <AddProjectModal visible={true} onClose={() => {}} />
    );

    const chatInput = getByPlaceholderText('Write down your request');

    fireEvent.changeText(chatInput, 'Hello bot!');
    fireEvent(chatInput, 'submitEditing');

    expect(getByText('Hello bot!')).toBeTruthy();
    expect(getByText('Ok, got it.')).toBeTruthy();
  });
});
