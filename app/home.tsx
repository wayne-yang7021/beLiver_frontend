import { Feather } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../context/SessionContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface Task {
  task_id: string;
  task_title: string;
  description?: string;
  estimated_loading?: number;
  isCompleted: boolean;
  project_id?: string;
  date?: string;
}

const ITEM_WIDTH = 72;
const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);

  const [selectedDateIndex, setSelectedDateIndex] = useState(30);
  const [editVisible, setEditVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEtc, setEditEtc] = useState(0);
  // const [editEtcUnit, setEditEtcUnit] = useState<'mins' | 'hrs'>('mins');
  // const [editEtc, setEditEtc] = useState('0'); // 以小時為單位，例如 '1.5'
  const [editDetails, setEditDetails] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(0);

  const today = new Date();
  const dates = Array.from({ length: 61 }, (_, i) => subDays(today, 30 - i));
  const selectedDate = dates[selectedDateIndex];
  const selectedDateFormatted = format(selectedDate, 'yyyy-MM-dd');

  useEffect(() => {
    const fetchTasks = async () => {
      // console.log(`${API_URL}/tasks?date=${selectedDateFormatted}`);

      try {
        const response = await fetch(`${API_URL}/tasks?date=${selectedDateFormatted}`, {
          headers: {
            // 'accept': 'application/json',
            'Authorization': `Bearer ${session?.token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }
        const data = await response.json();
        // console.log('Fetched tasks:', data);
        const enrichedTasks = data.map((task: Task) => ({ ...task, date: selectedDate.toDateString() }));
        setTasks(enrichedTasks);
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to load tasks');
      }
    };

    fetchTasks();
  }, [selectedDateFormatted]);


  const saveEditedTask = async () => {
    if (!editingTask) return;

    if (!editTitle.trim() || !editEtc) {
      Alert.alert('Error', 'You must fill in the name and the time');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/tasks/${editingTask.task_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token}`,
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDetails,
          estimated_loading: editEtc,
          due_date: selectedDateFormatted,
        }),
      });

      if (!res.ok) throw new Error('Failed to update task');

      const updatedTask = {
        ...editingTask,
        task_title: editTitle,
        estimated_loading: editEtc,
        description: editDetails,
      };

      setTasks(tasks =>
        tasks.map(task =>
          task.task_id === editingTask.task_id ? updatedTask : task
        )
      );

      Alert.alert('Success', 'Task updated successfully!');
    } catch (err) {
      Alert.alert('Error', 'Failed to update task');
      console.error(err);
    } finally {
      setEditVisible(false);
      setEditingTask(null);
    }
  };


  // useEffect(() => {
  //   fetchTasks();
  // }, [selectedDateIndex]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        x: ITEM_WIDTH * 30 - screenWidth / 2 + ITEM_WIDTH / 2,
        animated: true,
      });
    }, 100);
  }, []);

  const toggleTaskDone = async (task: Task) => {
    try {
      const updated = tasks.map(t =>
        t.task_id === task.task_id ? { ...t, isCompleted: !t.isCompleted } : t
      );
      setTasks(updated);

      console.log('Toggling task:', task.task_id, 'to', !task.isCompleted);
      const res = await fetch(`${API_URL}/tasks/${task.task_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token}`,
        },
        body: JSON.stringify({ isCompleted: !task.isCompleted }),
      });

      if (!res.ok) throw new Error('Failed to update task');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.task_title);
    setEditEtc(task.estimated_loading || 0);
    setEditDetails(task.description || '');
    setEditVisible(true);
  };

  const filteredTasks = tasks.filter(task => task.date === selectedDate.toDateString());

  return (
    <SafeAreaView className="flex-1 bg-[#F8C8C3]">
      <View className="flex-row justify-between items-center px-6 pt-6">
        <TouchableOpacity onPress={() => router.push("/calendar")} className="flex-row items-center bg-[#F29389] py-2 px-5 rounded-full">
          <Text className="text-white mr-1 text-lg">‹</Text>
          <Text className="text-white font-semibold"> Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/projects")} className="flex-row items-center bg-[#F29389] py-2 px-5 rounded-full">
          <Text className="text-white font-semibold">Projects</Text>
          <Text className="text-white ml-1 text-lg">›</Text>
        </TouchableOpacity>
      </View>

      <View className="px-6 mt-6 flex-row gap-12 justify-between items-center m-2">
        <View>
          <Text className="text-3xl font-semibold text-[#5E1526]">Good morning,</Text>
          <Text className="text-3xl font-semibold text-[#5E1526]">{session?.name} !</Text>
        </View>
        <Image source={require('../assets/images/liver.png')} className="w-32 h-28" style={{ resizeMode: 'contain' }} />
      </View>

      <View className="flex-row items-center justify-center mt-4 mb-10">
        <Pressable onPress={() => scrollViewRef.current?.scrollTo({ x: Math.max(scrollX.current - ITEM_WIDTH, 0), animated: true })}>
          <Feather name="chevron-left" size={24} color="#F29389" />
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          ref={scrollViewRef}
          onScroll={e => (scrollX.current = e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={16}
        >
          {dates.map((date, index) => (
            <TouchableOpacity key={index} className="mx-2 items-center justify-center" onPress={() => setSelectedDateIndex(index)}>
              <View className={`w-16 h-16 rounded-full flex items-center justify-center ${selectedDateIndex === index ? 'bg-[#F29389]' : 'bg-white'}`}>
                {index === 30 ? (
                  <Text className={`text-center font-bold ${selectedDateIndex === index ? 'text-white' : 'text-[#F29389]'}`}>Today</Text>
                ) : (
                  <>
                    <Text className={`text-center font-bold ${selectedDateIndex === index ? 'text-white' : 'text-[#F29389]'}`}>{date.toLocaleString('default', { month: 'short' })}</Text>
                    <Text className={`text-center font-bold ${selectedDateIndex === index ? 'text-white' : 'text-[#F29389]'}`}>{date.getDate()}</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Pressable onPress={() => scrollViewRef.current?.scrollTo({ x: scrollX.current + ITEM_WIDTH, animated: true })}>
          <Feather name="chevron-right" size={24} color="#F29389" />
        </Pressable>
      </View>
      
      <View className="bg-white rounded-3xl shadow-lg mx-4 mt-6 pb-4 flex-1">
        <View className="flex-row justify-between items-center pr-6 pl-6 mt-4">
          <Text className="text-lg font-semibold text-red-900">
            {selectedDateIndex === 30 ? 'Today\'s Tasks' : `Tasks for ${selectedDate.toLocaleDateString()}`}
          </Text>
          <TouchableOpacity onPress={() => setIsEditMode(!isEditMode)}>
            <Text className={`font-medium ${isEditMode ? 'text-red-500' : 'text-[#F8C8C3]'}`}>{isEditMode ? 'Done' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="px-6 mt-4 mb-6">
          {filteredTasks.length === 0 ? (
            <View className="items-center justify-center py-8">
              <Text className="text-gray-500 text-lg">No tasks for this date</Text>
            </View>
          ) : (
            filteredTasks.map((task) => (
              <View key={task.task_id} className="mb-4 rounded-3xl p-4 bg-[#F8C8C3]">
                <View className="flex-row justify-between items-start">
                  <TouchableOpacity className="flex-1">
                    <Text className="text-red-800 font-bold">{task.task_title}</Text>
                  </TouchableOpacity>
                  {task.estimated_loading && (
                    <View className="ml-4">
                      <Text className="text-red-800 font-semibold">
                        ETC: {task.estimated_loading} hrs
                      </Text>
                    </View>
                  )}
                </View>
                {task.description && (
                  <View className="mt-3 mb-3">
                    <Text className="text-red-700 text-justify leading-5">{task.description}</Text>
                  </View>
                )}
                <View className="flex-row justify-between items-center mt-2">
                  <View className="flex-1" />
                  <View className="flex-row items-center">
                    {isEditMode && (
                        <>
                          <TouchableOpacity className="mr-2 p-2" onPress={() => openEditModal(task)}>
                            <Feather name="edit-2" size={20} color="#991b1b" />
                          </TouchableOpacity>
                          <TouchableOpacity className="mr-4 p-2" onPress={() => Alert.alert('Not implemented in API')}>
                            <Feather name="trash-2" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </>
                      )}
                    <TouchableOpacity onPress={() => toggleTaskDone(task)}>
                      <View className={`w-6 h-6 rounded-full justify-center items-center ${
                        task.isCompleted ? 'bg-red-500' : 'bg-white border border-red-300'
                      }`}>
                        {task.isCompleted && <Text className="text-white text-xs">✓</Text>}
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Edit Task Modal */}
        <Modal 
          animationType="slide" 
          transparent={true} 
          visible={editVisible} 
          onRequestClose={() => setEditVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white w-4/5 max-h-4/5 rounded-2xl">
              {/* Modal Header */}
              <View className="bg-[#F8C8C3] rounded-t-2xl px-6 py-4 flex-row justify-between items-center">
                <Text className="text-xl font-bold text-red-900">Edit Task</Text>
                <TouchableOpacity onPress={() => setEditVisible(false)}>
                  <Feather name="x" size={24} color="#7f1d1d" />
                </TouchableOpacity>
              </View>
              
              <ScrollView className="px-6 py-4">
                {/* Title Input */}
                <View className="mb-4">
                  <Text className="text-red-900 font-semibold mb-2 text-base">Task Title</Text>
                  <TextInput 
                    className="bg-pink-50 p-3 rounded-xl border border-pink-200 text-base" 
                    value={editTitle} 
                    onChangeText={setEditTitle}
                    placeholder="Enter task title"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                
                {/* Estimated Time Input */}
                <View className="mb-4">
                  <Text className="text-red-900 font-semibold mb-2 text-base">Estimated Time (hours)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                  {[0.5, 1, 1.5, 2, 3, 4].map((val) => (
                    <TouchableOpacity
                    key={val}
                    onPress={() => setEditEtc(val)}
                    className={`px-4 py-2 rounded-xl border ${
                      editEtc === val ? 'bg-[#F29389] border-[#F29389]' : 'bg-white border-gray-300'
                    } mr-2`}
                    >
                    <Text className={`font-semibold ${editEtc === val ? 'text-white' : 'text-gray-700'}`}>
                      {val}
                    </Text>
                    </TouchableOpacity>
                  ))}
                  </ScrollView>
                </View>

                {/* Details Input */}
                <View className="mb-6">
                  <Text className="text-red-900 font-semibold mb-2 text-base">Task Details</Text>
                  <TextInput 
                    className="bg-pink-50 p-3 rounded-xl border border-pink-200 h-32 text-base" 
                    value={editDetails} 
                    onChangeText={setEditDetails} 
                    multiline 
                    textAlignVertical="top"
                    placeholder="Enter detailed description of the task..."
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </ScrollView>
              
              {/* Modal Footer */}
              <View className="flex-row justify-end px-6 py-4 border-t border-pink-100">
                <TouchableOpacity 
                  className="bg-gray-300 rounded-xl py-3 px-6 mr-3" 
                  onPress={() => setEditVisible(false)}
                >
                  <Text className="text-gray-700 font-medium">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="bg-[#F29389] rounded-xl py-3 px-6" 
                  onPress={saveEditedTask}
                >
                  <Text className="text-white font-medium">Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}