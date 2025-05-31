import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useSession } from '../context/SessionContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function AddProjectModal({
  visible,
  onClose,
  projectId,
}: {
  visible: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<
    { text: string; from: 'user' | 'bot'; timestamp: string }[]
  >([]);

  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const { session } = useSession();

  const storage = {
    set: async (key: string, value: any) => {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.warn(`Failed to save ${key}`, e);
      }
    },
    get: async (key: string) => {
      try {
        const value = await AsyncStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      } catch (e) {
        console.warn(`Failed to load ${key}`, e);
        return null;
      }
    },
    remove: async (key: string) => {
      try {
        await AsyncStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove ${key}`, e);
      }
    },
  };




  // Load saved draft from localStorage
  useEffect(() => {
    if (!visible) return;

    const loadStorage = async () => {
      const savedTitle = await storage.get(`project-${projectId}`);
      const savedDeadline = await storage.get(`deadline-${projectId}`);
      const savedChat = await storage.get(`chat-${projectId}`);
      const savedFiles = await storage.get(`files-${projectId}`);

      if (savedTitle) setTitle(savedTitle);
      if (savedDeadline) setDeadline(new Date(savedDeadline));
      if (savedChat) setChatMessages(savedChat);
      if (savedFiles) setFiles(savedFiles);
    };

    loadStorage();
  }, [visible, projectId]);


 useEffect(() => {
    storage.set(`project-${projectId}`, title);
  }, [title, projectId]);

  useEffect(() => {
    if (deadline) storage.set(`deadline-${projectId}`, deadline.toISOString());
  }, [deadline, projectId]);

  useEffect(() => {
    storage.set(`chat-${projectId}`, chatMessages);
  }, [chatMessages, projectId]);

  useEffect(() => {
    storage.set(`files-${projectId}`, files);
  }, [files, projectId]);


  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: false });
      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      setFiles(prev => [...prev, file]);

      setChatMessages(prev => [
        ...prev,
        { text: `📎 Uploaded file: ${file.name}`, from: 'user', timestamp: new Date().toISOString() },
        { text: 'Thanks, file received!', from: 'bot', timestamp: new Date().toISOString() },
      ]);

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Document picker error:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = {
      text: input,
      from: 'user' as const,
      timestamp: new Date().toISOString(),
    };

    const botMsg = {
      text: '',
      from: 'bot' as const,
      timestamp: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, userMsg, botMsg]);
    setInput('');

    try {
      const res = await fetch(`${API_URL}/assistant/previewMessage/stream`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          user_id: session?.user_id,
          message: input,
          chat_history: [...chatMessages, userMsg].map(m => ({
            sender: m.from,
            message: m.text,
            timestamp: m.timestamp,
          })),
          uploaded_files: files.map(f => ({
            file_name: f.name,
            file_url: f.uri,
          })),
        }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        setChatMessages(prev => {
          const newPrev = [...prev];
          newPrev[newPrev.length - 1] = {
            ...newPrev[newPrev.length - 1],
            text: buffer,
          };
          return newPrev;
        });

        flatListRef.current?.scrollToEnd({ animated: true });
      }
    } catch (e) {
      console.error('Streaming failed:', e);
      setChatMessages(prev => [
        ...prev.slice(0, -1),
        {
          text: '❌ Failed to get response.',
          from: 'bot',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };




  const handleAddProject = async () => {
    if (!title.trim()) {
      Alert.alert('Project name is required.');
      return;
    }

    if (!deadline) {
      Alert.alert('Please select a deadline.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/assistant/newProject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          name: title,
          due_date: deadline.toISOString(),
          chat_history: chatMessages.map(msg => ({
            sender: msg.from,
            message: msg.text,
            timestamp: msg.timestamp || new Date().toISOString(),
          })),
          uploaded_files: files.map(file => ({
            file_url: file.uri,
            file_name: file.name,
          })),
        }),
      });

      if (!res.ok) throw new Error('Failed to create project');
      const data = await res.json();
      console.log('Project created:', data);

      resetAll();
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert('Failed to create project');
    }
  };

  const clearProjectStorage = async (id: string) => {
    const keys = ['project', 'deadline', 'chat', 'files'];
    for (const key of keys) {
      await storage.remove(`${key}-${id}`);
    }
  };

  const resetAll = async () => {
    await clearProjectStorage(projectId);
    setTitle('');
    setDeadline(null);
    setInput('');
    setChatMessages([]);
    setFiles([]);
  };


  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl px-6 pt-4 pb-6" style={{ height: '80%' }}>
          <View className="items-center mb-2">
            <View className="w-10 h-1.5 rounded-full bg-gray-300" />
          </View>

          {/* Reset 按鈕 */}
          <TouchableOpacity onPress={resetAll} className="absolute left-6 top-4">
            <Text className="text-[#F29389] font-bold">Reset</Text>
          </TouchableOpacity>

          {/* Cancel 按鈕 */}
          <TouchableOpacity onPress={onClose} className="absolute right-6 top-4">
            <Text className="text-[#F29389] font-bold">Cancel</Text>
          </TouchableOpacity>

          <Text className="text-xl font-bold text-center">Add New Project</Text>

          {/* Title */}
          <View className="mt-4">
            <Text className="font-semibold text-[#555] mb-1">
              Your Project Name: <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className="bg-gray-100 p-3 rounded text-gray-700"
              value={title}
              onChangeText={setTitle}
              placeholder="project name"
              placeholderTextColor="#aaa"
            />
          </View>

          {/* Deadline */}
          <View className="mt-4">
            <Text className="font-semibold text-[#555] mb-1">
              Deadline: <Text className="text-red-500">*</Text>
            </Text>
            <Pressable onPress={() => setShowPicker(true)}>
              <View className="flex-row gap-2">
                <View className="flex-1 rounded bg-gray-100 px-4 py-2 justify-center">
                  <Text className="text-[#F29389]">
                    {deadline ? deadline.toLocaleDateString() : 'Select date'}
                  </Text>
                </View>
                <View className="flex-1 rounded bg-gray-100 px-4 py-2 justify-center">
                  <Text className="text-[#F29389]">
                    {deadline ? deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Select time'}
                  </Text>
                </View>
              </View>
            </Pressable>
            {showPicker && Platform.OS === 'ios' && (
              <DateTimePicker
                value={deadline || new Date()}
                onChange={(e, date) => {
                  if (date) setDeadline(date);
                  setShowPicker(false);
                }}
                mode="datetime"
                display="spinner"
                themeVariant="light"
              />
            )}
            {showPicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={deadline || new Date()}
                onChange={(e, date) => {
                  setShowPicker(false);
                  if (date) setDeadline(date);
                }}
                mode="datetime"
                display="default"
              />
            )}
          </View>

          {/* 對話與檔案上傳 */}
          {title.trim() && deadline && (
            <>
              {files.length > 0 && (
                <View className="mt-4">
                  <Text className="font-semibold mb-1">Uploaded Files:</Text>
                  {files.map((file, index) => (
                    <View key={index} className="bg-gray-100 p-2 rounded mb-1 flex-row justify-between items-center">
                      <Text className="text-sm text-gray-700">{file.name}</Text>
                      <Text className="text-xs text-gray-500">{file.mimeType || 'unknown'}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                className="mt-4 p-4 rounded-xl border border-dashed border-[#F29389] bg-[#F8C8C3] bg-opacity-20 gap-2"
                onPress={pickDocument}
              >
                <Text className="text-center text-[#5E1526] font-semibold text-2xl py-2">+</Text>
                <Text className="text-center text-md text-[#5E1526] font-semibold">Upload your project requirements file</Text>
                <Text className="text-center text-md text-[#5E1526] font-semibold mb-4">(.docx or .pdf)</Text>
              </TouchableOpacity>

              <View className="flex-1 mt-4 mb-2">
                <FlatList
                  ref={flatListRef}
                  data={chatMessages}
                  keyExtractor={(_, index) => index.toString()}
                  renderItem={({ item }) => (
                    <View className={`rounded-xl px-4 py-2 mb-2 max-w-[75%] ${item.from === 'user' ? 'bg-[#F29389] self-end' : 'bg-gray-100 self-start'}`}>
                      <Markdown>{item.text}</Markdown>
                    </View>
                  )}
                />
              </View>

              <View className="flex-row items-center bg-gray-200 px-2 py-2 rounded-lg">
                <TextInput
                  className="flex-1 p-2"
                  placeholder="Write down your request"
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={sendMessage}
                />
                <TouchableOpacity onPress={sendMessage}>
                  <Text className="ml-2 text-[#F29389] text-lg">➤</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Add 按鈕 */}
          <TouchableOpacity
            className={`mt-4 rounded-full py-3 px-6 w-fit mx-auto ${title.trim() && deadline ? 'bg-[#5E1526]' : 'bg-gray-400'}`}
            disabled={!title.trim() || !deadline}
            onPress={handleAddProject}
          >
            <Text className="text-center text-white font-semibold">+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
