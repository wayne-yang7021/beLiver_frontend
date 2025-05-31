import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddProjectModal from '../components/AddProjectModal';
import { useSession } from '../context/SessionContext';


const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface Project {
  project_id: string;
  project_name: string;
  due_date: string;
  current_milestone: string;
  progress: number;
}

export const options = {
  animation: 'slide_from_bottom',
};

export default function Projects() {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalProjectId, setModalProjectId] = useState("");
  const router = useRouter();
  const [numOfProject, setNumOfProject] = useState(0);
  const { session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const insets = useSafeAreaInsets();

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_URL}/projects`, {
        headers: {
          'Authorization': `Bearer ${session?.token}`,
          'Accept': 'application/json'
        },
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setNumOfProject(data.length)
      console.log('Fetched projects:', data);
      setProjects(data);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load projects');
    }
  };
  

  const handleAddProject = async () => {
    try {
      const res = await fetch(`${API_URL}/assistant/initProjectId`);
      if (!res.ok) throw new Error('Failed to get project ID');
      const { project_id } = await res.json();

      // 開啟 modal 並把 project_id 傳進去
      setModalProjectId(project_id);
      setModalVisible(true);
    } catch (err) {
      console.error('❌ Error getting project ID:', err);
      Alert.alert('Failed to start new project.');
    }
  };



  useEffect(() => {
    fetchProjects();
  }, []);

  const screenWidth = Dimensions.get('window').width;
  const renderProgressBar = (currentTask: string, progress: number) => {
    const showCurrentTask = progress < 1;

    return (
      <View className="mt-6 w-full h-14 relative">
        {/* 背景條 */}
        <View className="absolute top-1/2 h-2 w-full bg-pink-100 rounded-full" style={{ transform: [{ translateY: -4 }] }} />

        {/* 進度條 */}
        <View
          className="absolute top-1/2 h-2 bg-[#772343] rounded-full"
          style={{
            width: `${progress * 100}%`,
            transform: [{ translateY: -4 }],
            zIndex: 1,
          }}
        />

        {/* liver + 氣泡 */}
        <View
          style={{
            position: 'absolute',
            top: '50%',
            left: `${progress * 100}%`,
            transform: [{ translateX: -12 }, { translateY: -12 }],
            zIndex: 2,
            alignItems: 'center',
          }}
        >
          {/* liver */}
          <Image
            source={require('../assets/images/liver.png')}
            style={{
              width: 24,
              height: 24,
              resizeMode: 'contain',
            }}
          />

          {/* 氣泡 */}
          {showCurrentTask && (
            <View
              style={{
                position: 'absolute',
                bottom: 30,
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: '#FBD6E3',
                borderRadius: 100,
                maxWidth: screenWidth * 0.7,
                minWidth: screenWidth * 0.2,
              }}
            >
              <Text
                style={{
                  color: '#5E1526',
                  fontSize: 12,
                  fontWeight: '600',
                  textAlign: 'center',
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {currentTask}
              </Text>
              {/* 尖尖 */}
              <View
                style={{
                  position: 'absolute',
                  bottom: -6,
                  left: '50%',
                  marginLeft: -5,
                  width: 0,
                  height: 0,
                  borderLeftWidth: 5,
                  borderRightWidth: 5,
                  borderTopWidth: 6,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: '#FBD6E3',
                }}
              />
            </View>
          )}

          {/* 完成狀態 */}
          {!showCurrentTask && (
            <Text style={{ position: 'absolute', bottom: 30, fontSize: 12, color: '#666', marginTop: 4 }}> Done</Text>
          )}
        </View>
      </View>
    );
  };



  return (
    <View style={{ flex: 1, backgroundColor: '#F8C8C3', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="px-6 pt-6 flex-row items-center">
        <TouchableOpacity onPress={() => router.push("/home")} className="flex-row items-center bg-[#F29389] py-2 px-5 rounded-full">
          <Text className="text-white mr-1 text-lg">‹</Text>
          <Text className="text-white font-semibold">Home</Text>
        </TouchableOpacity>
      </View>

      <View className="px-6 mt-6 flex-row gap-12 justify-between items-center m-2">
        <View className='w-[50%]'>
          <Text className="text-3xl font-semibold text-red-900">My Projects</Text>
          <Text className="text-l font-semibold text-red-900">You have {numOfProject} projects due this week!</Text>
        </View>
        <Image source={require('../assets/images/liver.png')} className="w-32 h-28" style={{ resizeMode: 'contain' }} />
      </View>

      <View style={{ flex: 1 }} className="px-6 mt-6">
        <FlatList
          data={projects}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`./projects/${item.project_id}`)}
              className="bg-white rounded-2xl px-4 pt-4 mb-4"
              activeOpacity={0.8}
            >
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-bold text-gray-800">{item.project_name}</Text>
                <Text className="text-gray-600">{item.due_date}</Text>
              </View>
              {renderProgressBar(item.current_milestone, item.progress)}
            </TouchableOpacity>
          )}
          keyExtractor={item => item.project_id}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>

      <TouchableOpacity onPress={() => handleAddProject()} className="absolute bottom-6 right-6 w-14 h-14 bg-red-900 rounded-full items-center justify-center">
        <Text className="text-white text-2xl">+</Text>
      </TouchableOpacity>

      <AddProjectModal projectId={modalProjectId} visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
}