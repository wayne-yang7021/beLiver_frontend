import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddProjectModal from '../components/AddProjectModal';

// Define navigation types
// type RootStackParamList = {
//   Home: undefined;
//   Projects: undefined;
// };

interface Project {
  id: string;
  title: string;
  dueDate: string;
  currentTask: string;
  progress: number;
}
export const options = {
  animation: 'slide_from_bottom', // 或 slide_from_right、fade...
};

// type ProjectsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Projects'>;

const initialProjects: Project[] = [
  { id: '1', title: 'SAD Final Project', dueDate: 'Apr. 22', currentTask: 'SAD Figma', progress: 60 },
  { id: '2', title: 'DSA Final Project', dueDate: 'May. 01', currentTask: 'Writing Report', progress: 40 },
  { id: '3', title: 'Web App Prototype', dueDate: 'May. 02', currentTask: 'Login Page Figma', progress: 30 },
  { id: '4', title: 'GRE Test', dueDate: 'May. 13', currentTask: 'Vocabulary 1/3', progress: 20 },
  { id: '5', title: 'Machine Learning Final Project', dueDate: 'Jun. 02', currentTask: 'Data Labeling', progress: 15 },
];

export default function Projects (){
    const [modalVisible, setModalVisible] = useState(false);
    const router = useRouter();
    // const navigation = useNavigation<ProjectsScreenNavigationProp>();
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const goToHome = () => {
        router.push('./home');
    };

    const renderProgressBar = (currentTask: string, progress: number) => (
        <View className="mt-6 w-full h-14 relative">
            {/* Background bar */}
            <View className="absolute top-1/2 h-2 w-full bg-pink-100 rounded-full" style={{ transform: [{ translateY: -4 }] }} />

            {/* Filled progress */}
            <View
                className="absolute top-1/2 h-2 bg-[#772343] rounded-full"
                style={{
                    width: `${progress}%`,
                    transform: [{ translateY: -4 }],
                    zIndex: 1,
                }}
            />
            
            <View className=''>
                {/* Liver icon at end of progress */}
                <Image
                    source={require('../assets/images/liver.png')}
                    className="h-6 w-6 absolute"
                    style={{
                        resizeMode: 'contain',
                        left: `${progress}%`,
                        marginLeft: -12, // Half of icon width for center align
                        top: 24,
                        zIndex: 2,
                    }}
                />

                {/* Task label bubble ABOVE liver */}
                <View
                    className="absolute items-center pb-1"
                    style={{
                        left: `${progress}%`,
                        top: -2,
                        zIndex: 3,
                        transform: [{ translateX: -50 }],
                    }}
                >
                    {/* Bubble */}
                    <View className="bg-[#FBD6E3] px-3 py-1 rounded-full relative">
                        <Text className="text-[#5E1526] font-semibold text-sm">{currentTask}</Text>
                    </View>

                    {/* Triangle */}
                    <View
                        style={{
                            width: 0,
                            height: 0,
                            borderLeftWidth: 5,
                            borderRightWidth: 5,
                            borderTopWidth: 6,
                            borderLeftColor: 'transparent',
                            borderRightColor: 'transparent',
                            borderTopColor: '#FBD6E3',
                            marginTop: -1,
                        }}
                    />
                </View>
            </View>

        </View>
    );



    const insets = useSafeAreaInsets();

    return (
            <View style={{ flex: 1, backgroundColor: '#F8C8C3', paddingTop: insets.top, paddingBottom: insets.bottom }}>
            
            {/* Header */}
            <View className="px-6 pt-6 flex-row items-center">
                <TouchableOpacity onPress={() => router.push("/home")} className="flex-row items-center bg-[#F29389] py-2 px-5 rounded-full">
                <Text className="text-white mr-1 text-lg">‹</Text>
                <Text className="text-white font-semibold">Home</Text>
                </TouchableOpacity>
            </View>

            {/* Projects Summary */}
            <View className="px-6 mt-6 flex-row gap-12 justify-between items-center m-2">
                <View className='w-[50%]'>
                <Text className="text-3xl font-semibold text-red-900">My Projects</Text>
                <Text className="text-l font-semibold text-red-900">You have 3 projects due this week!</Text>
                </View>
                <Image source={require('../assets/images/liver.png')} className="w-32 h-28" style={{ resizeMode: 'contain' }} />
            </View>

            {/* FlatList 佔滿剩下空間 */}
            <View style={{ flex: 1 }} className="px-6 mt-6">
                <FlatList
                    data={projects}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                        onPress={() => router.push(`./projects/${item.id}`)}
                        className="bg-white rounded-2xl px-4 pt-4 mb-4"
                        activeOpacity={0.8}
                        >
                        <View className="flex-row justify-between items-center">
                            <Text className="text-lg font-bold text-gray-800">{item.title}</Text>
                            <Text className="text-gray-600">{item.dueDate}</Text>
                        </View>
                        {renderProgressBar(item.currentTask, item.progress)}
                        </TouchableOpacity>
                    )}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingBottom: 100 }}
                />
            </View>

            {/* Floating Button */}
            <TouchableOpacity
                onPress={() => setModalVisible(true)}
                className="absolute bottom-6 right-6 w-14 h-14 bg-red-900 rounded-full items-center justify-center"
            >
                <Text className="text-white text-2xl">+</Text>
            </TouchableOpacity>

            {/* Modal */}
            <AddProjectModal visible={modalVisible} onClose={() => setModalVisible(false)} />
            </View>
        );
};
