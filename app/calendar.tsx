import { router, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, NativeScrollEvent, NativeSyntheticEvent, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSession } from '../context/SessionContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

interface Project {
  id: string;
  title: string;
  dateRange: string;
  colorClass: string;
  startDate: Date;
  endDate: Date;
}

// Define some pink/red shades
const colorOptions = [
  "bg-[#F8C8C3]", // light pink
  "bg-[#F29389]", // salmon
  "bg-[#FF9AA2]", // pastel red
];

const COLUMN_WIDTH = 80;
const INITIAL_DATES = 100; // Start with more dates for smoother experience

const ProjectRow: React.FC<{
  project?: Project;
  dates: Date[];
  columnWidth: number;
  scrollX?: number; // Add scroll position to determine visible area
  viewWidth?: number; // Add view width to calculate visible range
}> = ({ project, dates, columnWidth, scrollX = 0, viewWidth = 300 }) => {
  const router = useRouter();

  if (!project) {
    // Empty row with lighter gray horizontal line in the middle
    return (
      <View className="flex-row h-12 relative">
        {dates.map((_, index) => (
          <View
            key={index}
            style={{ width: columnWidth }}
            className="h-full"
          />
        ))}
        {/* Lighter gray horizontal line across the entire row */}
        <View
          className="absolute bg-gray-300 h-[0.5]"
          style={{
            top: 24, // Middle of the 48px (h-12) row
            left: 0,
            right: 0,
            width: '100%',
          }}
        />
      </View>
    );
  }

  // Find which dates this project spans
  const projectDates = dates.filter(date => date >= project.startDate && date <= project.endDate);
  if (projectDates.length === 0) return null;

  const startIndex = dates.findIndex(date => date >= project.startDate);
  const endIndex = dates.findIndex(date => date > project.endDate) - 1;
  const lastIndex = endIndex === -2 ? dates.length - 1 : Math.min(endIndex, dates.length - 1);

  // Calculate visible range based on scroll position
  const visibleStartIndex = Math.floor(scrollX / columnWidth);
  const visibleEndIndex = Math.ceil((scrollX + viewWidth) / columnWidth);

  // Find the intersection of project range and visible range
  const visibleProjectStartIndex = Math.max(startIndex, visibleStartIndex);
  const visibleProjectEndIndex = Math.min(lastIndex, visibleEndIndex);

  // Calculate the middle index of the visible project portion
  // const visibleMiddleIndex = Math.floor((visibleProjectStartIndex + visibleProjectEndIndex) / 2);

  // Only show title if there's a visible portion of the project
  const shouldShowTitle = visibleProjectStartIndex <= visibleProjectEndIndex;
  // const titleIndex = shouldShowTitle ? visibleMiddleIndex : -1;

  return (
    <View className="flex-row h-12 relative">
      {/* Lighter gray horizontal line across entire row (behind everything) */}
      <View
        className="absolute bg-gray-300 h-[0.5] z-0"
        style={{
          top: 24, // Middle of the 48px (h-12) row
          left: 0,
          right: 0,
          width: '100%'
        }}
      />

      {/* Project background blocks */}
      {dates.map((date, index) => {
        const isInRange = date >= project.startDate && date <= project.endDate;
        const isFirst = index === startIndex;
        const isLast = index === lastIndex;

        return (
          <View
            key={index}
            style={{ width: columnWidth }}
            className="h-full relative z-10"
          >
            {isInRange && (
              <View
                className={`h-full ${project.colorClass} ${
                  isFirst ? 'rounded-l-full' : ''
                } ${isLast ? 'rounded-r-full' : ''}`}
              />
            )}
          </View>
        );
      })}

      {/* Project label, absolutely positioned */}
      {shouldShowTitle && (
        <TouchableOpacity
          onPress={() =>
            router.push({ pathname: '/projects/[id]', params: { id: project.id } })
          }
          activeOpacity={0.8}
          style={{
            position: 'absolute',
            left: visibleProjectStartIndex * columnWidth,
            width: (visibleProjectEndIndex - visibleProjectStartIndex + 1) * columnWidth,
            height: '100%',
            zIndex: 20,
          }}
          className="justify-center items-center px-1"
        >
          <Text
            className="text-sm font-semibold text-[#5E1526] text-center truncate"
            numberOfLines={1}
          >
            {project.title}
          </Text>
          <Text
            className="text-xs text-[#5E1526] text-center truncate"
            numberOfLines={1}
          >
            {project.dateRange}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function Calendar() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dates, setDates] = useState<Date[]>([]);
  const [loadedRanges, setLoadedRanges] = useState<Set<string>>(new Set());
  const [initialScrollDone, setInitialScrollDone] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const headerRef = useRef<View>(null);
  const [showFloatingToday, setShowFloatingToday] = useState(false);
  const { session } = useSession();

  // Generate initial dates array (unlimited scrolling approach)
  const generateInitialDates = useCallback(() => {
    const datesArray = [];
    const today = new Date();
    
    // Start from way back and go way forward
    for (let i = -INITIAL_DATES / 2; i <= INITIAL_DATES / 2; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      datesArray.push(date);
    }
    return datesArray;
  }, []);

  const fetchProjectsForRange = useCallback(
    async (start: Date, end: Date, forceRefresh = false) => {
      if (!session?.token) {
        console.error("No session token found");
        router.push("/login");
        return;
      }

      const rangeKey = `${generateDateKey(start)}-${generateDateKey(end)}`;
      if (loadedRanges.has(rangeKey) && !forceRefresh) {
        return; // Already loaded this range
      }

      console.log("Fetching projects for range:", rangeKey);
      
      // Don't show loading indicator for additional range fetches to keep scrolling smooth
      const isInitialLoad = loadedRanges.size === 0;
      if (isInitialLoad) {
        setIsLoading(true);
      }

      try {
        const params = new URLSearchParams({
          start_date: start.toISOString().slice(0, 10),
          end_date: end.toISOString().slice(0, 10),
        }).toString();

        const res = await fetch(`${API_URL}/calendar_projects?${params}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });
        

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Failed to fetch projects:", errorText);
          throw new Error("Failed to fetch projects");
        }

        const data = await res.json();
        console.log("Fetched projects for range:", rangeKey, data);

        const newProjects = data.map((p: any) => ({
          id: p.project_id,
          title: p.project_name,
          dateRange: `${p.start_time.slice(0, 10)} ~ ${p.end_time?.slice(0, 10) ?? ""}`,
          colorClass: colorOptions[Math.floor(Math.random() * colorOptions.length)], // Purple color
          startDate: new Date(p.start_time),
          endDate: p.end_time ? new Date(p.end_time) : new Date(p.start_time),
        }));

        if (forceRefresh) {
          // Replace projects entirely for this range
          setProjects(prevProjects => {
            // Remove old projects from this range and add new ones
            const filteredProjects = prevProjects.filter(p => 
              !(p.startDate >= start && p.startDate <= end) && 
              !(p.endDate >= start && p.endDate <= end)
            );
            return [...filteredProjects, ...newProjects];
          });
        } else {
          // Merge with existing projects, avoiding duplicates
          setProjects(prevProjects => {
            const existingIds = new Set(prevProjects.map(p => p.id));
            const uniqueNewProjects = newProjects.filter((p: Project) => !existingIds.has(p.id));
            return [...prevProjects, ...uniqueNewProjects];
          });
        }

        setLoadedRanges(prev => new Set([...prev, rangeKey]));
      } catch (err) {
        console.error(err);
      } finally {
        if (isInitialLoad) {
          setIsLoading(false);
        }
      }
    },
    [session?.token]
  );

  // Refresh all projects when screen comes into focus
  const refreshAllProjects = useCallback(async () => {
    if (dates.length === 0 || !session?.token) return;

    console.log("Refreshing all projects due to screen focus");
    
    // Clear loaded ranges to force refresh
    setLoadedRanges(new Set());
    
    // Fetch projects for current date range with force refresh
    const start = dates[0];
    const end = dates[dates.length - 1];
    await fetchProjectsForRange(start, end, true);
  }, [dates.length, session?.token, fetchProjectsForRange]);

  // Use Expo Router's useFocusEffect to refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Calendar screen focused - refreshing projects");
      refreshAllProjects();
    }, [refreshAllProjects])
  );

  // Alternative: Listen to app state changes (when app comes to foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log("App became active - refreshing projects");
        refreshAllProjects();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [refreshAllProjects]);

  // Add more dates when approaching boundaries (improved infinite scroll)
  const loadMoreDates = useCallback((direction: 'past' | 'future') => {
    setDates(prevDates => {
      const newDates = [...prevDates];
      
      if (direction === 'past') {
        // Add 30 dates to the beginning
        const firstDate = newDates[0];
        const datesToAdd = [];
        for (let i = 30; i > 0; i--) {
          const date = new Date(firstDate);
          date.setDate(firstDate.getDate() - i);
          datesToAdd.push(date);
        }
        newDates.unshift(...datesToAdd);
        
        // Fetch projects for new range
        const start = datesToAdd[0];
        const end = datesToAdd[datesToAdd.length - 1];
        fetchProjectsForRange(start, end);
      } else {
        // Add 30 dates to the end
        const lastDate = newDates[newDates.length - 1];
        const datesToAdd = [];
        for (let i = 1; i <= 30; i++) {
          const date = new Date(lastDate);
          date.setDate(lastDate.getDate() + i);
          datesToAdd.push(date);
        }
        newDates.push(...datesToAdd);
        
        // Fetch projects for new range
        const start = datesToAdd[0];
        const end = datesToAdd[datesToAdd.length - 1];
        fetchProjectsForRange(start, end);
      }
      
      return newDates;
    });
  }, [fetchProjectsForRange]);

  // Initialize dates
  useEffect(() => {
    const initialDates = generateInitialDates();
    setDates(initialDates);
  }, [generateInitialDates]);

  const generateDateKey = (date: Date) => {
    return date.toISOString().slice(0, 10);
  };

  // Initial fetch when dates are set
  useEffect(() => {
    if (dates.length > 0 && session?.token) {
      const start = dates[0];
      const end = dates[dates.length - 1];
      fetchProjectsForRange(start, end);
    }
  }, [dates, fetchProjectsForRange, session?.token]);

  // Add these state variables to your Calendar component
const [scrollX, setScrollX] = useState(0);
const [viewWidth, setViewWidth] = useState(300);

// Update your handleScroll function to track scroll position AND check if today is visible
const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
  const currentScrollX = contentOffset.x;
  const contentWidth = contentSize.width;
  const currentViewWidth = layoutMeasurement.width;
  
  // Update scroll position and view width
  setScrollX(currentScrollX);
  setViewWidth(currentViewWidth);

  // Check if today is visible in the current view
  const today = new Date();
  const todayIndex = dates.findIndex(date =>
    date.toDateString() === today.toDateString()
  );

  if (todayIndex !== -1) {
    const todayPosition = todayIndex * COLUMN_WIDTH;
    const isVisibleStart = currentScrollX;
    const isVisibleEnd = currentScrollX + currentViewWidth;
    const isTodayVisible = todayPosition >= isVisibleStart && todayPosition <= isVisibleEnd;
    
    // Show floating today button only when today is NOT visible
    setShowFloatingToday(!isTodayVisible);
  }

  // Check if we're near the beginning (load past dates)
  if (currentScrollX < 10 * COLUMN_WIDTH && !isLoading) {
    loadMoreDates('past');
  }

  // Check if we're near the end (load future dates)
  if (currentScrollX > contentWidth - currentViewWidth - 10 * COLUMN_WIDTH && !isLoading) {
    loadMoreDates('future');
  }
}, [loadMoreDates, isLoading, dates]);

  const scrollToToday = useCallback(() => {
    if (dates.length === 0 || !scrollViewRef.current) return;

    const today = new Date();
    const todayIndex = dates.findIndex(date =>
      date.toDateString() === today.toDateString()
    );

    if (todayIndex !== -1) {
      const scrollX = Math.max(0, (todayIndex - 3) * COLUMN_WIDTH); // Center today with 3 days margin
      scrollViewRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, [dates]);

  // Auto-scroll to today after initial data is loaded
  useEffect(() => {
    if (dates.length > 0 && !initialScrollDone) {
      // Add a small delay to ensure the ScrollView is fully rendered
      const timeoutId = setTimeout(() => {
        scrollToToday();
        setInitialScrollDone(true);
      }, 100); // Reduced delay for faster initial scroll

      return () => clearTimeout(timeoutId);
    }
  }, [dates, initialScrollDone, scrollToToday]);

  // Filter projects that are visible in current date range
  const visibleProjects = projects.filter(project =>
    dates.some(date => date >= project.startDate && date <= project.endDate)
  );

  const rowCount = Math.max(visibleProjects.length + 5, 8); // Always show at least 5 empty rows with lines

  return (
    <SafeAreaView className="flex-1 bg-[#F8C8C3]">
      <View className="pt-6 pr-6 items-end">
        <TouchableOpacity
          onPress={() => router.push("/home")}
          className="flex-row items-center bg-[#F29389] py-2 px-5 rounded-full"
        >
          <Text className="text-white font-semibold">Home</Text>
          <Text className="text-white ml-1 text-lg">›</Text>
        </TouchableOpacity>
      </View>

      <View className="px-8 flex-row gap-2 justify-between items-end my-6">
        <View>
          <Text className="text-3xl font-semibold text-[#5E1526]">Calendar</Text>
          <Text className="text-lg text-[#5E1526] mt-2 font-medium">
            Heres what your week
          </Text>
          <Text className="text-lg text-[#5E1526] font-medium">looks like.</Text>
        </View>
        <Image
          source={require("../assets/images/liver.png")}
          className="w-32 h-28"
          style={{ resizeMode: "contain" }}
        />
      </View>

      {/* Date Header - Outside the white modal */}
      <View ref={headerRef} className="px-8 mb-4">
        {/* Floating Today Button */}
        {showFloatingToday && (
          <TouchableOpacity
            onPress={scrollToToday}
            className="absolute top-0 right-4 bg-[#5E1526] px-4 py-2 rounded-full shadow-lg z-10"
          >
            <Text className="text-white font-medium">📅 Today</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Improved Infinite Scrolling Gantt Chart */}
      <View className='px-4 py-4 flex-1'>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={true}
          onScroll={handleScroll}
          scrollEventThrottle={16} // Smooth scrolling
          className="flex-1 bg-white rounded-2xl shadow-sm"
          decelerationRate="normal" // Smooth deceleration
          bounces={true}
          removeClippedSubviews={true} // Performance optimization
        >
          <View style={{ minWidth: COLUMN_WIDTH * dates.length }}>
            {/* Table Header - Date Columns with Today Line */}
            <View className="flex-row mb-2 bg-transparent border-b border-gray-300">
              {dates.map((date, index) => {
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <View
                    key={`header-${generateDateKey(date)}`}
                    className="items-center py-2 relative"
                    style={{ width: COLUMN_WIDTH }}
                  >
                    <Text className="text-xs text-gray-500">
                      {date.toLocaleString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text className="text-sm text-[#5E1526]">
                      {date.toLocaleString('en-US', { month: 'short' })}
                    </Text>
                    <Text className="text-lg font-semibold text-[#5E1526]">
                      {date.getDate()}
                    </Text>
                    {isToday && (
                      <>
                        <View className="w-2 h-2 bg-[#5E1526] rounded-full mt-1" />
                        {/* Vertical line under today */}
                        <View 
                          className="absolute bg-[#5E1526] w-0.5 z-10"
                          style={{ 
                            top: 70, // Start after the header
                            bottom: -400, // Extend way down to cover all rows
                            left: COLUMN_WIDTH / 2 - 1, // Center the line
                          }} 
                        />
                      </>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Gantt Chart Body - Project Rows */}
            <View className='rounded-2xl px-4 py-4 shadow-sm'>
                {Array.from({ length: rowCount }).map((_, rowIndex) => (
                <View key={rowIndex} className="py-2">
                  <ProjectRow
                  project={visibleProjects[rowIndex]}
                  dates={dates}
                  columnWidth={COLUMN_WIDTH}
                  scrollX={scrollX}
                  viewWidth={viewWidth}
                  />
                </View>
                ))}
            </View>
          </View>
        </ScrollView>
      </View>

      {isLoading && (
        <View className="absolute bottom-4 right-4 bg-gray-800 px-3 py-1 rounded-full z-20">
          <Text className="text-white text-sm">Loading...</Text>
        </View>
      )}

      {!isLoading && visibleProjects.length === 0 && dates.length > 0 && (
        <View className="absolute inset-0 justify-center items-center">
          <Text className="text-gray-400 text-center">
            No projects found in the visible date range
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}