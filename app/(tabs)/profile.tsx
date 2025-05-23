// import { ChevronLeft } from 'lucide-react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function ProjectManagementScreen() {
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
            {/* Pink/red progress arc (about 25% complete) */}
            <View className="absolute top-0 right-0 w-64 h-64 rounded-full border-16 border-transparent border-t-pink-300 border-r-pink-300 rotate-45" />
            
            {/* Center text */}
            <View className="absolute inset-0 items-center justify-center">
              <Text className="text-center text-lg font-medium">Estimated Loading</Text>
              <Text className="text-center text-6xl font-bold mt-2">12</Text>
              <Text className="text-center text-xl">Hours</Text>
            </View>
          </View>
        </View>
        
        {/* Project Title */}
        <Text className="text-2xl font-bold text-center mt-6">SAD Final Project</Text>
        
        {/* Project Summary */}
        <View className="mx-4 mt-6 bg-gray-100 p-4 rounded-lg">
          <View className="flex-row justify-between items-start">
            <Text className="font-medium text-base">Project Summary</Text>
            <Text className="text-sm">Deadline: May 21</Text>
          </View>
          <Text className="text-sm text-gray-600 mt-2">
            Students will work in teams of 5-7 to develop an information system from scratch, applying system analysis and design concepts learned in class. The project emphasizes real-world problem solving, teamwork, requirements gathering, and system implementation.
          </Text>
          <Text className="text-sm text-gray-600 mt-2">
            There are four milestones:
          </Text>
          <View className="ml-4 mt-1">
            <Text className="text-sm text-gray-600">• Milestones 1-3: Progress presentations</Text>
            <Text className="text-sm text-gray-600">• Milestone 4: Final submission of documentation and code</Text>
          </View>
          <Text className="text-sm text-gray-600 mt-2">
            The project will be evaluated based on system analysis, design, development, testing, and project management skills.
          </Text>
        </View>
        
        {/* In Progress Section */}
        <View className="mt-6 mx-4">
          <Text className="font-medium text-lg">In Progress</Text>
          <View className="mt-2 border border-gray-200 rounded-lg p-4">
            <View className="flex-row justify-between items-center">
              <Text className="font-medium">Milestone #2</Text>
              <Text className="text-sm">ddl: April 21</Text>
            </View>
            <View className="h-3 bg-gray-200 rounded-full mt-4 overflow-hidden">
              <View className="h-3 bg-pink-300 rounded-full w-5/6" />
            </View>
            <Text className="text-right text-xs mt-1">0.5 hours left</Text>
          </View>
        </View>
        
        {/* Todo Section */}
        <View className="mt-6 mx-4">
          <Text className="font-medium text-lg">Todo</Text>
          <View className="mt-2 border border-gray-200 rounded-lg p-4">
            <View className="flex-row justify-between items-center">
              <Text className="font-medium">Milestone #3</Text>
              <Text className="text-sm">ddl: May 10</Text>
            </View>
            <View className="h-3 bg-gray-200 rounded-full mt-4 overflow-hidden">
              <View className="h-3 bg-gray-300 rounded-full w-0" />
            </View>
            <Text className="text-right text-xs mt-1">5 hours left</Text>
          </View>
          
          <View className="mt-3 border border-gray-200 rounded-lg p-4">
            <View className="flex-row justify-between items-center">
              <Text className="font-medium">Milestone #4</Text>
              <Text className="text-sm">ddl: May 21</Text>
            </View>
            <View className="h-3 bg-gray-200 rounded-full mt-4 overflow-hidden">
              <View className="h-3 bg-gray-300 rounded-full w-0" />
            </View>
            <Text className="text-right text-xs mt-1">6.5 hours left</Text>
          </View>
        </View>
        
        {/* Done Section */}
        <View className="mt-6 mx-4 mb-8">
          <Text className="font-medium text-lg">Done</Text>
          <View className="mt-2 border border-gray-200 rounded-lg p-4">
            <View className="flex-row justify-between items-center">
              <Text className="font-medium">Milestone #1</Text>
              <Text className="text-sm">ddl: April 5</Text>
            </View>
            <View className="h-3 bg-gray-200 rounded-full mt-4 overflow-hidden">
              <View className="h-3 bg-pink-300 rounded-full w-full" />
            </View>
            <Text className="text-right text-xs mt-1">0 hours left</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}