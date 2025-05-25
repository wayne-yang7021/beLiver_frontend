import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AddProjectModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<
    { text: string; from: 'user' | 'bot' }[]
  >([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: false });

      if (result.canceled || !result.assets?.length) {
        console.log('User cancelled document picker');
        return;
      }

      const file = result.assets[0];

      setFiles(prev => [...prev, file]);
      setChatMessages(prev => [
        ...prev,
        {
          text: `📎 Uploaded file: ${file.name} (${file.mimeType || 'unknown'})`,
          from: 'user',
        },
        { text: 'Thanks, file received!', from: 'bot' },
      ]);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('Document picker error:', error);
    }
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    setChatMessages([
      ...chatMessages,
      { text: input, from: 'user' },
      { text: 'Ok, got it.', from: 'bot' },
    ]);
    setInput('');
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/50">
        <View
          className="bg-white rounded-t-3xl px-6 pt-4 pb-6"
          style={{ height: '80%' }}
        >
          <View className="items-center mb-2">
            <View className="w-10 h-1.5 rounded-full bg-gray-300" />
          </View>
          <TouchableOpacity onPress={onClose} className="absolute right-6 top-4">
            <Text className="text-pink-500 font-bold">Cancel</Text>
          </TouchableOpacity>

          <Text className="text-xl font-bold text-center">Add New Project</Text>

          {/* Project Title */}
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
                  <Text className="text-pink-500">
                    {deadline.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <View className="flex-1 rounded bg-gray-100 px-4 py-2 justify-center">
                  <Text className="text-pink-500">
                    {deadline.toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            </Pressable>
            {showPicker && Platform.OS === 'ios' && (
              <DateTimePicker
                value={deadline}
                onChange={(e, date) => {
                  if (date) setDeadline(date);
                  setShowPicker(false);
                }}
                mode="datetime"
                display="spinner"
                themeVariant="light"
                textColor="#F29389"
              />
            )}
            {showPicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={deadline}
                onChange={(e, date) => {
                  setShowPicker(false);
                  if (date) setDeadline(date);
                }}
                mode="datetime"
                display="default"
              />
            )}
          </View>

          {/* Uploaded Files Preview */}
          {files.length > 0 && (
            <View className="mt-4">
              <Text className="font-semibold mb-1">Uploaded Files:</Text>
              {files.map((file, index) => (
                <View
                  key={index}
                  className="bg-gray-100 p-2 rounded mb-1 flex-row justify-between items-center"
                >
                  <Text className="text-sm text-gray-700">{file.name}</Text>
                  <Text className="text-xs text-gray-500">{file.mimeType}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Upload File Button */}
          <TouchableOpacity
            className="mt-4 p-4 rounded-xl border-2 border-dashed border-[#F29389] bg-[#F8C8C3] bg-opacity-20"
            onPress={pickDocument}
          >
            <Text className="text-center text-[#5E1526] font-semibold">
              + Upload your project requirements file (.docx or .pdf)
            </Text>
          </TouchableOpacity>

          {/* Chat History */}
          <View className="flex-1 mt-4 mb-2">
            <FlatList
              ref={flatListRef}
              data={chatMessages}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={{ paddingBottom: 10 }}
              renderItem={({ item }) => (
                <View
                  className={`rounded-xl px-4 py-2 mb-2 max-w-[75%] ${
                    item.from === 'user'
                      ? 'bg-[#F29389] self-end'
                      : 'bg-gray-100 self-start'
                  }`}
                >
                  <Text>{item.text}</Text>
                </View>
              )}
            />
          </View>

          {/* Chat Input Box */}
          <View className="flex-row items-center bg-gray-200 px-2 py-2 rounded-lg">
            <TextInput
              className="flex-1 p-2"
              placeholder="Write down your request"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity onPress={sendMessage}>
              <Text className="ml-2 text-pink-400 text-lg">➤</Text>
            </TouchableOpacity>
          </View>

          {/* Add Button */}
          <TouchableOpacity
            className="mt-4 bg-[#5E1526] rounded-full py-3"
            onPress={onClose}
          >
            <Text className="text-center text-white font-semibold">+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
