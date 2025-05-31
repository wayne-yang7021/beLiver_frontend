import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Circle } from 'react-native-progress';
import { useSession } from '../../context/SessionContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

type Milestone = {
  milestone_id: string;
  milestone_name: string;
  ddl: string;
  progress: number;
};

type Project = {
  project_name: string;
  project_summary: string;
  project_start_time: string;
  project_end_time: string;
  estimated_loading: number;
  milestones: Milestone[];
};
const mockProject: Project = {
  project_name: 'SAD Final Project',
  project_summary: 'System Analysis and Design final project presentation for a real-world information system.',
  project_start_time: '2025-05-15T09:00:00',
  project_end_time: '2025-05-30T18:00:00',
  estimated_loading: 12,
  milestones: [
    { milestone_id: 'ms001', milestone_name: 'Milestone #1', ddl: '2025-05-20T18:00:00', progress: 1.0 },
    { milestone_id: 'ms002', milestone_name: 'Milestone #2', ddl: '2025-05-24T18:00:00', progress: 0.6 },
    { milestone_id: 'ms003', milestone_name: 'Milestone #3', ddl: '2025-05-27T18:00:00', progress: 0.0 },
    { milestone_id: 'ms004', milestone_name: 'Milestone #4', ddl: '2025-05-30T18:00:00', progress: 0.0 },
  ],
};

export default function ProjectManagementScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useSession();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [deadline, setDeadline] = useState(new Date());

  useEffect(() => {
    if (project) {
      setName(project.project_name);
      setSummary(project.project_summary);
      setDeadline(new Date(project.project_end_time));
    }
  }, [project]);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  


  useFocusEffect(
    useCallback(() => {
      if (!id) return;

      const fetchProject = async () => {
        try {
          const res = await fetch(`${API_URL}/project_detail?project_id=${id}`, {
            headers: {
              Authorization: `Bearer ${session?.token}`,
            },
          });
          if (!res.ok) {
            const errorText = await res.text();
            console.error('Failed to fetch project:', errorText);
            throw new Error('Failed to fetch project');
          }
          const data = await res.json();
          setProject(data);
        } catch {
          setProject(null);
          Alert.alert('Error', 'Failed to load project.');
        }
      };

      fetchProject();
    }, [id, session])
  );

  const handleSave = async () => {
    if (!name.trim() || !summary.trim()) {
      Alert.alert('Error', 'Fields cannot be empty.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/project_detail`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token}`,
        },
        body: JSON.stringify({
          project_id: id,
          changed_name: name,
          changed_project_summary: summary,
          changed_project_start_time: project?.project_start_time,
          changed_project_end_time: deadline.toISOString(),
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to update project:', errorText);
        Alert.alert('Error', 'Failed to update project.');
        return;
      }

      setProject((prev) => prev && ({
        ...prev,
        project_name: name,
        project_summary: summary,
        project_end_time: deadline.toISOString(),
      }));

      setShowDeadlinePicker(false);
      setIsEditing(false);
      Alert.alert('Success', 'Project updated successfully.');
    } catch (error) {
      console.error('Error updating project:', error);
      Alert.alert('Error', 'Failed to update project.');
    }
  };

  if (!project) return null;

  const done = project.milestones.filter((m) => m.progress === 1.0);
  const inProgress = project.milestones.filter((m) => m.progress > 0 && m.progress < 1);
  const todo = project.milestones.filter((m) => m.progress === 0);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-4">
        {/* Header */}
        <View className="flex-row justify-between items-center pt-12 pb-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          {isEditing && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Delete Project',
                  'Are you sure you want to delete this project?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        setProject(null);
                        router.back();
                      },
                    },
                  ]
                );
              }}
            >
              <Ionicons name="trash-outline" size={24} color="#7f1d1d" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => { setIsEditing(!isEditing); setShowDeadlinePicker(!showDeadlinePicker); }}>
            <Ionicons name={isEditing ? 'close-outline' : 'create-outline'} size={24} color="black" />
          </TouchableOpacity>
        </View>
        
      </View>

        {/* Circle */}
        <View className="items-center mt-2 mb-6 relative">
          <Circle 
            size={240} 
            progress={project.estimated_loading / 100} 
            color="#f8c8c3" 
            thickness={16} 
            unfilledColor="#eee" 
            borderWidth={0} 
            showsText={false} 
          />
          <View className="absolute inset-0 items-center justify-center">
            <Text className="text-gray-600 font-medium">Estimated Loading</Text>
            <Text className="text-4xl font-bold">{project.estimated_loading}</Text>
            <Text className="text-sm text-gray-600">Hours</Text>
          </View>
        </View>

        {!isEditing && <Text className="text-2xl font-bold text-center mb-4">{project.project_name}</Text>}

        {/* Summary and DDL */}
        <View className="bg-gray-100 p-4 rounded-xl mb-6">
          <View className="flex-col justify-between mb-2 items-start gap-2">
            {!isEditing && <Text className="font-semibold text-gray-700">Project Summary</Text>}
            {isEditing && 
            <View className="flex-row items-center mb-2">
              <Text className="text-sm text-gray-500 mr-2">Project Name:</Text> 
              <TextInput
                className="text-sm text-center bg-white border rounded-lg py-2 px-3 border-transparent"
                value={name}
                onChangeText={setName}
                placeholder="Project Name"
              />
            </View>}
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

          {isEditing ? (
            <>
              <View className="flex-col items-start gap-2 mt-4">
                <Text className="text-sm text-gray-500 mr-2">Project summary:</Text> 
                <TextInput className="text-sm text-gray-700 bg-white p-2 rounded-lg border mt-1 mb-2 border-transparent" multiline value={summary} onChangeText={setSummary} />
              </View>
             
             <TouchableOpacity onPress={handleSave} className="bg-[#F29389] py-2 px-4 rounded-lg mt-4 self-end">
                <Text className="text-white font-semibold text-center">Save</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-sm text-gray-600 mt-2">{project.project_summary}</Text>
            </>
          )}
        </View>

        <Text className="font-bold text-lg mt-6">Milestones</Text>
        {inProgress.length > 0 && (
          <View className="mt-2">
            <Text className="font-medium text-lg">In Progress</Text>
            {inProgress.map((m) => (
              <TouchableOpacity
                key={m.milestone_id}
                onPress={() => router.push({ pathname: '/milestones/[milestone_id]', params: { milestone_id: m.milestone_id, project_id: id } })}
                className="mt-2 border border-gray-200 rounded-lg p-4"
              >
                <View className="flex-row justify-between items-center">
                  <Text className="font-medium">{m.milestone_name}</Text>
                  <Text className="text-sm">ddl: {new Date(m.ddl).toDateString()}</Text>
                </View>
                <View className="h-3 bg-gray-200 rounded-full mt-4 overflow-hidden">
                  <View className="h-3 bg-[#F8C8C3] rounded-full" style={{ width: `${m.progress * 100}%` }} />
                </View>
                <Text className="text-right text-xs mt-1">
                  {Math.round((1 - m.progress) * project.estimated_loading)} hours left
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {todo.length > 0 && (
          <View className="mt-6">
            <Text className="font-medium text-lg">Todo</Text>
            {todo.map((m) => (
              <TouchableOpacity
                key={m.milestone_id}
                onPress={() => router.push({ pathname: '/milestones/[milestone_id]', params: { milestone_id: m.milestone_id, project_id: id } })}
                className="mt-2 border border-gray-200 rounded-lg p-4"
              >
                <View className="flex-row justify-between items-center">
                  <Text className="font-medium">{m.milestone_name}</Text>
                  <Text className="text-sm">ddl: {new Date(m.ddl).toDateString()}</Text>
                </View>
                <View className="h-3 bg-gray-200 rounded-full mt-4 overflow-hidden">
                  <View className="h-3 bg-gray-300 rounded-full w-0" />
                </View>
                <Text className="text-right text-xs mt-1">{project.estimated_loading} hours left</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {done.length > 0 && (
          <View className="mt-6 mb-8">
            <Text className="font-medium text-lg">Done</Text>
            {done.map((m) => (
                <TouchableOpacity
                key={m.milestone_id}
                onPress={() =>
                  router.push({
                  pathname: '/milestones/[milestone_id]',
                  params: { milestone_id: m.milestone_id, project_id: id }
                  })
                }
                className="mt-2 border border-gray-200 rounded-lg p-4"
                >
                <View className="flex-row justify-between items-center">
                  <Text className="font-medium">{m.milestone_name}</Text>
                  <Text className="text-sm">ddl: {new Date(m.ddl).toDateString()}</Text>
                </View>
                <View className="h-3 bg-gray-200 rounded-full mt-4 overflow-hidden">
                  <View className="h-3 bg-[#F8C8C3] rounded-full w-full" />
                </View>
                <Text className="text-right text-xs mt-1">0 hours left</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
