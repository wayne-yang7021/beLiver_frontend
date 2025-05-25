import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Register() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onRegister = () => {
    // TODO: Add validation and backend integration
    router.push('./home');
  };

  return (
    <View className="flex-1 bg-[#F8C8C3] justify-center px-8">
      {/* Logo */}
      <View className="items-center mb-8">
        <Image
          source={require('../assets/images/liver.png')}
          className="w-24 h-24"
          style={{ resizeMode: 'contain' }}
        />
        <Text className="text-3xl font-bold text-[#5E1526] mt-4">Create Account</Text>
        <Text className="text-[#772343]">Join your productivity space</Text>
      </View>

      {/* Name */}
      <View className="mb-4 bg-white rounded-2xl flex-row items-center px-4 py-3 shadow">
        <Feather name="user" size={20} color="#F29389" />
        <TextInput
          className="ml-3 flex-1 text-[#5E1526]"
          placeholder="Your Name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Email */}
      <View className="mb-4 bg-white rounded-2xl flex-row items-center px-4 py-3 shadow">
        <Feather name="mail" size={20} color="#F29389" />
        <TextInput
          className="ml-3 flex-1 text-[#5E1526]"
          placeholder="Email"
          keyboardType="email-address"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      {/* Password */}
      <View className="mb-6 bg-white rounded-2xl flex-row items-center px-4 py-3 shadow">
        <Feather name="lock" size={20} color="#F29389" />
        <TextInput
          className="ml-3 flex-1 text-[#5E1526]"
          placeholder="Password"
          secureTextEntry
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {/* Register Button */}
      <TouchableOpacity
        className="bg-[#F29389] py-4 rounded-full items-center shadow-lg"
        onPress={onRegister}
      >
        <Text className="text-white font-bold text-lg">Register</Text>
      </TouchableOpacity>

      {/* Go to Login */}
      <View className="mt-6 items-center">
        <Text className="text-[#772343]">Already have an account?</Text>
        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text className="text-[#5E1526] font-semibold mt-1">Go back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
