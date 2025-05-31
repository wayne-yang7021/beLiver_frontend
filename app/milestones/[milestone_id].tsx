import { useSession } from '@/context/SessionContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Checkbox } from 'expo-checkbox';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Circle } from 'react-native-progress';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface Task {
  task_name: string;
  task_id: string;
  task_ddl_day: string;
  isCompleted: boolean;
}

interface Milestone {
  milestone_id: string;
  milestone_name: string;
  milestone_summary: string;
  estimated_loading: number;
  milestone_start_time: string;
  milestone_end_time: string;
  tasks: Task[];
}

const dummyMilestone: Milestone = {
  milestone_id: 'ms001',
  milestone_name: 'Milestone #2',
  milestone_summary:
    'Students will work in teams of 5–7 to develop an information system from scratch, applying system analysis and design concepts learned in class. The project emphasizes real-world problem solving, teamwork, requirements gathering, and system implementation.',
  estimated_loading: 0.5,
  milestone_start_time: '2025-05-15T09:00:00',
  milestone_end_time: '2025-05-19T12:00:00',
  tasks: [
    { task_name: 'Discuss about the work', task_id: 'task001', task_ddl_day: '2025-04-12T00:00:00', isCompleted: true },
    { task_name: 'Interview 2 people', task_id: 'task002', task_ddl_day: '2025-04-15T00:00:00', isCompleted: true },
    { task_name: 'Figma', task_id: 'task003', task_ddl_day: '2025-04-15T00:00:00', isCompleted: true },
    { task_name: 'MVP Description', task_id: 'task004', task_ddl_day: '2025-04-17T00:00:00', isCompleted: true },
  ],
};

export default function MilestoneDetailScreen() {
  const router = useRouter();
  const { milestone_id, project_id } = useLocalSearchParams();
  console.log('Milestone ID:', milestone_id);
  console.log('Project ID:', project_id);
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
  const [modalTaskDeadline, setModalTaskDeadline] = useState(new Date());

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

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setModalTaskName(task.task_name);
    setModalTaskDeadline(new Date(task.task_ddl_day));
    setIsAddingTask(false);
    setShowTaskModal(true);
  };

  const openAddTaskModal = () => {
    setEditingTask(null);
    setModalTaskName('');
    setModalTaskDeadline(new Date());
    setIsAddingTask(true);
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setModalTaskName('');
    setModalTaskDeadline(new Date());
    setIsAddingTask(false);
  };

  const saveTaskFromModal = async () => {
    if (!modalTaskName.trim()) {
      alert('Please enter a task name.');
      return;
    }

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
            ddl: modalTaskDeadline.toISOString().slice(0, 10),
          }),
        });
        
        if (!res.ok) throw new Error('Failed to create new task');
        
        const newTask = await res.json();
        setTasks(prev => [...prev, {
          task_name: modalTaskName.trim(),
          task_id: newTask.task_id || `new_${Date.now()}`,
          task_ddl_day: modalTaskDeadline.toISOString().slice(0, 10),
          isCompleted: false,
        }].sort((a, b) => new Date(a.task_ddl_day).getTime() - new Date(b.task_ddl_day).getTime()));
        
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
            changed_ddl: modalTaskDeadline.toISOString().slice(0, 10),
          }),
        });
        
        if (!res.ok) throw new Error('Failed to update task');
        
        setTasks(prev => prev.map(task => 
          task.task_id === editingTask.task_id 
            ? { ...task, task_name: modalTaskName.trim(), task_ddl_day: modalTaskDeadline.toISOString().slice(0, 10) }
            : task
        ).sort((a, b) => new Date(a.task_ddl_day).getTime() - new Date(b.task_ddl_day).getTime()));
        
        alert('Task updated successfully.');
      }
      
      closeTaskModal();
    } catch {
      alert(`Failed to ${isAddingTask ? 'create' : 'update'} task.`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
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
            progress={dummyMilestone.estimated_loading / 10} 
            color="#f8c8c3" 
            thickness={16} 
            unfilledColor="#eee" 
            borderWidth={0} 
            showsText={false} 
          />
          <View className="absolute inset-0 items-center justify-center">
            <Text className="text-gray-600 font-medium">Estimated Loading</Text>
            <Text className="text-4xl font-bold">{dummyMilestone.estimated_loading}</Text>
            <Text className="text-sm text-gray-600">Hours</Text>
          </View>
        </View>

        <Text className="text-2xl font-bold text-center mb-4">{milestone?.milestone_name}</Text>

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
                <Text>{deadline.toDateString()}</Text>
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
            <View key={task.task_id} className="flex-row items-center bg-gray-50 p-3 mb-3 rounded-lg">
              {!isEditingTasks ? (
                <>
                  <Checkbox value={task.isCompleted} onValueChange={() => toggleTask(index)} color={task.isCompleted ? '#f8c8c3' : undefined} />
                  <View className="ml-3 flex-1">
                    <Text className="font-medium">{task.task_name}</Text>
                    <Text className="text-sm text-gray-500">{task.task_ddl_day}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-1">
                    <Text className="font-medium">{task.task_name}</Text>
                    <Text className="text-sm text-gray-500">{task.task_ddl_day}</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
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
        transparent={true}
        animationType="slide"
        onRequestClose={closeTaskModal}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white p-6 rounded-xl mx-4 w-full max-w-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold">
                {isAddingTask ? 'Add New Task' : 'Edit Task'}
              </Text>
              <TouchableOpacity onPress={closeTaskModal}>
                <Ionicons name="close-outline" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm text-gray-600 mb-2">Task Name</Text>
              <TextInput
                value={modalTaskName}
                onChangeText={setModalTaskName}
                placeholder="Enter task name"
                className="bg-gray-100 p-3 rounded-lg"
              />
            </View>

            <View className="mb-6">
              <Text className="text-sm text-gray-600 mb-2">Due Date</Text>
              <View className="bg-gray-100 p-3 rounded-lg">
                <DateTimePicker
                  value={modalTaskDeadline}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'compact' : 'default'}
                  onChange={(event, date) => date && setModalTaskDeadline(date)}
                />
              </View>
            </View>

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
              >
                <Text className="text-center font-semibold text-white">
                  {isAddingTask ? 'Add' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
























// import { useSession } from '@/context/SessionContext';
// import { Ionicons } from '@expo/vector-icons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import { Checkbox } from 'expo-checkbox';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import { useEffect, useState } from 'react';
// import { Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
// import { Circle } from 'react-native-progress';
// import { SafeAreaView } from 'react-native-safe-area-context';

// const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// interface Task {
//   task_name: string;
//   task_id: string;
//   task_ddl_day: string;
//   isCompleted: boolean;
// }

// interface Milestone {
//   milestone_id: string;
//   milestone_name: string;
//   milestone_summary: string;
//   estimated_loading: number;
//   milestone_start_time: string;
//   milestone_end_time: string;
//   tasks: Task[];
// }

// const dummyMilestone: Milestone = {
//   milestone_id: 'ms001',
//   milestone_name: 'Milestone #2',
//   milestone_summary:
//     'Students will work in teams of 5–7 to develop an information system from scratch, applying system analysis and design concepts learned in class. The project emphasizes real-world problem solving, teamwork, requirements gathering, and system implementation.',
//   estimated_loading: 0.5,
//   milestone_start_time: '2025-05-15T09:00:00',
//   milestone_end_time: '2025-05-19T12:00:00',
//   tasks: [
//     { task_name: 'Discuss about the work', task_id: 'task001', task_ddl_day: '2025-04-12T00:00:00', isCompleted: true },
//     { task_name: 'Interview 2 people', task_id: 'task002', task_ddl_day: '2025-04-15T00:00:00', isCompleted: true },
//     { task_name: 'Figma', task_id: 'task003', task_ddl_day: '2025-04-15T00:00:00', isCompleted: true },
//     { task_name: 'MVP Description', task_id: 'task004', task_ddl_day: '2025-04-17T00:00:00', isCompleted: true },
//   ],
// };

// export default function MilestoneDetailScreen() {
//   const router = useRouter();
//   const { milestone_id, project_id } = useLocalSearchParams();
//   console.log('Milestone ID:', milestone_id);
//   console.log('Project ID:', project_id);
//   const { session } = useSession();

//   const [milestone, setMilestone] = useState<Milestone | null>(null);
//   const [isEditingMilestone, setIsEditingMilestone] = useState(false);
//   const [isEditingTasks, setIsEditingTasks] = useState(false);
//   const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

//   // Fetch milestone data
//   useEffect(() => {
//     if (!session) return;
//     const fetchMilestone = async () => {
//       try {
//         const res = await fetch(
//           `${API_URL}/milestone_detail?project_id=${project_id}&milestone_id=${milestone_id}`,
//           {
//             headers: {
//               Authorization: `Bearer ${session.token}`,
//               'Content-Type': 'application/json',
//             },
//           }
//         );
//         if (!res.ok) throw new Error('Failed to fetch milestone');
//         const data: Milestone = await res.json();
//         console.log('Fetched milestone:', data);
//         setMilestone(data);
//       } catch {
//         alert('Failed to load milestone');
//       }
//     };
//     fetchMilestone();
//   }, [milestone_id, project_id, session]);

//   // Local states for editing
//   const [summary, setSummary] = useState('');
//   const [deadline, setDeadline] = useState<Date>(new Date());
//   const [startTime, setStartTime] = useState<Date>(new Date());
//   const [endTime, setEndTime] = useState<Date>(new Date());
//   const [tasks, setTasks] = useState<Task[]>([]);

//   // Sync milestone to local states when loaded
//   useEffect(() => {
//     if (milestone) {
//       setSummary(milestone.milestone_summary);
//       setDeadline(new Date(milestone.milestone_end_time));
//       setStartTime(new Date(milestone.milestone_start_time));
//       setEndTime(new Date(milestone.milestone_end_time));
//       setTasks([...milestone.tasks].sort((a, b) => new Date(a.task_ddl_day).getTime() - new Date(b.task_ddl_day).getTime()));
//       // backend doesn't returns tasks sorted by deadline
//     }
//   }, [milestone]);

//   if (!session) {
//     router.replace('/login');
//     return null;
//   }


//   const toggleTask = async (index: number) => {
//     const updated = tasks.map((task, i) =>
//       i === index ? { ...task, isCompleted: !task.isCompleted } : task
//     );
//     setTasks(updated);

//     try {
//       const task = updated[index];
//       const res = await fetch(
//         `${API_URL}/tasks/${task.task_id}`,
//         {
//           method: 'PATCH',
//           headers: {
//             Authorization: `Bearer ${session.token}`,
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             isCompleted: task.isCompleted,
//           }),
//         }
//       );
//       if (!res.ok) throw new Error('Failed to update task status');
//     } catch {
//       alert('Failed to update task status.');
//       // Optionally revert UI change on error
//       setTasks(prev => {
//         const reverted = [...prev];
//         reverted[index].isCompleted = !reverted[index].isCompleted;
//         return reverted;
//       });
//     }
//   };

//   const saveMilestoneEdits = async () => {
//     if (!summary.trim() || !startTime || !endTime || !deadline) {
//       alert('Please complete all fields before saving.');
//       return;
//     }

//     try {
//       const res = await fetch(
//         `${API_URL}/milestone_detail?project_id=${project_id}&milestone_id=${milestone_id}`,
//         {
//           method: 'PUT',
//           headers: {
//         Authorization: `Bearer ${session.token}`,
//         'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             project_id,
//             milestone_id,
//             changed_milestone_summary: summary,
//             changed_milestone_start_time: startTime.toISOString(),
//             changed_milestone_end_time: deadline.toISOString(),
//           }),
//         }
//       );

//       if (!res.ok) throw new Error('Failed to update milestone');
      
//       setMilestone(prev => prev && ({
//         ...prev,
//         milestone_summary: summary,
//         milestone_start_time: startTime.toISOString(),
//         milestone_end_time: deadline.toISOString(),
//       }));
//       setShowDeadlinePicker(false);
//       setIsEditingMilestone(false);
//     } catch  {
//       alert('Failed to save milestone edits.');
//     }
//   };

//   const handleEditTasks = async () => {
//     if (!isEditingTasks) {
//       setIsEditingTasks(true);
//       return;
//     }

//     // Validate all tasks before exiting edit mode
//     const hasEmptyFields = tasks.some(task => !task.task_name.trim() || !task.task_ddl_day);
//     if (hasEmptyFields) {
//       alert('All tasks must have a title and deadline before exiting edit mode.');
//       return;
//     }
//     setIsEditingTasks(false);
//     // Save all tasks to backend
//     try {
//       // Prepare updates for each task
//       const updates = tasks.map(task => ({
//         task_id: task.task_id,
//         changed_name: task.task_name,
//         changed_ddl: task.task_ddl_day.slice(0, 10), // Ensure format 'YYYY-MM-DD'
//       }));
//       // Call API for each task update
//       for (const update of updates) {
//         if (update.task_id === 'new') {
//           // Create new task
//           const res = await fetch(`${API_URL}/task`, {
//             method: 'POST',
//             headers: {
//               Authorization: `Bearer ${session.token}`,
//               'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//               milestone_id,
//               name: update.changed_name,
//               ddl: update.changed_ddl,
//             }),
//           });
//           if (!res.ok) throw new Error('Failed to create new task');
//         } else {
//           // Update existing task
//           const res = await fetch(`${API_URL}/task`, {
//             method: 'PUT',
//             headers: {
//               Authorization: `Bearer ${session.token}`,
//               'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(update),
//               });
//           if (!res.ok) throw new Error('Failed to update tasks');
//         }
//       }
//       // If all updates succeed, update local state
//       alert('Tasks saved successfully.');
//       setTasks(prev => prev.map(task => ({
//         ...task,
//         task_name: task.task_name.trim(),
//         task_ddl_day: task.task_ddl_day,
//       })));
//     } catch {
//       alert('Failed to save tasks.');
//     }
//   };
   

//   const handleDeleteTask = async (taskId: string) => {
//     try {
//       const res = await fetch(`${API_URL}/task?task_id=${taskId}`, {
//         method: 'DELETE',
//         headers: {
//           Authorization: `Bearer ${session.token}`,
//           'Content-Type': 'application/json',
//         },
//       });
//       if (!res.ok) throw new Error('Failed to delete task');
//       setTasks(prev => prev.filter(task => task.task_id !== taskId));
//     } catch {
//       alert('Failed to delete task.');
//     }
//   };

//   return(
//     <SafeAreaView className="flex-1 bg-white">
//       <View className="flex-row justify-between items-center px-4 pt-12 pb-4">
//         <TouchableOpacity onPress={() => router.back()}>
//           <Ionicons name="arrow-back" size={24} color="black" />
//         </TouchableOpacity>
//         <TouchableOpacity onPress={() => { setIsEditingMilestone(!isEditingMilestone); setShowDeadlinePicker(!showDeadlinePicker); }}>
//           <Ionicons name={isEditingMilestone ? 'close-outline' : 'create-outline'} size={24} color="black" />
//         </TouchableOpacity>
//       </View>

//       <ScrollView className="flex-1 px-4">
//         <View className="items-center mt-2 mb-6 relative">
//           <Circle 
//             size={240} 
//             progress={dummyMilestone.estimated_loading / 10} 
//             color="#f8c8c3" 
//             thickness={16} 
//             unfilledColor="#eee" 
//             borderWidth={0} 
//             showsText={false} 
//           />
//           <View className="absolute inset-0 items-center justify-center">
//             <Text className="text-gray-600 font-medium">Estimated Loading</Text>
//             <Text className="text-4xl font-bold">{dummyMilestone.estimated_loading}</Text>
//             <Text className="text-sm text-gray-600">Hours</Text>
//           </View>
//         </View>

//         <Text className="text-2xl font-bold text-center mb-4">{dummyMilestone.milestone_name}</Text>

//         <View className="bg-gray-100 p-4 rounded-xl mb-6">
//           <View className="flex-col justify-between mb-2 items-start gap-2">
//             <Text className="font-semibold text-gray-700">Milestone Summary</Text>
//             <View className="flex-row items-center">
//               <Text className="text-sm text-gray-500 mr-2">Deadline:</Text> 
//             {showDeadlinePicker ? (
//                 <View style={{ 
//                     alignItems: 'center',
//                     transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] // Scale down to 80%
//                   }}>
//                     <DateTimePicker
//                         value={deadline}
//                         mode="date"
//                         display={Platform.OS === 'ios' ? 'compact' : 'default'}
//                         onChange={(_, date) => date && setDeadline(date)}
//                     />
//                 </View>
//             ) : (
//                 <Text>{deadline.toDateString()}</Text>
//             )}
//             </View>
//           </View>


//           {isEditingMilestone ? (
//             <>
//               <TextInput className="text-sm text-gray-700 bg-white p-2 rounded-lg mt-1 mb-2 border border-transparent" multiline value={summary} onChangeText={setSummary} />

//               {/* <Text className="text-sm font-semibold text-gray-700 mt-2">Start Time</Text>
//               <DateTimePicker value={startTime} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, date) => date && setStartTime(date)} />

//               <Text className="text-sm font-semibold text-gray-700 mt-2">End Time</Text>
//               <DateTimePicker value={endTime} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, date) => date && setEndTime(date)} /> */}

//               <TouchableOpacity onPress={saveMilestoneEdits} className="bg-[#F8C8C3] py-2 px-4 rounded-lg mt-4 self-end">
//                 <Text className="text-white font-semibold text-center">Save</Text>
//               </TouchableOpacity>
//             </>
//           ) : (
//             <>
//               <Text className="text-sm text-gray-700">{summary}</Text>
//               {/* <Text className="text-sm text-gray-600 mt-2">Start: {startTime.toLocaleString()}</Text>
//               <Text className="text-sm text-gray-600">End: {endTime.toLocaleString()}</Text> */}
//             </>
//           )}
//         </View>

//         <View className="mb-10">
//           <View className="flex-row justify-between items-center mb-2">
//             <Text className="text-lg font-semibold">Tasks</Text>
//             <TouchableOpacity
//               onPress={handleEditTasks}
//               className="px-3 py-1 rounded-full bg-[#F29389]"
//             >
//               <Text className="text-white text-sm font-semibold">{isEditingTasks ? 'Done' : 'Edit Tasks'}</Text>
//             </TouchableOpacity>
//           </View>

//           {tasks?.map((task, index) => (
//             <View key={task.task_id} className="flex-row items-center bg-gray-50 p-3 mb-3 rounded-lg">
//               {!isEditingTasks ? (
//                 <>
//                   <Checkbox value={task.isCompleted} onValueChange={() => toggleTask(index)} color={task.isCompleted ? '#f8c8c3' : undefined} />
//                   <View className="ml-3 flex-1">
//                     <Text className="font-medium">{task.task_name}</Text>
//                     <Text className="text-sm text-gray-500">{task.task_ddl_day}</Text>
//                   </View>
//                 </>
//               ) : (
//                 <View className="flex-1">
//                   <View className='flex-row items-center gap-2'>
//                     <Text className="text-xs text-gray-600 mb-1">Task title:</Text>
//                     <TextInput
//                       value={task.task_name}
//                       onChangeText={(text) => {
//                         const updated = [...tasks];
//                         updated[index].task_name = text;
//                         setTasks(updated);
//                       }}
//                       placeholder="Task Title"
//                       className="bg-white rounded-lg py-2 px-3 text-sm mb-2"
//                     />
//                   </View>
                  
//                   <View className="mt-2 flex-row items-center">
//                     <Text className="text-xs text-gray-600 mb-1">Due date:</Text>
//                     <View style={{ 
//                       alignItems: 'center',
//                       transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] // Scale down to 80%
//                     }}>
//                         <DateTimePicker
//                           value={new Date(task.task_ddl_day)}
//                           mode="date"
//                           display={Platform.OS === 'ios' ? 'compact' : 'default'}
//                           onChange={(event, date) => {
//                             if (date) {
//                               const updated = [...tasks];
//                               updated[index].task_ddl_day = date.toISOString().slice(0, 10); // Format to 'YYYY-MM-DD'
//                               setTasks(updated);
//                             }
//                           }}
//                         />
//                     </View>
//                   </View>
//                 </View>
//               )}

//               {isEditingTasks && (
//                 <TouchableOpacity onPress={() => handleDeleteTask(task.task_id)} className="ml-3 p-1">
//                   <Ionicons name="trash-outline" size={20} color="#7f1d1d" />
//                 </TouchableOpacity>
//               )}
//             </View>
//           ))}

//           {isEditingTasks && (
//             <TouchableOpacity
//               onPress={() => {
//                 const lastTask = tasks[tasks.length - 1];
//                 if (lastTask && (!lastTask.task_name.trim() || !lastTask.task_ddl_day)) {
//                   alert('Please fill in the title and deadline of the previous task before adding a new one.');
//                   return;
//                 }
//                 setTasks([...tasks, {
//                   task_name: '',
//                   task_id: `new`,
//                   task_ddl_day: new Date().toISOString(), // Default to today
//                   isCompleted: false,
//                 }]);
//               }}
//               className="mt-2 self-end bg-[#F29389] px-4 py-2 rounded-lg"
//             >
//               <Text className="text-white font-semibold">+ Add Task</Text>
//             </TouchableOpacity>
//           )}
          
          
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }