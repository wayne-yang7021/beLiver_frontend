import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

export default function IndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (router.canGoBack === undefined || router.replace === undefined) return;

      // 等待 router 準備好
      router.replace('/login');
    }, 50); // 延遲一點點也可以避免錯誤

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text>Loading...</Text>
    </View>
  );
}
