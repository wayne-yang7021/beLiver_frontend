import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useSession } from '../context/SessionContext';
import '../global.css';

export default function IndexRedirect() {
  const router = useRouter();
  const { session, isLoaded } = useSession();

  useEffect(() => {
    if (!isLoaded) return;

    const timeout = setTimeout(() => {
      if (session) {
        router.replace('/home');
        // router.replace('/login');
      } else {
        router.replace('/login');
      }
      // router.replace('/login');
    }, 10);

    return () => clearTimeout(timeout);
  }, [session, isLoaded, router]);

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text>Loading...</Text>
    </View>
  );
}
