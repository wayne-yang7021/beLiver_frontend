import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { TypingAnimation } from 'react-native-typing-animation';
import { useSession } from '../context/SessionContext';


const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function AddProjectModal({
  visible,
  onClose,
  projectId,
  onProjectAdded,
}: {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  onProjectAdded?: () => void;
}) {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [projectJson, setProjectJson] = useState<any>(null); // 預設 null
  const [chatMessages, setChatMessages] = useState<
    { text: string; from: 'user' | 'bot'; timestamp: string }[]
  >([]);
  const [typingPrefix, setTypingPrefix] = useState('');
  const [typingIndex, setTypingIndex] = useState<number | null>(null);

  const [chatId, setChatId] = useState(0);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const { session } = useSession();
  const [stepReady, setStepReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);



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
    const loadJson = async () => {
    const savedJson = await storage.get(`json-${projectId}`);
      if (savedJson) setProjectJson(savedJson);
    };

    loadJson();
    loadStorage();
  }, [visible, projectId]);



 useEffect(() => {
    storage.set(`project-${projectId}`, title);
  }, [title, projectId]);

  useEffect(() => {
    // console.log(deadline);
    if (deadline) storage.set(`deadline-${projectId}`, deadline.toISOString());
  }, [deadline, projectId]);

  useEffect(() => {
    storage.set(`chat-${projectId}`, chatMessages);
  }, [chatMessages, projectId]);

  useEffect(() => {
    storage.set(`files-${projectId}`, files);
  }, [files, projectId]);


  const pickDocument = async () => {
    setIsLoading(true);

    try {
      await storage.remove(`chat-${projectId}`); // Remove 'chat-{projectId}'
      const result = await DocumentPicker.getDocumentAsync({ multiple: false });
      // console.log(result);
      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      setFiles(prev => [...prev, file]);

    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Failed to pick document');
    } finally {
      setIsLoading(false);
    }
  };


  const sendMessage = async () => {
    setChatId(chatId+1);
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


   const newIndex = chatMessages.length + 1;

    setChatMessages(prev => [...prev, userMsg, botMsg]);
    setTypingIndex(newIndex);
    setInput('');
    setIsTyping(true); 

    // setTypingPrefix('AI 正在重新規劃任務');

    try {
      const savedJson = await storage.get(`json-${projectId}`);
      if (!savedJson) {
        throw new Error('❌ 找不到專案 JSON，無法重新規劃');
      }

      const userOnlyHistory = [...chatMessages, userMsg]
        .filter(m => m.from === 'user')
        .map(m => ({
          sender: m.from,
          message: m.text,
          timestamp: m.timestamp,
        }));
      const wrappedJson = { projects: savedJson };
      console.log("Json now: ", wrappedJson);
      console.log("User History: ", userOnlyHistory);
      const res = await fetch(`${API_URL}/assistant/replan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_json: wrappedJson,
          chat_history: userOnlyHistory,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to replan project: ${errText}`);
      }


      const { updated_json, markdown } = await res.json();

      setChatMessages(prev => {
        const newPrev = [...prev];
        newPrev[newPrev.length - 1] = {
          ...newPrev[newPrev.length - 1],
          text: markdown,
        };
        return newPrev;
      });

      await storage.set(`json-${projectId}`, updated_json);
      setProjectJson(updated_json);

      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (e) {
      console.error('Replan failed:', e);
      setChatMessages(prev => [
        ...prev.slice(0, -1),
        {
          text: '❌ 無法重新規劃專案，請稍後再試。',
          from: 'bot',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false); // Stop typing indicator
      setTypingIndex(null);
    }
  };

  useEffect(() => {
    if (isTyping) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [isTyping]);




  const handleAddProject = async () => {
    setIsLoading(true);
    if (!title.trim()) {
      Alert.alert('Project name is required.');
      return;
    }

    if (!deadline) {
      Alert.alert('Please select a deadline.');
      return;
    }

    const uploaded_files = files.map(file => ({
      file_url: file.uri,
      file_name: file.name,
    }))

    const payload = {
        project_id: projectId,
        chat_history: chatMessages
          .filter(m => m.from === 'user')
          .map(m => ({
            sender: m.from,
            message: m.text,
            timestamp: m.timestamp || new Date().toISOString(),
          })),
        uploaded_files: uploaded_files,
        projects: Array.isArray(projectJson)
          ? (Array.isArray(projectJson[0]) ? projectJson[0] : projectJson)
          : [projectJson],
      };

      console.log('📦 Sending payload:\n', JSON.stringify(payload, null, 2));

    
    try {
      // ✅ 先建立新專案，取得 project_id
      const res = await fetch(`${API_URL}/assistant/newProject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            project_id: projectId,
            chat_history: chatMessages
                      .filter(m => m.from === 'user')
                      .map(m => ({
                        sender: m.from,
                        message: m.text,
                        timestamp: m.timestamp || new Date().toISOString(),
                      })),
            uploaded_files: uploaded_files,
            projects: Array.isArray(projectJson)
                      ? (Array.isArray(projectJson[0]) ? projectJson[0] : projectJson)
                      : [projectJson],

          }),
      });
      if (!res.ok) throw new Error('Failed to create project');
      const data = await res.json();
      const newProjectId = data.project_id;

      // ✅ 再用 newProjectId 上傳檔案
      let uploadedFiles = [];
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach(file => {
          formData.append('files', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/pdf',
          } as any);
        });
        formData.append('projectId', newProjectId);

        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.token}`,
          },
          body: formData,
        });

        if (!uploadRes.ok) throw new Error('File upload failed');
        const uploadData = await uploadRes.json();
        uploadedFiles = uploadData.files || [];
      }

      // （可選）你也可以再 PATCH 一次 project 把 uploaded_files 更新進資料庫，或就保留原本的檔案表關聯即可

      resetAll();
      onClose();
      if (onProjectAdded) onProjectAdded(); 
    } catch (e) {
      console.error(e);
      Alert.alert('Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };



  const clearProjectStorage = async (id: string) => {
    const keys = ['project', 'deadline', 'chat', 'files', 'json'];
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

    const savedChat = await storage.get(`chat-${projectId}`);
    const savedJson = await storage.get(`json-${projectId}`);

    if (savedChat?.length > 0) {
      setChatMessages(savedChat);
      if (savedJson) setProjectJson(savedJson);
      setStepReady(true);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 300); // 記得等一下讓畫面能渲染完

      return;
    }
    // setTypingPrefix('AI 正在閱讀您的文件');

    const uploadMsg = {
      text: `📎 Uploaded file: ${files[0].name}`,
      from: 'user' as const,
      timestamp: new Date().toISOString(),
    };

    const botMsg = {
      text: '',
      from: 'bot' as const,
      timestamp: new Date().toISOString(),
    };


    const userIndex = chatMessages.length;
    const botIndex = userIndex + 1;

    setChatMessages(prev => [...prev, uploadMsg, botMsg]);
    setTypingIndex(botIndex); // ✅ 告訴 FlatList 這個 index 要顯示 Typing 動畫
    setStepReady(true);
    setIsTyping(true);

    try {
      const formData = new FormData();
      const file = files[0];
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);

      formData.append('title', title);
      formData.append('deadline', deadline ? deadline.toISOString() : '');

      const res = await fetch(`${API_URL}/assistant/project_draft`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
        body: formData,
      });

      const data = await res.json();
      const draft = data.response || JSON.stringify(data.projects?.[0], null, 2);
      
      console.log("gemini reponse: \n",
        draft
      )
      // ✅ 儲存 JSON 結構
      if (data.projects) {
        await storage.set(`json-${projectId}`, data.projects);
        setProjectJson(data.projects);
      }

      setChatMessages(prev => {
        const newPrev = [...prev];
        const lastIndex = newPrev.length - 1;

        if (newPrev[lastIndex].from === 'bot' && newPrev[lastIndex].text === '') {
          newPrev[lastIndex].text = draft;
        } else {
          // 如果沒加 botMsg，補上
          newPrev.push({
            text: draft,
            from: 'bot',
            timestamp: new Date().toISOString()
          });
        }

        return newPrev;
      });

      setTypingIndex(null); // ✅ 清除 typing 狀態



    } catch (e) {
      console.error(e);
      Alert.alert('Failed to fetch draft');
      setChatMessages(prev => [...prev, {
        text: '❌ 無法取得 Gemini 回覆，請稍後再試。',
        from: 'bot',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
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
              {isLoading && (
                <View className="items-center justify-center py-4">
                  <ActivityIndicator size="large" color="#F29389" />
                </View>
              )}


              {files.length > 0 && (
                <View className="mt-4">
                  <Text className="text-[#5E1526] font-bold mb-2">Uploaded Files:</Text>
                  {files.map((file, index) => (
                    <View key={index} className="flex-row items-center justify-between bg-gray-100 p-3 rounded-lg mb-2">
                      <Text className="text-gray-800 flex-1" numberOfLines={1}>
                        📄 {file.name}
                      </Text>
                      <Text className="text-xs text-gray-500 ml-2">
                        {file.type || 'unknown'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}


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
                  renderItem={({ item, index} ) => {
                      // const isTypingBubble = item.from === 'bot' && item.text === '';
                      return (
                        <View className={`rounded-xl px-4 py-2 mb-2 max-w-[84%] min-h-[40px] min-w-[60px] justify-center ${item.from === 'user' ? 'bg-[#F29389] self-end' : 'bg-gray-100 self-start'}`}>
                          {typingIndex === index && item.from === 'bot' ? (
                            <View key={chatId} className="flex-row items-center pb-2 pl-1">
                              <Text className="text-gray-700">{typingPrefix}</Text>
                              <TypingAnimation
                                dotColor="#999"
                                dotMargin={6}
                                dotAmplitude={3}
                                dotSpeed={0.15}
                                dotRadius={4}
                                dotX={6}
                                dotY={0}
                              />
                            </View>
                          ) : (
                            <Markdown>{item.text}</Markdown>
                          )}
                        </View>
                      );
                    }}

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
                disabled={isLoading}
                className="mt-4 rounded-full py-3 px-6 w-fit mx-auto bg-[#5E1526]"
                onPress={handleAddProject}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-center text-white font-semibold">+ Add</Text>
                )}
              </TouchableOpacity>

            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
