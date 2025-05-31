import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Asset } from 'expo-asset';
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
  const [stepReady, setStepReady] = useState(false);


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
    // try {
    //   const result = await DocumentPicker.getDocumentAsync({ multiple: false });
    //   if (result.canceled || !result.assets?.length) return;
    //   const file = result.assets[0];
    //   setFiles(prev => [...prev, file]);

    //   const formData = new FormData();
    //   formData.append('file', {
    //     uri: file.uri,
    //     name: file.name,
    //     type: file.mimeType || 'application/pdf',
    //   } as any);

    //   const res = await fetch(`${API_URL}/assistant/project_draft`, {
    //     method: 'POST',
    //     headers: {
    //       Authorization: `Bearer ${session?.token}`,
    //     },
    //     body: formData,
    //   });

    //   const data = await res.json();
    //   const draft = JSON.stringify(data.projects?.[0], null, 2);
    //   setChatMessages(prev => [
    //     ...prev,
    //     { text: `📎 Uploaded file: ${file.name}`, from: 'user', timestamp: new Date().toISOString() },
    //     { text: '```json\n' + draft + '\n```', from: 'bot', timestamp: new Date().toISOString() },
    //   ]);
    // } catch (error) {
    //   console.error('Document picker error:', error);
    //   Alert.alert('Failed to upload and parse document');
    // }
    try {
      const asset = Asset.fromModule(require('../assets/temp.pdf'));
      await asset.downloadAsync();

      const file = {
        uri: asset.localUri || asset.uri,
        name: 'temp.pdf',
        type: 'application/pdf',
      };

      setFiles(prev => [...prev, file]);

      setChatMessages(prev => [
        ...prev,
        {
          text: `📎 Uploaded file: ${file.name}`,
          from: 'user',
          timestamp: new Date().toISOString(),
        }
      ]);
      
    } catch (error) {
      console.error('Asset loading error:', error);
      Alert.alert('Failed to load asset file');
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
      const res = await fetch(`${API_URL}/assistant/previewMessage`, {
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


  const startConversation = async () => {
    if (files.length === 0) {
      setChatMessages([{
        text: '麻煩您提供上述的資訊來，或是如果你並沒有要進行排程的話請直接按下 Add。',
        from: 'bot',
        timestamp: new Date().toISOString()
      }]);
      setStepReady(true);
      return;
    }

    try {
      const formData = new FormData();
      const file = files[0]; // 只取一個檔案
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);

      const res = await fetch(`${API_URL}/assistant/project_draft`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
        body: formData,
      });

      const data = await res.json();
      const draft = JSON.stringify(data.projects?.[0], null, 2);

      setChatMessages(prev => [
        ...prev,
        {
          text: '```json\n' + draft + '\n```',
          from: 'bot',
          timestamp: new Date().toISOString()
        }
      ]);
      setStepReady(true);
    } catch (e) {
      console.error(e);
      Alert.alert('Failed to fetch draft');
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

  const JsonDisplay = ({ data }: { data: any }) => {
    return (
      <View className="gap-2">
        {data.projects?.map((project: any, i: number) => (
          <View key={i} className="bg-white p-2 rounded-lg border border-gray-300">
            <Text className="font-bold text-lg">{project.name}</Text>
            <Text className="text-sm text-gray-700 mb-1">{project.summary}</Text>
            <Text className="text-xs text-gray-500">🗓 {project.start_time} → {project.due_date}</Text>
            <Text className="text-xs text-gray-500 mb-2">⏳ {project.estimated_loading} hrs</Text>

            {project.milestones?.map((m: any, j: number) => (
              <View key={j} className="mt-2 pl-2 border-l-2 border-pink-300">
                <Text className="font-semibold">{m.name}</Text>
                <Text className="text-sm text-gray-600">{m.summary}</Text>
                <Text className="text-xs text-gray-500">📅 {m.start_time} → {m.end_time}</Text>
                <Text className="text-xs text-gray-500 mb-1">⏱ {m.estimated_loading} hrs</Text>

                {m.tasks?.map((t: any, k: number) => (
                  <View key={k} className="ml-2 mt-1 p-2 bg-gray-100 rounded">
                    <Text className="font-semibold">{t.title}</Text>
                    <Text className="text-sm">{t.description}</Text>
                    <Text className="text-xs text-gray-500">📆 Due: {t.due_date}</Text>
                    <Text className="text-xs text-gray-500">⏱ {t.estimated_loading} hrs</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };



  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl px-6 pt-4 pb-6" style={{ height: '80%' }}>
          <View className="items-center mb-2">
            <View className="w-10 h-1.5 rounded-full bg-gray-300" />
          </View>

          {/* Reset 按鈕 */}
          <View className="absolute left-6 top-4 flex-row items-center gap-4">
            {!stepReady ? (<TouchableOpacity onPress={resetAll} className="flex-row items-center">
              <Feather name="rotate-ccw" size={18} color="#F29389" />
              <Text className="text-[#F29389] font-semibold ml-1">Reset</Text>
            </TouchableOpacity>
            ):(
              <TouchableOpacity onPress={() => setStepReady(false)}>
                <Text className="text-[#F29389] font-bold">Last</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cancel 按鈕 */}
          <TouchableOpacity onPress={onClose} className="absolute right-6 top-4">
            <Text className="text-[#F29389] font-bold">Cancel</Text>
          </TouchableOpacity>

          <Text className="text-xl font-bold text-center">Add New Project</Text>

          {!stepReady ? (
            <>
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
              </View>

              {showPicker && (
                <DateTimePicker
                  value={deadline || new Date()}
                  onChange={(e, date) => {
                    if (date) setDeadline(date);
                    setShowPicker(false);
                  }}
                  mode="datetime"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant="light"
                />
              )}

              <TouchableOpacity
                className="mt-6 p-4 rounded-xl border border-dashed border-[#F29389] bg-[#F8C8C3] bg-opacity-20 gap-2"
                onPress={pickDocument}
              >
                <Text className="text-center text-[#5E1526] font-semibold text-2xl py-2">+</Text>
                <Text className="text-center text-md text-[#5E1526] font-semibold">Upload your project requirements file</Text>
                <Text className="text-center text-md text-[#5E1526] font-semibold mb-4">(.docx or .pdf)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`mt-6 rounded-full py-3 px-6 w-fit mx-auto ${title.trim() && deadline ? 'bg-[#5E1526]' : 'bg-gray-400'}`}
                disabled={!title.trim() || !deadline}
                onPress={startConversation}
              >
                <Text className="text-center text-white font-semibold">Next</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
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

              <TouchableOpacity
                className="mt-4 rounded-full py-3 px-6 w-fit mx-auto bg-[#5E1526]"
                onPress={handleAddProject}
              >
                <Text className="text-center text-white font-semibold">+ Add</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
