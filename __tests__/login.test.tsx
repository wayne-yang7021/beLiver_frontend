// __tests__/login.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Login from '../app/login';
import { useSession } from '../context/SessionContext';

// Mock dependencies
jest.mock('expo-router');
jest.mock('../context/SessionContext');

// Mock Alert - 更安全的方式
const mockAlert = jest.fn();
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      ...RN.Alert,
      alert: mockAlert,
    },
  };
});

// Mock global functions
global.fetch = jest.fn();
global.alert = jest.fn();

describe('Login Component', () => {
  const mockPush = jest.fn();
  const mockSetSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useRouter
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
    const { getByPlaceholderText, getByText } = render(<Login />);

    // Check if all UI elements are rendered
    expect(getByText('Welcome Back!')).toBeTruthy();
    expect(getByText('Login to your project space')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Login')).toBeTruthy();
    expect(getByText('Dont have an account?')).toBeTruthy();
    expect(getByText('Create one here')).toBeTruthy();
  });

  it('updates email input when user types', () => {
    const { getByPlaceholderText } = render(<Login />);
    const emailInput = getByPlaceholderText('Email');

    fireEvent.changeText(emailInput, 'test@example.com');

    expect(emailInput.props.value).toBe('test@example.com');
  });

  it('updates password input when user types', () => {
    const { getByPlaceholderText } = render(<Login />);
    const passwordInput = getByPlaceholderText('Password');

    fireEvent.changeText(passwordInput, 'password123');

    expect(passwordInput.props.value).toBe('password123');
  });

  it('shows alert when trying to login with empty fields', () => {
    const { getByText } = render(<Login />);
    const loginButton = getByText('Login');

    fireEvent.press(loginButton);

    expect(global.alert).toHaveBeenCalledWith('Please enter both email and password');
  });

  it('shows alert when email is empty', () => {
    const { getByPlaceholderText, getByText } = render(<Login />);
    
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    expect(global.alert).toHaveBeenCalledWith('Please enter both email and password');
  });

  it('shows alert when password is empty', () => {
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

    const { getByPlaceholderText, getByText } = render(<Login />);

    // Fill in the form
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

    // Press login button
    fireEvent.press(getByText('Login'));

    // Wait for API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        }
      );
    });

    // Check if session is set
    await waitFor(() => {
      expect(mockSetSession).toHaveBeenCalledWith({
        token: 'mock-token-123',
        user_id: '456',
        name: 'John Doe',
      });
    });

    // Check success alert and navigation
    expect(mockAlert).toHaveBeenCalledWith('Success', 'Successfully login!');
    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  it('handles login failure with error message', async () => {
    const errorMessage = 'Invalid credentials';
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: errorMessage }),
    });

    const { getByPlaceholderText, getByText } = render(<Login />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpassword');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(errorMessage);
    });

    // Should not set session or navigate
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('handles login failure without error message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

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

  it('navigates to register page when "Create one here" is pressed', () => {
    const { getByText } = render(<Login />);
    const registerLink = getByText('Create one here');

    fireEvent.press(registerLink);

    expect(mockPush).toHaveBeenCalledWith('./register');
  });

  it('makes API call with correct environment URL', async () => {
    // Test with custom API URL
    const originalEnv = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        token: 'token',
        user_id: '123',
        name: 'User',
      }),
    });

    const { getByPlaceholderText, getByText } = render(<Login />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/login',
        expect.any(Object)
      );
    });

    // Restore original environment
    process.env.EXPO_PUBLIC_API_URL = originalEnv;
  });

  it('has correct input properties', () => {
    const { getByPlaceholderText } = render(<Login />);
    
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');

    // Check email input properties
    expect(emailInput.props.keyboardType).toBe('email-address');
    expect(emailInput.props.placeholderTextColor).toBe('#999');

    // Check password input properties
    expect(passwordInput.props.secureTextEntry).toBe(true);
    expect(passwordInput.props.placeholderTextColor).toBe('#999');
  });
});