import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSession } from '../context/SessionContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
// console.log(API_URL); // 


export default function Login() {
  const router = useRouter();
  const { session, setSession } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onLogin = async () => {
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      console.log('Login response:', data);
      if (res.ok) {
        setSession({
          token: data.token,
          user_id: data.user_id,
          name: data.name,
        });
        Alert.alert('Success', 'Successfully login!');
        router.push('/home');
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      alert('Login error');
    }
  };


  return (
    <View className="flex-1 bg-[#F8C8C3] justify-center px-8">
      {/* Liver Icon */}
      <View className="items-center mb-8">
        <Image
          source={require('../assets/images/liver.png')}
          className="w-24 h-24"
          style={{ resizeMode: 'contain' }}
        />
        <Text className="text-3xl font-bold text-[#5E1526] mt-4">Welcome Back!</Text>
        <Text className="text-[#772343]">Login to your project space</Text>
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

      {/* Login Button */}
      <TouchableOpacity
        className="bg-[#F29389] py-4 rounded-full items-center shadow-lg"
        onPress={onLogin}
      >
        <Text className="text-white font-bold text-lg">Login</Text>
      </TouchableOpacity>

      {/* Register */}
      <View className="mt-6 items-center">
        <Text className="text-[#772343]">Dont have an account?</Text>
        <TouchableOpacity onPress={() => router.push('./register')} className="mt-2">
          <Text className="text-[#5E1526] font-semibold mt-1">Create one here</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
