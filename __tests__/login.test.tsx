import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../context/SessionContext';

// ===== MOCK =====
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../context/SessionContext');

// mock Alert.alert
const mockAlert = jest.fn();
beforeAll(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);
});

afterAll(() => {
  jest.restoreAllMocks();
});

// mock global.fetch
global.fetch = jest.fn();
global.alert = jest.fn();

describe('Login Component', () => {
  const mockPush = jest.fn();
  const mockSetSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock expo-router useRouter
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    // Mock useSession
    (useSession as jest.Mock).mockReturnValue({
      session: null,
      setSession: mockSetSession,
    });
  });

  it('renders login form correctly', () => {
    const Login = require('../app/login').default;
    const { getByPlaceholderText, getByText } = render(<Login />);

    expect(getByText('Welcome Back!')).toBeTruthy();
    expect(getByText('Login to your project space')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Login')).toBeTruthy();
    expect(getByText('Dont have an account?')).toBeTruthy();
    expect(getByText('Create one here')).toBeTruthy();
  });

  it('updates email input when user types', () => {
    const Login = require('../app/login').default;
    const { getByPlaceholderText } = render(<Login />);
    const emailInput = getByPlaceholderText('Email');

    fireEvent.changeText(emailInput, 'test@example.com');
    expect(emailInput.props.value).toBe('test@example.com');
  });

  it('updates password input when user types', () => {
    const Login = require('../app/login').default;
    const { getByPlaceholderText } = render(<Login />);
    const passwordInput = getByPlaceholderText('Password');

    fireEvent.changeText(passwordInput, 'password123');
    expect(passwordInput.props.value).toBe('password123');
  });

  it('shows alert when trying to login with empty fields', () => {
    const Login = require('../app/login').default;
    const { getByText } = render(<Login />);
    fireEvent.press(getByText('Login'));

    expect(global.alert).toHaveBeenCalledWith('Please enter both email and password');
  });

  it('shows alert when email is empty', () => {
    const Login = require('../app/login').default;
    const { getByPlaceholderText, getByText } = render(<Login />);
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    expect(global.alert).toHaveBeenCalledWith('Please enter both email and password');
  });

  it('shows alert when password is empty', () => {
    const Login = require('../app/login').default;
    const { getByPlaceholderText, getByText } = render(<Login />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.press(getByText('Login'));

    expect(global.alert).toHaveBeenCalledWith('Please enter both email and password');
  });

  it('handles successful login', async () => {
    const mockResponse = {
      token: 'mock-token-123',
      user_id: '456',
      name: 'John Doe',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const Login = require('../app/login').default;
    const { getByPlaceholderText, getByText } = render(<Login />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.any(Object)
      );
    });

    await waitFor(() => {
      expect(mockSetSession).toHaveBeenCalledWith(mockResponse);
    });

    expect(mockAlert).toHaveBeenCalledWith('Success', 'Successfully login!');
    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  it('handles login failure with error message', async () => {
    const errorMessage = 'Invalid credentials';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: errorMessage }),
    });

    const Login = require('../app/login').default;
    const { getByPlaceholderText, getByText } = render(<Login />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpassword');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(errorMessage);
    });

    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('handles login failure without error message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const Login = require('../app/login').default;
    const { getByPlaceholderText, getByText } = render(<Login />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Login failed');
    });
  });

  it('handles network error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const Login = require('../app/login').default;
    const { getByPlaceholderText, getByText } = render(<Login />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Login error');
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  // it('makes API call with correct environment URL', async () => {
  //   const originalEnv = process.env.EXPO_PUBLIC_API_URL;
  //   process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
  
  //   let Login: React.FC;
  
  //   jest.isolateModules(() => {
  //     jest.doMock('../context/SessionContext', () => ({
  //       useSession: () => ({
  //         session: null,
  //         setSession: jest.fn(),
  //       }),
  //     }));
  
  //     jest.doMock('expo-router', () => ({
  //       useRouter: () => ({
  //         push: jest.fn(),
  //       }),
  //     }));
  
  //     Login = require('../app/login').default;
  //   });
  
  //   (global.fetch as jest.Mock).mockResolvedValueOnce({
  //     ok: true,
  //     json: () =>
  //       Promise.resolve({
  //         token: 'token',
  //         user_id: '123',
  //         name: 'User',
  //       }),
  //   });
  
  //   const { getByPlaceholderText, getByText } = render(<Login />);
  //   fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
  //   fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
  //   fireEvent.press(getByText('Login'));
  
  //   await waitFor(() => {
  //     expect(global.fetch).toHaveBeenCalledWith(
  //       'https://api.example.com/auth/login',
  //       expect.any(Object)
  //     );
  //   });
  
  //   process.env.EXPO_PUBLIC_API_URL = originalEnv;
  // });
  
  

  it('has correct input properties', () => {
    const Login = require('../app/login').default;
    const { getByPlaceholderText } = render(<Login />);

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');

    expect(emailInput.props.keyboardType).toBe('email-address');
    expect(emailInput.props.placeholderTextColor).toBe('#999');
    expect(passwordInput.props.secureTextEntry).toBe(true);
    expect(passwordInput.props.placeholderTextColor).toBe('#999');
  });
});
