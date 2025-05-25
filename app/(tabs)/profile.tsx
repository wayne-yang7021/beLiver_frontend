import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

// Dummy project data
const project = {
  project_name: 'SAD Final Project',
  project_summary:
    'System Analysis and Design final project presentation for a real-world information system.',
  project_start_time: '2025-05-15T09:00:00',
  project_end_time: '2025-05-30T18:00:00',
  estimated_loading: 12, // in hours
  milestones: [
    {
      milestone_id: 'ms001',
      milestone_name: 'Research Phase',
      ddl: '2025-05-20T18:00:00',
      progress: 1.0,
    },
    {
      milestone_id: 'ms002',
      milestone_name: 'Design Phase',
      ddl: '2025-05-24T18:00:00',
      progress: 0.6,
    },
    {
      milestone_id: 'ms003',
      milestone_name: 'Implementation Phase',
      ddl: '2025-05-27T18:00:00',
      progress: 0.0,
    },
    {
      milestone_id: 'ms004',
      milestone_name: 'Final Report Submission',
      ddl: '2025-05-30T18:00:00',
      progress: 0.0,
    },
  ],
};

export default function ProjectManagementScreen() {
  const done = project.milestones.filter((m) => m.progress === 1.0);
  const inProgress = project.milestones.filter((m) => m.progress > 0 && m.progress < 1);
  const todo = project.milestones.filter((m) => m.progress === 0);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 flex-row items-center">
          <TouchableOpacity className="pr-4">
            {/* <ChevronLeft size={24} color="black" /> */}
          </TouchableOpacity>
          <Text className="text-lg font-medium">Back</Text>
        </View>

        {/* Loading Circle */}
        <View className="items-center justify-center mt-4">
          <View className="w-64 h-64 rounded-full border-16 border-gray-100 relative">
            <View className="absolute top-0 right-0 w-64 h-64 rounded-full border-16 border-transparent border-t-pink-300 border-r-pink-300 rotate-45" />
            <View className="absolute inset-0 items-center justify-center">
              <Text className="text-center text-lg font-medium">Estimated Loading</Text>
              <Text className="text-center text-6xl font-bold mt-2">{project.estimated_loading}</Text>
              <Text className="text-center text-xl">Hours</Text>
            </View>
          </View>
        </View>

        {/* Project Title */}
        <Text className="text-2xl font-bold text-center mt-6">{project.project_name}</Text>

        {/* Project Summary */}
        <View className="mx-4 mt-6 bg-gray-100 p-4 rounded-lg">
          <View className="flex-row justify-between items-start">
            <Text className="font-medium text-base">Project Summary</Text>
            <Text className="text-sm">Deadline: May 30</Text>
          </View>
          <Text className="text-sm text-gray-600 mt-2">{project.project_summary}</Text>
        </View>

        {/* In Progress Section */}
        {inProgress.length > 0 && (
          <View className="mt-6 mx-4">
            <Text className="font-medium text-lg">In Progress</Text>
            {inProgress.map((m) => (
              <View key={m.milestone_id} className="mt-2 border border-gray-200 rounded-lg p-4">
                <View className="flex-row justify-between items-center">
                  <Text className="font-medium">{m.milestone_name}</Text>
                  <Text className="text-sm">ddl: {new Date(m.ddl).toDateString()}</Text>
                </View>
                <View className="h-3 bg-gray-200 rounded-full mt-4 overflow-hidden">
                  <View
                    className="h-3 bg-[#F8C8C3] rounded-full"
                    style={{ width: `${m.progress * 100}%` }}
                  />
                </View>
                <Text className="text-right text-xs mt-1">
                  {Math.round((1 - m.progress) * project.estimated_loading)} hours left
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Todo Section */}
        {todo.length > 0 && (
          <View className="mt-6 mx-4">
            <Text className="font-medium text-lg">Todo</Text>
            {todo.map((m) => (
              <View key={m.milestone_id} className="mt-2 border border-gray-200 rounded-lg p-4">
                <View className="flex-row justify-between items-center">
                  <Text className="font-medium">{m.milestone_name}</Text>
                  <Text className="text-sm">ddl: {new Date(m.ddl).toDateString()}</Text>
                </View>
                <View className="h-3 bg-gray-200 rounded-full mt-4 overflow-hidden">
                  <View className="h-3 bg-gray-300 rounded-full w-0" />
                </View>
                <Text className="text-right text-xs mt-1">
                  {project.estimated_loading} hours left
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Done Section */}
        {done.length > 0 && (
          <View className="mt-6 mx-4 mb-8">
            <Text className="font-medium text-lg">Done</Text>
            {done.map((m) => (
              <View key={m.milestone_id} className="mt-2 border border-gray-200 rounded-lg p-4">
                <View className="flex-row justify-between items-center">
                  <Text className="font-medium">{m.milestone_name}</Text>
                  <Text className="text-sm">ddl: {new Date(m.ddl).toDateString()}</Text>
                </View>
                <View className="h-3 bg-gray-200 rounded-full mt-4 overflow-hidden">
                  <View className="h-3 bg-[#F8C8C3] rounded-full w-full" />
                </View>
                <Text className="text-right text-xs mt-1">0 hours left</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
