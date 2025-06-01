import { useSession } from '@/context/SessionContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Checkbox } from 'expo-checkbox';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Circle } from 'react-native-progress';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface Task {
  task_name: string;
  task_id: string;
  task_ddl_day: string;
  description?: string;
  estimated_loading?: number;
  isCompleted: boolean;
}

interface Milestone {
  milestone_id: string;
  milestone_name: string;
  milestone_summary: string;
  milestone_estimated_loading: number;
  milestone_start_time: string;
  milestone_end_time: string;
  tasks: Task[];
}

// Loading Animation Component
const LoadingAnimation = ({ visible }: { visible: boolean }) => {
  const [animValue] = useState(new Animated.Value(0));
  const [pulseValue] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      // Rotation animation
      const rotateAnimation = Animated.loop(
        Animated.timing(animValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );

      // Pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      rotateAnimation.start();
      pulseAnimation.start();

      return () => {
        rotateAnimation.stop();
        pulseAnimation.stop();
      };
    }
  }, [visible, animValue, pulseValue]);

  if (!visible) return null;

  const rotation = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
        <View className="bg-white p-8 rounded-xl items-center shadow-lg">
          <Animated.View
            style={{
              transform: [
                { rotate: rotation },
                { scale: pulseValue }
              ]
            }}
            className="mb-4"
          >
            <Ionicons name="refresh" size={48} color="#F29389" />
          </Animated.View>
          
          <Text className="text-lg font-semibold text-gray-800 mb-2">
            Updating Your Milestone Planning
          </Text>
          
          <Text className="text-sm text-gray-600 text-center">
            Please wait while we save your changes...
          </Text>
          
          {/* Progress dots */}
          <View className="flex-row mt-4 space-x-1">
            {[0, 1, 2].map((index) => (
              <Animated.View
                key={index}
                style={{
                  opacity: animValue.interpolate({
                    inputRange: [0, 0.33, 0.66, 1],
                    outputRange: index === 0 ? [1, 0.3, 0.3, 1] : 
                               index === 1 ? [0.3, 1, 0.3, 0.3] : 
                               [0.3, 0.3, 1, 0.3],
                  }),
                }}
                className="w-2 h-2 bg-[#F29389] rounded-full"
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function MilestoneDetailScreen() {
  const router = useRouter();
  const { milestone_id, project_id } = useLocalSearchParams();
  const { session } = useSession();

  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [isEditingMilestone, setIsEditingMilestone] = useState(false);
  const [isEditingTasks, setIsEditingTasks] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  
  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [modalTaskName, setModalTaskName] = useState('');
  const [modalTaskDescription, setModalTaskDescription] = useState('');
  const [modalTaskEstimatedLoading, setModalTaskEstimatedLoading] = useState('');
  const [modalTaskDeadline, setModalTaskDeadline] = useState(new Date());
  
  // Loading state
  const [isTaskLoading, setIsTaskLoading] = useState(false);
  
  // Expandable task states
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Fetch milestone data
  useEffect(() => {
    if (!session) return;
    const fetchMilestone = async () => {
      try {
        const res = await fetch(
          `${API_URL}/milestone_detail?project_id=${project_id}&milestone_id=${milestone_id}`,
          {
            headers: {
              Authorization: `Bearer ${session.token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (!res.ok) throw new Error('Failed to fetch milestone');
        const data: Milestone = await res.json();
        console.log('Fetched milestone:', data);
        setMilestone(data);
      } catch {
        alert('Failed to load milestone');
      }
    };
    fetchMilestone();
  }, [milestone_id, project_id, session]);

  // Local states for editing
  const [summary, setSummary] = useState('');
  const [deadline, setDeadline] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);

  // Sync milestone to local states when loaded
  useEffect(() => {
    if (milestone) {
      setSummary(milestone.milestone_summary);
      setDeadline(new Date(milestone.milestone_end_time));
      setStartTime(new Date(milestone.milestone_start_time));
      setEndTime(new Date(milestone.milestone_end_time));
      setTasks([...milestone.tasks].sort((a, b) => new Date(a.task_ddl_day).getTime() - new Date(b.task_ddl_day).getTime()));
      // backend doesn't returns tasks sorted by deadline
    }
  }, [milestone]);

  if (!session) {
    router.replace('/login');
    return null;
  }

  const toggleTask = async (index: number) => {
    const updated = tasks.map((task, i) =>
      i === index ? { ...task, isCompleted: !task.isCompleted } : task
    );
    setTasks(updated);

    try {
      const task = updated[index];
      const res = await fetch(
        `${API_URL}/tasks/${task.task_id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isCompleted: task.isCompleted,
          }),
        }
      );
      if (!res.ok) throw new Error('Failed to update task status');
    } catch {
      alert('Failed to update task status.');
      // Optionally revert UI change on error
      setTasks(prev => {
        const reverted = [...prev];
        reverted[index].isCompleted = !reverted[index].isCompleted;
        return reverted;
      });
    }
  };

  const saveMilestoneEdits = async () => {
    if (!summary.trim() || !startTime || !endTime || !deadline) {
      alert('Please complete all fields before saving.');
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/milestone_detail?project_id=${project_id}&milestone_id=${milestone_id}`,
        {
          method: 'PUT',
          headers: {
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id,
            milestone_id,
            changed_milestone_summary: summary,
            changed_milestone_start_time: startTime.toISOString(),
            changed_milestone_end_time: deadline.toISOString(),
          }),
        }
      );

      if (!res.ok) throw new Error('Failed to update milestone');
      
      setMilestone(prev => prev && ({
        ...prev,
        milestone_summary: summary,
        milestone_start_time: startTime.toISOString(),
        milestone_end_time: deadline.toISOString(),
      }));
      setShowDeadlinePicker(false);
      setIsEditingMilestone(false);
    } catch  {
      alert('Failed to save milestone edits.');
    }
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setModalTaskName(task.task_name);
    setModalTaskDescription(task.description || '');
    setModalTaskEstimatedLoading(task.estimated_loading?.toString() || '');
    setModalTaskDeadline(new Date(task.task_ddl_day));
    setIsAddingTask(false);
    setShowTaskModal(true);
  };

  const openAddTaskModal = () => {
    setEditingTask(null);
    setModalTaskName('');
    setModalTaskDescription('');
    setModalTaskEstimatedLoading('');
    setModalTaskDeadline(new Date());
    setIsAddingTask(true);
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setModalTaskName('');
    setModalTaskDescription('');
    setModalTaskEstimatedLoading('');
    setModalTaskDeadline(new Date());
    setIsAddingTask(false);
  };

  const saveTaskFromModal = async () => {
    if (!modalTaskName.trim()) {
      alert('Please enter a task name.');
      return;
    }

    const estimatedHours = modalTaskEstimatedLoading ? parseFloat(modalTaskEstimatedLoading) : 0;
    if (modalTaskEstimatedLoading && (isNaN(estimatedHours) || estimatedHours < 0)) {
      alert('Please enter a valid estimated loading (hours).');
      return;
    }

    setIsTaskLoading(true); // Start loading animation

    try {
      if (isAddingTask) {
        // Create new task
        const res = await fetch(`${API_URL}/task`, {
          method: 'POST',
          headers: {
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json',
          },
          body: JSON.stringify({
        milestone_id,
        name: modalTaskName.trim(),
        description: modalTaskDescription.trim(),
        estimated_loading: estimatedHours,
        ddl: modalTaskDeadline.toISOString().slice(0, 10),
          }),
        });
        
        if (!res.ok) throw new Error('Failed to create new task');
        
        // Refetch milestone to get updated tasks
        const milestoneRes = await fetch(
          `${API_URL}/milestone_detail?project_id=${project_id}&milestone_id=${milestone_id}`,
          {
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
          }
        );
        if (!milestoneRes.ok) throw new Error('Failed to fetch milestone after adding task');
        const updatedMilestone: Milestone = await milestoneRes.json();
        setTasks([...updatedMilestone.tasks].sort((a, b) => new Date(a.task_ddl_day).getTime() - new Date(b.task_ddl_day).getTime()));
        setMilestone(updatedMilestone);

        alert('Task created successfully.');
      } else if (editingTask) {
        // Update existing task
        const res = await fetch(`${API_URL}/task`, {
          method: 'PUT',
          headers: {
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json',
          },
          body: JSON.stringify({
        task_id: editingTask.task_id,
        changed_name: modalTaskName.trim(),
        changed_description: modalTaskDescription.trim(),
        changed_estimated_loading: estimatedHours,
        changed_ddl: modalTaskDeadline.toISOString().slice(0, 10),
          }),
        });
        
        if (!res.ok) throw new Error('Failed to update task');
        
        setTasks(prev => prev.map(task => 
          task.task_id === editingTask.task_id 
            ? { 
                ...task, 
                task_name: modalTaskName.trim(), 
                task_description: modalTaskDescription.trim(),
                estimated_loading: estimatedHours,
                task_ddl_day: modalTaskDeadline.toISOString().slice(0, 10) 
              }
            : task
        ).sort((a, b) => new Date(a.task_ddl_day).getTime() - new Date(b.task_ddl_day).getTime()));
        
        alert('Task updated successfully.');
      }
      
      closeTaskModal();
    } catch {
      alert(`Failed to ${isAddingTask ? 'create' : 'update'} task.`);
    } finally {
      setIsTaskLoading(false); // Stop loading animation
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setIsTaskLoading(true); // Start loading animation

    try {
      const res = await fetch(`${API_URL}/task?task_id=${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to delete task');
      setTasks(prev => prev.filter(task => task.task_id !== taskId));
      alert('Task deleted successfully.');
    } catch {
      alert('Failed to delete task.');
    } finally {
      setIsTaskLoading(false); // Stop loading animation
    }
  };

  return(
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row justify-between items-center px-4 pt-12 pb-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setIsEditingMilestone(!isEditingMilestone); setShowDeadlinePicker(!showDeadlinePicker); }}>
          <Ionicons name={isEditingMilestone ? 'close-outline' : 'create-outline'} size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="items-center mt-2 mb-6 relative">
          <Circle 
            size={240} 
            progress={
              milestone && milestone.milestone_estimated_loading > 0
          ? tasks.filter(t => t.isCompleted).reduce((sum, t) => sum + (t.estimated_loading || 0), 0) / milestone.milestone_estimated_loading
          : 0
            }
            color="#f8c8c3" 
            thickness={16} 
            unfilledColor="#eee" 
            borderWidth={0} 
            showsText={false} 
          />
          <View className="absolute inset-0 items-center justify-center">
            <Text className="text-gray-600 font-medium">Finished Task Hours</Text>
            <Text className="text-4xl font-bold">
              {tasks.filter(t => t.isCompleted).reduce((sum, t) => sum + (t.estimated_loading || 0), 0)}
            </Text>
            <Text className="text-sm text-gray-600">
              <Text>/ {milestone?.milestone_estimated_loading ?? 0} Hours</Text>
            </Text>
          </View>
        </View>

        <Text className="text-2xl font-bold text-center mb-4">{milestone?.milestone_name || ''}</Text>

        <View className="bg-gray-100 p-4 rounded-xl mb-6">
          <View className="flex-col justify-between mb-2 items-start gap-2">
            <Text className="font-semibold text-gray-700">Milestone Summary</Text>
            <View className="flex-row items-center">
              <Text className="text-sm text-gray-500 mr-2">Deadline:</Text> 
            {showDeadlinePicker ? (
                <View style={{ 
                    alignItems: 'center',
                    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] // Scale down to 80%
                  }}>
                    <DateTimePicker
                        value={deadline}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'compact' : 'default'}
                        onChange={(_, date) => date && setDeadline(date)}
                    />
                </View>
            ) : (
                <Text>{deadline.toISOString().slice(0, 10)}</Text>
            )}
            </View>
          </View>

          {isEditingMilestone ? (
            <>
              <TextInput className="text-sm text-gray-700 bg-white p-2 rounded-lg mt-1 mb-2 border border-transparent" multiline value={summary} onChangeText={setSummary} />

              <TouchableOpacity onPress={saveMilestoneEdits} className="bg-[#F8C8C3] py-2 px-4 rounded-lg mt-4 self-end">
                <Text className="text-white font-semibold text-center">Save</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-sm text-gray-700">{summary}</Text>
            </>
          )}
        </View>

        <View className="mb-10">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-lg font-semibold">Tasks</Text>
            <TouchableOpacity
              onPress={() => setIsEditingTasks(!isEditingTasks)}
              className="px-3 py-1 rounded-full bg-[#F29389]"
            >
              <Text className="text-white text-sm font-semibold">{isEditingTasks ? 'Done' : 'Edit Tasks'}</Text>
            </TouchableOpacity>
          </View>

          {tasks?.map((task, index) => (
            <View key={task.task_id} className="bg-gray-50 p-3 mb-3 rounded-lg">
              <View className="flex-row items-center">
                {!isEditingTasks ? (
                  <>
                    <Checkbox value={task.isCompleted} onValueChange={() => toggleTask(index)} color={task.isCompleted ? '#f8c8c3' : undefined} />
                    <View className="ml-3 flex-1">
                      <Text className="font-medium">{task.task_name}</Text>
                      <Text className="text-sm text-gray-500">{task.task_ddl_day}</Text>
                      <Text className="text-xs text-blue-600">{task.estimated_loading ?? 0} hours</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleTaskExpansion(task.task_id)} className="p-2">
                      <Ionicons 
                        name={expandedTasks.has(task.task_id) ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View className="flex-1">
                      <Text className="font-medium">{task.task_name}</Text>
                      <Text className="text-sm text-gray-500">{task.task_ddl_day}</Text>
                      <Text className="text-xs text-blue-600">{task.estimated_loading ?? 0} hours</Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity onPress={() => toggleTaskExpansion(task.task_id)} className="p-2">
                        <Ionicons 
                          name={expandedTasks.has(task.task_id) ? "chevron-up" : "chevron-down"} 
                          size={20} 
                          color="#666" 
                        />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openEditTaskModal(task)} className="p-2">
                        <Ionicons name="create-outline" size={20} color="#F29389" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteTask(task.task_id)} className="p-2">
                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
              
              {/* Expandable content */}
              {expandedTasks.has(task.task_id) && (
                <View className="mt-3 pt-3 border-t border-gray-200">
                  
                  <View className="mb-2">
                    <Text className="text-xs text-gray-500 mb-1">Estimated Loading</Text>
                    <Text className="text-sm font-medium text-blue-600">{task.estimated_loading} hours</Text>
                  </View>
               
                  {task.description && (
                    <View>
                      <Text className="text-xs text-gray-500 mb-1">Description</Text>
                      <Text className="text-sm text-gray-700">{task.description}</Text>
                    </View>
                  )}
                  {!task.estimated_loading && !task.description && (
                    <Text className="text-sm text-gray-400 italic">No additional details available</Text>
                  )}
                </View>
              )}
            </View>
          ))}

          {isEditingTasks && (
            <TouchableOpacity
              onPress={openAddTaskModal}
              className="mt-2 self-end bg-[#F29389] px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-semibold">+ Add Task</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
 
      
      {/* Task Edit/Add Modal */}
      <Modal
        visible={showTaskModal}
        transparent={false}
        animationType="slide"
        onRequestClose={closeTaskModal}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white p-6 rounded-xl mx-4 w-full max-w-md">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold">
                {isAddingTask ? 'Add New Task' : 'Edit Task'}
              </Text>
              <TouchableOpacity onPress={closeTaskModal}>
                <Ionicons name="close-outline" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-96">
              <View className="mb-4">
                <Text className="text-sm text-gray-600 mb-2">Task Name *</Text>
                <TextInput
                  value={modalTaskName}
                  onChangeText={setModalTaskName}
                  placeholder="Enter task name"
                  className="bg-gray-100 p-3 rounded-lg"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm text-gray-600 mb-2">Description</Text>
                <TextInput
                  value={modalTaskDescription}
                  onChangeText={setModalTaskDescription}
                  placeholder="Enter task description"
                  multiline
                  numberOfLines={3}
                  className="bg-gray-100 p-3 rounded-lg"
                  textAlignVertical="top"
                />
              </View>

              {!isAddingTask && (
                <View className="mb-4">
                  <Text className="text-sm text-gray-600 mb-2">Estimated Loading (Hours)</Text>
                  <TextInput
                    value={modalTaskEstimatedLoading}
                    onChangeText={setModalTaskEstimatedLoading}
                    placeholder="e.g., 2.5"
                    keyboardType="numeric"
                    className="bg-gray-100 p-3 rounded-lg"
                  />
                </View>
              )}

              <View className="mb-6">
                <Text className="text-sm text-gray-600 mb-2">Due Date</Text>
                <View className="bg-gray-100 p-3 rounded-lg">
                  <DateTimePicker
                    value={modalTaskDeadline || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={(event, date) => setModalTaskDeadline(date || new Date())}
                    // minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
                    // maximumDate={deadline}
                  />
                </View>
              </View>
            </ScrollView>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={closeTaskModal}
                className="flex-1 bg-gray-200 py-3 rounded-lg"
              >
                <Text className="text-center font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveTaskFromModal}
                className="flex-1 bg-[#F29389] py-3 rounded-lg"
                disabled={isTaskLoading}
              >
                <Text className="text-center font-semibold text-white">
                  {isAddingTask ? 'Add' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    {isTaskLoading && (
        <View className="absolute inset-0 z-50 justify-center items-center bg-black bg-opacity-40">
          <LoadingAnimation visible={true} />
        </View>
      )}
    </SafeAreaView>
    
  );
}