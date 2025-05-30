import { Stack } from 'expo-router';
import { SessionProvider } from '../context/SessionContext'; // 你放哪裡就改這裡
import '../global.css';

export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </SessionProvider>
  );
}
