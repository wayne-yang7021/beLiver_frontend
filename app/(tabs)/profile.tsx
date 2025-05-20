// app/(tabs)/profile.tsx
import { Text, View } from 'react-native';

export default function Profile() {
  return (
    <View className="flex-1 items-center justify-center bg-red-100">
      <Text className="text-2xl font-bold text-gray-800">Profile</Text>
      <Text className="text-base text-gray-700 mt-2">
        This is a placeholder for the profile screen
      </Text>
    </View>
  );
}