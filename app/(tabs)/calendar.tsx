import { router, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, NativeScrollEvent, NativeSyntheticEvent, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface Project {
  id: string;
  title: string;
  dateRange: string;
  colorClass: string;
  startDate: Date;
  endDate: Date;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

const CalendarItemRow: React.FC<{ visibleRange: DateRange; projects: Project[]; dayWidth: number }> = ({ visibleRange, projects, dayWidth }) => {
  const router = useRouter();

  // Calculate visible dates in the range
  const visibleDates: Date[] = [];
  const start = new Date(Date.UTC(
    visibleRange.startDate.getUTCFullYear(),
    visibleRange.startDate.getUTCMonth(),
    visibleRange.startDate.getUTCDate()
  ));
  const end = new Date(Date.UTC(
    visibleRange.endDate.getUTCFullYear(),
    visibleRange.endDate.getUTCMonth(),
    visibleRange.endDate.getUTCDate()
  ));
  end.setUTCDate(end.getUTCDate() + 1);

  const curr = new Date(start);
  while (curr < end) {
    visibleDates.push(new Date(Date.UTC(
      curr.getUTCFullYear(),
      curr.getUTCMonth(),
      curr.getUTCDate()
    )));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  // Always show at least 3 gray lines (rows), or as many as there are projects
  const rowCount = Math.max(5, projects.length);

  // For each row, either show a project or just a gray line
  const rows = Array.from({ length: rowCount }).map((_, rowIdx) => {
    const project = projects[rowIdx];

    // Draw the gray line (always present)
    const grayLine = (
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 30 - 1, // middle of 60px height, minus half of line thickness
          height: 1,
          backgroundColor: '#E5E7EB', // Tailwind gray-200
          zIndex: 1,
        }}
        pointerEvents="none"
      />
    );

    if (!project) {
      // Empty row, just gray line
      return (
        <View key={`empty-${rowIdx}`} className="flex-row mb-2 relative" style={{ height: 60 }}>
          {grayLine}
          {visibleDates.map((_, index) => (
            <View key={index} style={{ width: dayWidth, height: 60 }} />
          ))}
        </View>
      );
    }

    // Project row
    const projectStart = project.startDate.getTime();
    const projectEnd = project.endDate.getTime();

    const effectiveStartIndex = Math.max(
      0,
      visibleDates.findIndex(d => d.getTime() >= projectStart)
    );
    const effectiveEndIndex = Math.min(
      visibleDates.length - 1,
      visibleDates.findLastIndex(d => d.getTime() <= projectEnd)
    );

    const labelStartIndex = Math.max(
      0,
      visibleDates.findIndex(d => d.getTime() >= projectStart)
    );
    const labelEndIndex = Math.min(
      visibleDates.length - 1,
      visibleDates.findLastIndex(d => d.getTime() <= projectEnd)
    );

    const isProjectVisible = projectEnd >= visibleDates[0].getTime() && projectStart <= visibleDates[visibleDates.length - 1].getTime();
    const projectDurationInView = Math.max(1, labelEndIndex - labelStartIndex + 1);
    const offsetInView = Math.max(0, labelStartIndex);

    const cells = visibleDates.map((date, index) => {
      const isInRange = date.getTime() >= projectStart && date.getTime() <= projectEnd;

      const isFirstCell = index === effectiveStartIndex;
      const isLastCell = index === effectiveEndIndex;

      let roundedClass = '';
      if (isFirstCell && isLastCell) {
        roundedClass = 'rounded-xl';
      } else if (isFirstCell) {
        roundedClass = 'rounded-l-xl';
      } else if (isLastCell) {
        roundedClass = 'rounded-r-xl';
      }

      return (
        <View
          key={index}
          style={{ width: dayWidth, height: 60 }}
          className={isInRange ? `${project.colorClass} ${roundedClass}` : ''}
        />
      );
    });

    return (
      <View key={project.id} className="flex-row mb-2 relative" style={{ height: 60 }}>
        {grayLine}
        {cells}
        {isProjectVisible && (
            <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/projects/[id]', params: { id: project.id } })}
            style={{
              position: 'absolute',
              left: offsetInView * dayWidth,
              width: projectDurationInView * dayWidth,
              height: 60,
              zIndex: 10,
            }}
            className={`absolute justify-center items-center ${project.colorClass} rounded-xl px-1 group`}
            >
            <Text
              numberOfLines={2}
              ellipsizeMode="tail"
              className="text-white font-semibold text-xs text-center leading-tight w-full"
            >
              {project.title}
              {"\n"}
              {project.startDate.toISOString().slice(0, 10)} ~ {project.endDate.toISOString().slice(0, 10)}
            </Text>
            <View className="absolute top-full mt-1 hidden group-hover:flex bg-black bg-opacity-80 px-2 py-1 rounded-md z-50 max-w-xs">
              <Text className="text-white text-xs text-center whitespace-pre-line leading-tight">
              {project.title}
              {"\n"}
              {project.startDate.toISOString().slice(0, 10)} ~ {project.endDate.toISOString().slice(0, 10)}
              </Text>
            </View>
            </TouchableOpacity>
        )}
      </View>
    );
  });

  return <View className="mt-4">{rows}</View>;
};



const WeekDay: React.FC<{
  day: string;
  month: string;
  isActive: boolean;
  isToday: boolean;
}> = ({ day, month, isActive, isToday }) => (
  <View className={`flex justify-center items-center rounded-full w-12 h-12 ${isToday ? 'bg-white' : ''}`}>
    <Text className={`text-sm text-[#5E1526]`}>{month}</Text>
    <View className={`tems-center justify-center`}>
      <Text className={`text-sm font-medium text-[#5E1526]`}>{day}</Text>
    </View>
  </View>
);

export default function Calendar() {
  const [currentIndex, setCurrentIndex] = useState<number>(30);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [visibleRange, setVisibleRange] = useState<DateRange | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const totalDays = 60;
  const today = React.useMemo(() => new Date(), []);
  const dayWidth = 70;
  const visibleDays = 5;

  const dummyProjects = React.useMemo<Project[]>(() => [
    { id: '1', title: 'Website Redesign', dateRange: 'May 1-5, 2025', colorClass: 'bg-[#F8C8C3]', startDate: new Date('2025-05-01'), endDate: new Date('2025-05-05') },
    { id: '2', title: 'Mobile App Development', dateRange: 'May 3-10, 2025', colorClass: 'bg-[#EFA7A7]', startDate: new Date('2025-05-03'), endDate: new Date('2025-05-10') },
    { id: '3', title: 'Database Migration', dateRange: 'May 6-8, 2025', colorClass: 'bg-[#F6D6AD]', startDate: new Date('2025-05-06'), endDate: new Date('2025-05-08') },
    { id: '4', title: 'User Testing', dateRange: 'May 12-15, 2025', colorClass: 'bg-[#B6E2D3]', startDate: new Date('2025-05-12'), endDate: new Date('2025-05-15') },
    { id: '5', title: 'Product Launch', dateRange: 'May 20-22, 2025', colorClass: 'bg-[#A7C7E7]', startDate: new Date('2025-05-20'), endDate: new Date('2025-05-22') },
    { id: '6', title: 'Team Training', dateRange: 'May 25-27, 2025', colorClass: 'bg-[#D7BDE2]', startDate: new Date('2025-05-25'), endDate: new Date('2025-05-27') },
    { id: '7', title: 'Code Review', dateRange: 'May 2-4, 2025', colorClass: 'bg-[#F1948A]', startDate: new Date('2025-05-02'), endDate: new Date('2025-05-04') },
    { id: '8', title: 'Client Presentation', dateRange: 'May 9, 2025', colorClass: 'bg-[#F7CAC9]', startDate: new Date('2025-05-09'), endDate: new Date('2025-05-09') },
  ], []);

  const calculateVisibleRange = React.useCallback((scrollX: number): DateRange => {
    const startIndex = Math.floor(scrollX / dayWidth);
    const endIndex = Math.min(startIndex + visibleDays - 1, totalDays - 1);

    const startDate = new Date(today);
    startDate.setDate(today.getDate() + (startIndex - 30));

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (endIndex - 30));

    return { startDate, endDate };
  }, [dayWidth, visibleDays, totalDays, today]);

  const fetchProjectsForRange = useCallback(async (startDate: Date, endDate: Date) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const overlappingProjects = dummyProjects.filter(project =>
        project.startDate <= endDate && project.endDate >= startDate
      );
      setProjects(overlappingProjects);
    } catch (err) {
      console.error(err);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [dummyProjects]);

  const generateDays = React.useCallback((centerIndex: number) => {
    return Array.from({ length: totalDays }).map((_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + (i - 30));
      return {
        day: date.getDate().toString(),
        month: date.toLocaleString('en-US', { month: 'short' }),
        isActive: i === centerIndex,
        isToday: date.toDateString() === today.toDateString(),
        fullDate: date,
      };
    });
  }, [today, totalDays]);

  const [weekDays, setWeekDays] = useState(() => generateDays(30));

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(scrollX / dayWidth);
    const newRange = calculateVisibleRange(scrollX);

    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalDays) {
      setCurrentIndex(newIndex);
      setWeekDays(generateDays(newIndex));
    }

    if (!visibleRange ||
      newRange.startDate.getTime() !== visibleRange?.startDate?.getTime() ||
      newRange.endDate.getTime() !== visibleRange?.endDate?.getTime()) {
      setVisibleRange(newRange);
      fetchProjectsForRange(newRange.startDate, newRange.endDate);
    }
  }, [currentIndex, visibleRange, fetchProjectsForRange, calculateVisibleRange, generateDays]);

  useEffect(() => {
    const initialRange = calculateVisibleRange(30 * dayWidth);
    setVisibleRange(initialRange);
    fetchProjectsForRange(initialRange.startDate, initialRange.endDate);
  }, [fetchProjectsForRange, calculateVisibleRange]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8C8C3]">
      <View className="pt-8 pr-4 items-end">
        <TouchableOpacity onPress={() => router.push("/home")} className="flex-row items-center bg-[#F29389] py-2 px-5 rounded-full">
          <Text className="text-white font-semibold">Home</Text>
          <Text className="text-white ml-1 text-lg">›</Text>
        </TouchableOpacity>
      </View>

      <View className="px-8 py-12 flex-row gap-2 mt-12 justify-between items-end">
        <View>
          <Text className="text-3xl font-semibold text-[#5E1526]">Calendar</Text>
          <Text className="text-lg text-[#5E1526] mt-2 font-medium">Here&apos;s what your week</Text>
          <Text className="text-lg text-[#5E1526] font-medium">looks like.</Text>
        </View>
        <Image source={require('../../assets/images/liver.png')} className="w-32 h-28" style={{ resizeMode: 'contain' }} />
      </View>

      
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={dayWidth}
        snapToAlignment="start"
        decelerationRate="fast"
        className='mb-4 max-h-16'
        contentOffset={{ x: 30 * dayWidth, y: 0 }} // Scroll to today by default
        style={{ width: dayWidth * visibleDays }} // Limit visible width to 5 days
      >
        <View className="flex-row px-6 w-full items-center justify-center">
          {weekDays.map((weekDay, index) => (
            <View key={index} style={{ width: dayWidth }} className='flex items-center justify-center'>
              <WeekDay {...weekDay} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* {visibleRange && (
        <View className="px-8 mb-3">
          <Text className="text-sm text-gray-600 text-center">
            {visibleRange.startDate.toLocaleDateString()} - {visibleRange.endDate.toLocaleDateString()}
          </Text>
        </View>
      )} */}

      <View className="flex-1 bg-white rounded-t-3xl shadow-xl h-full">
        <ScrollView className="flex-1 pt-6 pb-4" showsVerticalScrollIndicator contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 20 }}>
          {isLoading ? (
            <View className="flex-1 justify-center items-center py-10">
              <Text className="text-gray-500">Loading projects...</Text>
            </View>
          ) : visibleRange && projects.length > 0 ? (
            <CalendarItemRow visibleRange={visibleRange} projects={projects} dayWidth={dayWidth} />
          ) : (
            <View className="flex-1 justify-center items-center py-10">
              <Text className="text-gray-400 text-center">No projects found for the selected date range</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
