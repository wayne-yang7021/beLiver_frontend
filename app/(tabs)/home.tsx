import { Feather } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { subDays } from 'date-fns';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Define navigation types
type RootStackParamList = {
  Home: undefined;
  Projects: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Task {
  id: string;
  title: string;
  details?: string;
  etc?: string;
  done: boolean;
}

export default function HomeScreen() {
  // const navigation = useNavigation<HomeScreenNavigationProp>();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([{
    id: '1',
    title: 'Discuss about the work',
    details: 'Design and compile the presentation for the upcoming internal project review. The slides should cover key project objectives, timeline, resource allocation, and expected outcomes.',
    etc: '1.5 hrs',
    done: false,
  }, { id: '2', title: 'SAD Interview 2 people', done: false }, { id: '3', title: 'SAD Figma', done: false }, { id: '4', title: 'SAD Slide', done: true }, { id: '5', title: 'SAD Report', done: true }]);

  const [selectedDateIndex, setSelectedDateIndex] = useState(30);
  const [editVisible, setEditVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEtc, setEditEtc] = useState('');
  const [editDetails, setEditDetails] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);

  const toggleTaskDone = (id: string) => {
    const updated = tasks.map(task => task.id === id ? { ...task, done: !task.done } : task);
    updated.sort((a, b) => Number(a.done) - Number(b.done));
    setTasks(updated);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditEtc(task.etc || '');
    setEditDetails(task.details || '');
    setEditVisible(true);
  };

  const saveEditedTask = () => {
    if (editingTask) {
      const updated = tasks.map(task => task.id === editingTask.id ? { ...task, title: editTitle, etc: editEtc, details: editDetails } : task);
      setTasks(updated);
    }
    setEditVisible(false);
  };

  const today = new Date();
  const dates = Array.from({ length: 61 }, (_, i) => subDays(today, 30 - i));

  return (
    <View className="flex-1 bg-[#F8C8C3] pt-12">
      <View className="flex-row justify-between items-center px-6 pt-6">
        <TouchableOpacity className="bg-[#F29389] rounded-full py-2 px-6">
          <Text className="text-white font-medium">Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-[#F29389] rounded-full py-2 px-6" onPress={() => router.push('/projects')}>
          <Text className="text-white font-medium">Project</Text>
        </TouchableOpacity>
      </View>

      <View className="px-6 mt-6 flex-row gap-12 items-center m-2">
        <View>
          <Text className="text-3xl font-semibold text-red-900">Good morning,</Text>
          <Text className="text-3xl font-semibold text-red-900">Sandy Liu !</Text>
        </View>
        <Image source={require('../../assets/images/liver.png')} className="w-32 h-28" style={{ resizeMode: 'contain' }} />
      </View>

      <View className="flex-row items-center justify-center mt-4">
        <Pressable onPress={() => scrollViewRef.current?.scrollTo({ x: -200, animated: true })}>
          <Feather name="chevron-left" size={24} color="#F29389" />
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }} ref={scrollViewRef}>
          {dates.map((date, index) => (
            <TouchableOpacity key={index} className="mx-2 items-center justify-center" onPress={() => setSelectedDateIndex(index)}>
              <View className={`w-16 h-16 rounded-full flex items-center justify-center ${selectedDateIndex === index ? 'bg-[#F29389]' : 'bg-white'}`}>
                {index === 30 ? (
                  <Text className={`text-center font-bold ${selectedDateIndex === index ? 'text-white' : 'text-[#F29389]'}`}>
                    Today
                  </Text>
                ) : (
                  <>
                    <Text className={`text-center font-bold ${selectedDateIndex === index ? 'text-white' : 'text-[#F29389]'}`}>
                      {date.toLocaleString('default', { month: 'short' })}
                    </Text>
                    <Text className={`text-center font-bold ${selectedDateIndex === index ? 'text-white' : 'text-[#F29389]'}`}>
                      {date.getDate()}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Pressable onPress={() => scrollViewRef.current?.scrollTo({ x: 200, animated: true })}>
          <Feather name="chevron-right" size={24} color="#F29389" />
        </Pressable>
      </View>
      
      <View className="bg-white rounded-t-3xl shadow-md mx-4 mt-6 pb-4">
        <View className="flex-row justify-end pr-6 mt-2">
          <TouchableOpacity>
            <Text className="text-[#F8C8C3] font-medium">Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="px-6 mt-2 mb-6">
          {tasks.map((task) => (
            <View key={task.id} className={`mb-4 rounded-3xl p-4 ${task.id === '1' ? 'bg-[#F8C8C3]' : 'bg-[#F8C8C3]'}`}>
              <View className="flex-row justify-between">
                <TouchableOpacity onPress={() => openEditModal(task)}>
                  <Text className="text-red-800 font-bold">{task.title}</Text>
                </TouchableOpacity>
                {task.etc && <Text className="text-red-800">ETC: {task.etc}</Text>}
              </View>
              {task.details && <Text className="text-red-700 mt-2 text-justify">{task.details}</Text>}
              <TouchableOpacity className="absolute right-4 bottom-4" onPress={() => toggleTaskDone(task.id)}>
                <View className={`w-6 h-6 rounded-full justify-center items-center ${task.done ? 'bg-red-500' : 'bg-white border border-red-300'}`}>{task.done && (<Text className="text-white text-xs">✓</Text>)}</View>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <Modal animationType="slide" transparent={true} visible={editVisible} onRequestClose={() => setEditVisible(false)}>
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white w-4/5 p-6 rounded-2xl">
              <Text className="text-xl font-bold text-red-900 mb-4">Edit Task</Text>
              <Text className="text-red-900 font-medium mb-1">Title</Text>
              <TextInput className="bg-pink-50 p-2 rounded-lg mb-3" value={editTitle} onChangeText={setEditTitle} />
              <Text className="text-red-900 font-medium mb-1">Estimated Time</Text>
              <TextInput className="bg-pink-50 p-2 rounded-lg mb-3" value={editEtc} onChangeText={setEditEtc} placeholder="e.g. 1.5 hrs" />
              <Text className="text-red-900 font-medium mb-1">Details</Text>
              <TextInput className="bg-pink-50 p-2 rounded-lg mb-5 h-24 text-justify" value={editDetails} onChangeText={setEditDetails} multiline />
              <View className="flex-row justify-end">
                <TouchableOpacity className="bg-gray-300 rounded-full py-2 px-4 mr-2" onPress={() => setEditVisible(false)}>
                  <Text className="text-white">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-pink-300 rounded-full py-2 px-4" onPress={saveEditedTask}>
                  <Text className="text-white">Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}