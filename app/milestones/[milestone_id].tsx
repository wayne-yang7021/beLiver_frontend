import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Checkbox } from 'expo-checkbox';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Circle } from 'react-native-progress';
import { SafeAreaView } from 'react-native-safe-area-context';

const dummyMilestone = {
  milestone_id: 'ms001',
  milestone_name: 'Milestone #2',
  milestone_summary:
    'Students will work in teams of 5–7 to develop an information system from scratch, applying system analysis and design concepts learned in class. The project emphasizes real-world problem solving, teamwork, requirements gathering, and system implementation.',
  deadline: 'April 21',
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
  const { milestone_id } = useLocalSearchParams();

  const [tasks, setTasks] = useState(dummyMilestone.tasks);
  const [isEditingMilestone, setIsEditingMilestone] = useState(false);
  const [isEditingTasks, setIsEditingTasks] = useState(false);

  const [summary, setSummary] = useState(dummyMilestone.milestone_summary);
  const [startTime, setStartTime] = useState(new Date(dummyMilestone.milestone_start_time));
  const [endTime, setEndTime] = useState(new Date(dummyMilestone.milestone_end_time));
  const [deadline, setDeadline] = useState(new Date(dummyMilestone.milestone_end_time));
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  const [showTaskDatePickerIndex, setShowTaskDatePickerIndex] = useState(-1);


  const toggleTask = (index: number) => {
    const updated = [...tasks];
    updated[index].isCompleted = !updated[index].isCompleted;
    setTasks(updated);
};

  const saveMilestoneEdits = () => {
    if (!summary.trim() || !startTime || !endTime || !deadline) {
      alert('Please complete all fields before saving.');
      return;
    }

    setShowDeadlinePicker(false);
    setIsEditingMilestone(false);
  };

  return (
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

        <Text className="text-2xl font-bold text-center mb-4">{dummyMilestone.milestone_name}</Text>

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

              {/* <Text className="text-sm font-semibold text-gray-700 mt-2">Start Time</Text>
              <DateTimePicker value={startTime} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, date) => date && setStartTime(date)} />

              <Text className="text-sm font-semibold text-gray-700 mt-2">End Time</Text>
              <DateTimePicker value={endTime} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, date) => date && setEndTime(date)} /> */}

              <TouchableOpacity onPress={saveMilestoneEdits} className="bg-[#F8C8C3] py-2 px-4 rounded-lg mt-4 self-end">
                <Text className="text-white font-semibold text-center">Save</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-sm text-gray-700">{summary}</Text>
              {/* <Text className="text-sm text-gray-600 mt-2">Start: {startTime.toLocaleString()}</Text>
              <Text className="text-sm text-gray-600">End: {endTime.toLocaleString()}</Text> */}
            </>
          )}
        </View>

        <View className="mb-10">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-lg font-semibold">Tasks</Text>
            <TouchableOpacity
              onPress={() => {
                const hasEmptyFields = tasks.some(task => !task.task_name.trim() || !task.task_ddl_day);
                if (isEditingTasks && hasEmptyFields) {
                  alert('All tasks must have a title and deadline before exiting edit mode.');
                  return;
                }
                setIsEditingTasks(!isEditingTasks);
              }}
              className="px-3 py-1 rounded-full bg-[#F29389]"
            >
              <Text className="text-white text-sm font-semibold">{isEditingTasks ? 'Done' : 'Edit Tasks'}</Text>
            </TouchableOpacity>
          </View>

          {tasks.map((task, index) => (
            <View key={task.task_id} className="flex-row items-center bg-gray-50 p-3 mb-3 rounded-lg">
              {!isEditingTasks ? (
                <>
                  <Checkbox value={task.isCompleted} onValueChange={() => toggleTask(index)} color={task.isCompleted ? '#f8c8c3' : undefined} />
                  <View className="ml-3 flex-1">
                    <Text className="font-medium">{task.task_name}</Text>
                    <Text className="text-sm text-gray-500">{new Date(task.task_ddl_day).toLocaleDateString()}</Text>
                  </View>
                </>
              ) : (
                <View className="flex-1">
                  <View className='flex-row items-center gap-2'>
                    <Text className="text-xs text-gray-600 mb-1">Task title:</Text>
                    <TextInput
                      value={task.task_name}
                      onChangeText={(text) => {
                        const updated = [...tasks];
                        updated[index].task_name = text;
                        setTasks(updated);
                      }}
                      placeholder="Task Title"
                      className="bg-white rounded-lg py-2 px-3 text-sm mb-2"
                    />
                  </View>
                  
                  <View className="mt-2 flex-row items-center">
                    <Text className="text-xs text-gray-600 mb-1">Due date:</Text>
                    <View style={{ 
                      alignItems: 'center',
                      transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] // Scale down to 80%
                    }}>
                        <DateTimePicker
                          value={new Date(task.task_ddl_day)}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'compact' : 'default'}
                          onChange={(event, date) => {
                            if (date) {
                              const updated = [...tasks];
                              updated[index].task_ddl_day = date.toISOString();
                              setTasks(updated);
                            }
                          }}
                        />
                    </View>
                  </View>
                </View>
              )}

              {isEditingTasks && (
                <TouchableOpacity onPress={() => setTasks(tasks.filter((_, i) => i !== index))} className="ml-3 p-1">
                  <Ionicons name="trash-outline" size={20} color="#7f1d1d" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {isEditingTasks && (
            <TouchableOpacity
              onPress={() => {
                const lastTask = tasks[tasks.length - 1];
                if (lastTask && (!lastTask.task_name.trim() || !lastTask.task_ddl_day)) {
                  alert('Please fill in the title and deadline of the previous task before adding a new one.');
                  return;
                }
                setTasks([...tasks, {
                  task_name: '',
                  task_id: `task${Date.now()}`,
                  task_ddl_day: new Date().toISOString(),
                  isCompleted: false,
                }]);
              }}
              className="mt-2 self-end bg-[#F29389] px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-semibold">+ Add Task</Text>
            </TouchableOpacity>
          )}
          
          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}