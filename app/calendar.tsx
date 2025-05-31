import { router, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, NativeScrollEvent, NativeSyntheticEvent, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
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
          className="absolute bg-gray-500 h-[0.5]"
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
  const visibleMiddleIndex = Math.floor((visibleProjectStartIndex + visibleProjectEndIndex) / 2);

  // Only show title if there's a visible portion of the project
  const shouldShowTitle = visibleProjectStartIndex <= visibleProjectEndIndex;
  const titleIndex = shouldShowTitle ? visibleMiddleIndex : -1;

  return (
    <View className="flex-row h-12 relative">
      {/* Lighter gray horizontal line across entire row (behind everything) */}
      <View
        className="absolute bg-gray-500 h-[0.5] z-0"
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
  }, []);

  // Initialize dates
  useEffect(() => {
    const initialDates = generateInitialDates();
    setDates(initialDates);
  }, [generateInitialDates]);

  const generateDateKey = (date: Date) => {
    return date.toISOString().slice(0, 10);
  };

  const fetchProjectsForRange = useCallback(
    async (start: Date, end: Date) => {
      if (!session?.token) {
        console.error("No session token found");
        router.push("/login");
        return;
      }

      const rangeKey = `${generateDateKey(start)}-${generateDateKey(end)}`;
      if (loadedRanges.has(rangeKey)) {
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

        // Merge with existing projects, avoiding duplicates
        setProjects(prevProjects => {
          const existingIds = new Set(prevProjects.map(p => p.id));
          const uniqueNewProjects = newProjects.filter((p: Project) => !existingIds.has(p.id));
          return [...prevProjects, ...uniqueNewProjects];
        });

        setLoadedRanges(prev => new Set([...prev, rangeKey]));
      } catch (err) {
        console.error(err);
      } finally {
        if (isInitialLoad) {
          setIsLoading(false);
        }
      }
    },
    [session?.token, loadedRanges]
  );

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
      <View className='px-2 py-2 flex-1'>
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
                <ProjectRow
                  key={rowIndex}
                  project={visibleProjects[rowIndex]}
                  dates={dates}
                  columnWidth={COLUMN_WIDTH}
                  scrollX={scrollX}
                  viewWidth={viewWidth}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      {isLoading && (
        <View className="absolute top-4 right-4 bg-gray-800 px-3 py-1 rounded-full">
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


// import { useEffect, useRef, useState } from 'react';
// import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// const { width: screenWidth } = Dimensions.get('window');
// const itemWidth = screenWidth / 5; // Show 5 dates at once
// const INITIAL_DATES = 200; // Start with 200 dates loaded

// const DateSelector = () => {
//   const [selectedDate, setSelectedDate] = useState(new Date());
//   const [dates, setDates] = useState<Date[]>([]);
//   const [centerIndex, setCenterIndex] = useState(INITIAL_DATES / 2);
//   const scrollViewRef = useRef<ScrollView>(null);

//   // Generate initial dates array (unlimited scrolling)
//   const generateInitialDates = () => {
//     const datesArray = [];
//     const today = new Date();
    
//     // Start from way back and go way forward
//     for (let i = -INITIAL_DATES / 2; i <= INITIAL_DATES / 2; i++) {
//       const date = new Date(today);
//       date.setDate(today.getDate() + i);
//       datesArray.push(date);
//     }
//     return datesArray;
//   };

//   // Add more dates when approaching boundaries
//   const loadMoreDates = (direction: 'past' | 'future') => {
//     setDates(prevDates => {
//       const newDates = [...prevDates];
      
//       if (direction === 'past') {
//         // Add 50 dates to the beginning
//         const firstDate = newDates[0];
//         for (let i = 50; i > 0; i--) {
//           const date = new Date(firstDate);
//           date.setDate(firstDate.getDate() - i);
//           newDates.unshift(date);
//         }
//         setCenterIndex(prev => prev + 50);
//       } else {
//         // Add 50 dates to the end
//         const lastDate = newDates[newDates.length - 1];
//         for (let i = 1; i <= 50; i++) {
//           const date = new Date(lastDate);
//           date.setDate(lastDate.getDate() + i);
//           newDates.push(date);
//         }
//       }
      
//       return newDates;
//     });
//   };

//   useEffect(() => {
//     const initialDates = generateInitialDates();
//     setDates(initialDates);
    
//     // Scroll to today initially
//     setTimeout(() => {
//       scrollViewRef.current?.scrollTo({
//         x: (INITIAL_DATES / 2) * itemWidth,
//         animated: false
//       });
//     }, 100);
//   }, []);

//   const formatDate = (date: Date) => {
//     const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//     const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
//                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
//     return {
//       day: days[date.getDay()],
//       date: date.getDate(),
//       month: months[date.getMonth()],
//       year: date.getFullYear()
//     };
//   };

//   const isToday = (date: Date): boolean => {
//     const today = new Date();
//     return date.toDateString() === today.toDateString();
//   };

//   const isSelected = (date: Date) => {
//     return date.toDateString() === selectedDate.toDateString();
//   };

//   const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
//     const scrollX = event.nativeEvent.contentOffset.x;
//     const index = Math.round(scrollX / itemWidth);
    
//     if (index >= 0 && index < dates.length) {
//       setSelectedDate(dates[index]);
      
//       // Load more dates if approaching boundaries
//       if (index < 25) {
//         loadMoreDates('past');
//       } else if (index > dates.length - 25) {
//         loadMoreDates('future');
//       }
//     }
//   };

//   const onDatePress = (date: Date, index: number) => {
//     setSelectedDate(date);
//     scrollViewRef.current?.scrollTo({
//       x: index * itemWidth,
//       animated: true
//     });
//   };

//   if (dates.length === 0) {
//     return <View style={styles.container}><Text>Loading...</Text></View>;
//   }

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Select Date</Text>
      
//       <View style={styles.selectedDateContainer}>
//         <Text style={styles.selectedDateText}>
//           {formatDate(selectedDate).day}, {formatDate(selectedDate).month} {formatDate(selectedDate).date}, {formatDate(selectedDate).year}
//         </Text>
//       </View>

//       <ScrollView
//         ref={scrollViewRef}
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         snapToInterval={itemWidth}
//         decelerationRate="normal"
//         contentContainerStyle={styles.scrollContainer}
//         onScroll={handleScroll}
//         scrollEventThrottle={16}
//         pagingEnabled={false}
//         bounces={true}
//       >
//         {dates.map((date, index) => {
//           const formatted = formatDate(date);
//           const today = isToday(date);
//           const selected = isSelected(date);
          
//           return (
//             <TouchableOpacity
//               key={`${date.getTime()}-${index}`}
//               style={[
//                 styles.dateItem,
//                 today && styles.todayItem,
//                 selected && styles.selectedItem
//               ]}
//               onPress={() => onDatePress(date, index)}
//               activeOpacity={0.7}
//             >
//               <Text style={[
//                 styles.dayText,
//                 today && styles.todayText,
//                 selected && styles.selectedText
//               ]}>
//                 {formatted.day}
//               </Text>
//               <Text style={[
//                 styles.dateText,
//                 today && styles.todayText,
//                 selected && styles.selectedText
//               ]}>
//                 {formatted.date}
//               </Text>
//               <Text style={[
//                 styles.monthText,
//                 today && styles.todayText,
//                 selected && styles.selectedText
//               ]}>
//                 {formatted.month}
//               </Text>
//             </TouchableOpacity>
//           );
//         })}
//       </ScrollView>
      
//       <View style={styles.instructionContainer}>
//         <Text style={styles.instructionText}>
//           Scroll left/right to change dates • Unlimited scrolling
//         </Text>
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f8f9fa',
//     paddingTop: 50,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     marginBottom: 20,
//     color: '#333',
//   },
//   selectedDateContainer: {
//     backgroundColor: 'white',
//     marginHorizontal: 20,
//     padding: 15,
//     borderRadius: 10,
//     marginBottom: 30,
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   selectedDateText: {
//     fontSize: 18,
//     fontWeight: '600',
//     textAlign: 'center',
//     color: '#2c3e50',
//   },
//   scrollContainer: {
//     paddingHorizontal: screenWidth / 2 - itemWidth / 2,
//   },
//   dateItem: {
//     width: itemWidth,
//     height: 80,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'white',
//     marginHorizontal: 2,
//     borderRadius: 12,
//     elevation: 1,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 2,
//   },
//   todayItem: {
//     backgroundColor: '#e3f2fd',
//     borderWidth: 2,
//     borderColor: '#2196f3',
//   },
//   selectedItem: {
//     backgroundColor: '#2196f3',
//     transform: [{ scale: 1.05 }],
//   },
//   dayText: {
//     fontSize: 12,
//     color: '#666',
//     fontWeight: '500',
//   },
//   dateText: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//     marginVertical: 2,
//   },
//   monthText: {
//     fontSize: 11,
//     color: '#666',
//     fontWeight: '500',
//   },
//   todayText: {
//     color: '#2196f3',
//   },
//   selectedText: {
//     color: 'white',
//   },
//   instructionContainer: {
//     marginTop: 30,
//     paddingHorizontal: 20,
//   },
//   instructionText: {
//     textAlign: 'center',
//     color: '#666',
//     fontSize: 14,
//     fontStyle: 'italic',
//   },
// });

// export default DateSelector;
// import { router, useRouter } from 'expo-router';
// import React, { useCallback, useEffect, useRef, useState } from 'react';
// import { Image, NativeScrollEvent, NativeSyntheticEvent, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

// interface Project {
//   id: string;
//   title: string;
//   dateRange: string;
//   colorClass: string;
//   startDate: Date;
//   endDate: Date;
// }

// interface DateRange {
//   startDate: Date;
//   endDate: Date;
// }

// const CalendarItemRow: React.FC<{
//   visibleRange: DateRange;
//   projects: Project[];
//   dayWidth: number;
//   todayPosition: number | null;
// }> = ({
//   visibleRange,
//   projects,
//   dayWidth,
//   todayPosition,
// }) => {
//   const router = useRouter();

//   // Calculate visible dates in the range
//   const visibleDates: Date[] = [];

//   const start = new Date(Date.UTC(
//     visibleRange.startDate.getUTCFullYear(),
//     visibleRange.startDate.getUTCMonth(),
//     visibleRange.startDate.getUTCDate()
//   ));

//   const end = new Date(Date.UTC(
//     visibleRange.endDate.getUTCFullYear(),
//     visibleRange.endDate.getUTCMonth(),
//     visibleRange.endDate.getUTCDate()
//   ));
//   end.setUTCDate(end.getUTCDate() + 1); // 包含當日

//   let curr = new Date(start);
//   while (curr < end) {
//     visibleDates.push(new Date(curr)); // 每一天都是 UTC Date
//     curr.setUTCDate(curr.getUTCDate() + 1);
//   }


//   // Always show at least 5 gray lines (rows), or as many as there are projects
//   const rowCount = Math.max(5, projects.length);

//   // For each row, either show a project or just a gray line
//   const rows = Array.from({ length: rowCount }).map((_, rowIdx) => {
//     const project = projects[rowIdx];

//     // Draw the gray line (always present)
//     const grayLine = (
//       <View
//         style={{
//           position: 'absolute',
//           left: 0,
//           right: 0,
//           top: 30 - 1, // middle of 60px height, minus half of line thickness
//           height: 1,
//           backgroundColor: '#E5E7EB', // Tailwind gray-200
//           zIndex: 1,
//         }}
//         pointerEvents="none"
//       />
//     );

//     if (!project) {
//       // Empty row, just gray line
//       return (
//         <View key={`empty-${rowIdx}`} className="flex-row mb-2 relative" style={{ height: 60 }}>
//           {grayLine}
//           {visibleDates.map((_, index) => (
//             <View key={index} style={{ width: dayWidth, height: 60 }} />
//           ))}
//         </View>
//       );
//     }

//     // console.log('Project:', project);
//     // Project row
//     const projectStart = project.startDate.getTime();
//     const projectEnd = project.endDate.getTime();

//     // console.log(visibleDates)
//     const effectiveStartIndex = Math.max(
//       0,
//       visibleDates.findIndex(d => d.getTime() >= projectStart)
//     );
//     const effectiveEndIndex = Math.min(
//       visibleDates.length - 1,
//       visibleDates.findLastIndex(d => d.getTime() <= projectEnd)
//     );

//     const labelStartIndex = Math.max(
//       0,
//       visibleDates.findIndex(d => d.getTime() >= projectStart)
//     );
//     const labelEndIndex = Math.min(
//       visibleDates.length - 1,
//       visibleDates.findLastIndex(d => d.getTime() <= projectEnd)
//     );

//     const isProjectVisible = projectEnd >= visibleDates[0].getTime() && projectStart <= visibleDates[visibleDates.length - 1].getTime();
//     // console.log('isProjectVisible:', isProjectVisible, projectStart, projectEnd, visibleDates[0].getTime(), visibleDates[visibleDates.length - 1].getTime());
//     const projectDurationInView = Math.max(1, labelEndIndex - labelStartIndex + 1);
//     const offsetInView = Math.max(0, labelStartIndex);

//     const cells = visibleDates.map((date, index) => {
//       const isInRange = date.getTime() >= projectStart && date.getTime() <= projectEnd;

//       const isFirstCell = index === effectiveStartIndex;
//       const isLastCell = index === effectiveEndIndex;

//       let roundedClass = '';
//       if (isFirstCell && isLastCell) {
//         roundedClass = 'rounded-full';
//       } else if (isFirstCell) {
//         roundedClass = 'rounded-l-full';
//       } else if (isLastCell) {
//         roundedClass = 'rounded-r-full';
//       }

//       return (
//         <View
//           key={index}
//           style={{ width: dayWidth, height: 60 }}
//           className={isInRange ? `${project.colorClass} ${roundedClass}` : ''}
//         />
//       );
//     });

    
//     return (
//       <View key={project.id} className="flex-row mb-2 relative" style={{ height: 60 }}>
//         {grayLine}
//         {cells}
//         {isProjectVisible && (
//             <TouchableOpacity
//               activeOpacity={0.8}
//               onPress={() => router.push({ pathname: '/projects/[id]', params: { id: project.id } })}
//               style={{
//                 position: 'absolute',
//                 left: offsetInView * dayWidth,
//                 width: projectDurationInView * dayWidth,
//                 height: 60,
//                 zIndex: 100,
//               }}
//               className={`absolute justify-center items-center ${project.colorClass} rounded-xl px-1 group`}
//             >
//               <Text
//                 numberOfLines={2}
//                 ellipsizeMode="tail"
//                 className="text-white font-semibold text-xs text-center leading-tight w-full"
//               >
//                 {project.title}
//                 {"\n"}
//                 {project.startDate.toISOString().slice(0, 10)} ~ {project.endDate.toISOString().slice(0, 10)}
//               </Text>
//               <View className="absolute top-full mt-1 hidden group-hover:flex bg-black bg-opacity-80 px-2 py-1 rounded-md z-50 max-w-xs">
//                 <Text className="text-white text-xs text-center whitespace-pre-line leading-tight">
//                 {project.title}
//                 {"\n"}
//                 {project.startDate.toISOString().slice(0, 10)} ~ {project.endDate.toISOString().slice(0, 10)}
//                 </Text>
//               </View>
//             </TouchableOpacity>
//         )}
//       </View>
//     );
//   });


//   return (
//       <View className="mt-6 relative">
//         {/* Fixed Today Line + Circle */}
//         {todayPosition !== null && (
//           <>
//             {/* 紅點 */}
//             <View
//               style={{
//                 position: 'absolute',
//                 top: 0, // 圓點貼齊白色區塊上緣
//                 left: todayPosition - 6, // 中心對齊
//                 width: 12,
//                 height: 12,
//                 borderRadius: 6,
//                 backgroundColor: '#D87070',
//                 zIndex: 20,
//               }}
//               pointerEvents="none"
//             />

//             {/* 垂直紅線 */}
//             <View
//               style={{
//                 position: 'absolute',
//                 top: 12, // 紅線從紅點底部往下延伸
//                 left: todayPosition - 1, // 線寬 2px，中心對齊
//                 bottom: 0,
//                 width: 2,
//                 backgroundColor: '#D87070',
//                 zIndex: 10,
//               }}
//               pointerEvents="none"
//             />
//           </>
//         )}

//         {/* 每一列項目 */}
//         {rows}
//       </View>
//     );
// };

// const WeekDay: React.FC<{
//   day: string;
//   month: string;
//   isActive: boolean;
//   isToday: boolean;
// }> = ({ day, month, isActive, isToday }) => (
//   <View className="items-center justify-start w-12 relative">
//     {/* 日期圓圈 */}
//     <View
//       className={`flex justify-center items-center rounded-full w-12 h-12 ${
//         isToday ? 'bg-white opacity-50' : ''
//       }`}
//     >
//       <Text className="text-sm text-[#5E1526]">{month}</Text>
//       <Text className="text-sm font-medium text-[#5E1526]">{day}</Text>
//     </View>

//     {/* 👉 當天圓點 + 線條 */}
//     {isToday && (
//       <View className="absolute top-[48px] items-center z-50">
//         {/* 垂直線 */}
//         <View className="w-[2px] h-6 bg-[#5E1526]" />
//         {/* 圓點 */}
//         <View className="w-2 h-2 rounded-full bg-[#5E1526] mt-1" />
//       </View>
//     )}
//   </View>
// );

// export default function Calendar() {
//   const [currentIndex, setCurrentIndex] = useState<number>(30);
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [visibleRange, setVisibleRange] = useState<DateRange | null>(null);
//   const scrollViewRef = useRef<ScrollView>(null);
//   const bottomScrollViewRef = useRef<ScrollView>(null);

//   const totalDays = 60;
//   const today = React.useMemo(() => {
//     const d = new Date();
//     d.setHours(0, 0, 0, 0);
//     return d;
//   }, []);
//   const dayWidth = 70;
//   const visibleDays = 5;
//   const todayIndex = 30; // Today is at index 30

//   // Calculate today's position relative to the visible area
//   const todayPosition = todayIndex * dayWidth; // 精準對齊第 30 個日期
//   const isTodayVisible = todayPosition >= 0;

//   const dummyProjects = React.useMemo<Project[]>(() => [
//     { id: '1', title: 'Website Redesign', dateRange: 'May 1-5, 2025', colorClass: 'bg-[#F8C8C3]', startDate: new Date('2025-05-01'), endDate: new Date('2025-05-05') },
//     { id: '2', title: 'Mobile App Development', dateRange: 'May 3-10, 2025', colorClass: 'bg-[#EFA7A7]', startDate: new Date('2025-05-03'), endDate: new Date('2025-05-10') },
//     { id: '3', title: 'Database Migration', dateRange: 'May 6-8, 2025', colorClass: 'bg-[#F6D6AD]', startDate: new Date('2025-05-06'), endDate: new Date('2025-05-08') },
//     { id: '4', title: 'User Testing', dateRange: 'May 12-15, 2025', colorClass: 'bg-[#B6E2D3]', startDate: new Date('2025-05-12'), endDate: new Date('2025-05-15') },
//     { id: '5', title: 'Product Launch', dateRange: 'May 20-22, 2025', colorClass: 'bg-[#A7C7E7]', startDate: new Date('2025-05-20'), endDate: new Date('2025-05-22') },
//     { id: '6', title: 'Team Training', dateRange: 'May 25-27, 2025', colorClass: 'bg-[#D7BDE2]', startDate: new Date('2025-05-25'), endDate: new Date('2025-05-27') },
//     { id: '7', title: 'Code Review', dateRange: 'May 2-4, 2025', colorClass: 'bg-[#F1948A]', startDate: new Date('2025-05-02'), endDate: new Date('2025-05-04') },
//     { id: '8', title: 'Client Presentation', dateRange: 'May 9, 2025', colorClass: 'bg-[#F7CAC9]', startDate: new Date('2025-05-09'), endDate: new Date('2025-05-09') },
//   ], []);

//   const calculateVisibleRange = React.useCallback((scrollX: number): DateRange => {
//     const startIndex = Math.floor(scrollX / dayWidth);
//     const endIndex = Math.min(startIndex + visibleDays - 1, totalDays - 1);

//     const startDate = new Date(today);
//     startDate.setDate(today.getDate() + (startIndex - 30));

//     const endDate = new Date(today);
//     endDate.setDate(today.getDate() + (endIndex - 30));

//     return { startDate, endDate };
//   }, [dayWidth, visibleDays, totalDays, today]);

//   const fetchProjectsForRange = useCallback(async (startDate: Date, endDate: Date) => {
//     setIsLoading(true);
//     await new Promise(resolve => setTimeout(resolve, 500));
//     try {
//       const overlappingProjects = dummyProjects.filter(project =>
//         project.startDate <= endDate && project.endDate >= startDate
//       );
//       setProjects(overlappingProjects);
//     } catch (err) {
//       console.error(err);
//       setProjects([]);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [dummyProjects]);

//   const generateDays = React.useCallback((centerIndex: number) => {
//     return Array.from({ length: totalDays }).map((_, i) => {
//       const date = new Date(today);
//       date.setDate(today.getDate() + (i - 30));
//       return {
//         day: date.getDate().toString(),
//         month: date.toLocaleString('en-US', { month: 'short' }),
//         isActive: i === centerIndex,
//         isToday: date.toDateString() === today.toDateString(),
//         fullDate: date,
//       };
//     });
//   }, [today, totalDays]);

//   const [weekDays, setWeekDays] = useState(() => generateDays(30));

//   // 使用 ref 來防止無限循環
//   const isScrollingSyncRef = useRef(false);

//   const updateScrollState = useCallback((scrollX: number) => {
//     const newIndex = Math.round(scrollX / dayWidth);
//     const newRange = calculateVisibleRange(scrollX);

//     if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalDays) {
//       setCurrentIndex(newIndex);
//       setWeekDays(generateDays(newIndex));
//     }

//     if (!visibleRange ||
//       newRange.startDate.getTime() !== visibleRange?.startDate?.getTime() ||
//       newRange.endDate.getTime() !== visibleRange?.endDate?.getTime()) {
//       setVisibleRange(newRange);
//       fetchProjectsForRange(newRange.startDate, newRange.endDate);
//     }
//   }, [currentIndex, visibleRange, fetchProjectsForRange, calculateVisibleRange, generateDays]);

//   const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
//     if (isScrollingSyncRef.current) return;
    
//     const scrollX = event.nativeEvent.contentOffset.x;
//     updateScrollState(scrollX);

//     // 同步底部滾動視圖
//     if (bottomScrollViewRef.current) {
//       isScrollingSyncRef.current = true;
//       bottomScrollViewRef.current.scrollTo({ x: scrollX, animated: false });
//       setTimeout(() => {
//         isScrollingSyncRef.current = false;
//       }, 50);
//     }
//   }, [updateScrollState]);

//   const handleBottomScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
//     if (isScrollingSyncRef.current) return;
    
//     const scrollX = event.nativeEvent.contentOffset.x;
//     updateScrollState(scrollX);
    
//     // 同步頂部滾動視圖
//     if (scrollViewRef.current) {
//       isScrollingSyncRef.current = true;
//       scrollViewRef.current.scrollTo({ x: scrollX, animated: false });
//       setTimeout(() => {
//         isScrollingSyncRef.current = false;
//       }, 50);
//     }
//   }, [updateScrollState]);

//   // 找到今天的位置並添加不會被遮蓋的直線
//   const todayDateIndex = weekDays.findIndex(day => day.isToday);
//   const todayLinePosition = todayDateIndex >= 0 ? todayDateIndex * dayWidth + (dayWidth / 2) : null;

//   useEffect(() => {
//     const initialRange = calculateVisibleRange(30 * dayWidth);
//     setVisibleRange(initialRange);
//     fetchProjectsForRange(initialRange.startDate, initialRange.endDate);
//   }, [fetchProjectsForRange, calculateVisibleRange]);

//   return (
//     <SafeAreaView className="flex-1 bg-[#F8C8C3]">
//       <View className="pt-6 pr-6 items-end">
//         <TouchableOpacity
//           onPress={() => router.push("/home")}
//           className="flex-row items-center bg-[#F29389] py-2 px-5 rounded-full"
//         >
//           <Text className="text-white font-semibold">Home</Text>
//           <Text className="text-white ml-1 text-lg">›</Text>
//         </TouchableOpacity>
//       </View>

//       <View className="px-8 flex-row gap-2 justify-between items-end my-6">
//         <View>
//           <Text className="text-3xl font-semibold text-[#5E1526]">Calendar</Text>
//           <Text className="text-lg text-[#5E1526] mt-2 font-medium">
//             Here&apos;s what your week
//           </Text>
//           <Text className="text-lg text-[#5E1526] font-medium">looks like.</Text>
//         </View>
//         <Image
//           source={require("../assets/images/liver.png")}
//           className="w-32 h-28"
//           style={{ resizeMode: "contain" }}
//         />
//       </View>

//       {/* 日期滾動區域 */}
//       <View className="relative">
//         <ScrollView
//           ref={scrollViewRef}
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           onScroll={handleScroll}
//           scrollEventThrottle={16}
//           snapToInterval={dayWidth}
//           snapToAlignment="start"
//           decelerationRate="fast"
//           className="mb-4 max-h-16"
//           contentOffset={{ x: 30 * dayWidth, y: 0 }}
//           style={{ width: dayWidth * visibleDays, zIndex: 10 }}
//         >
//           <View className="flex-row px-6 w-full items-center justify-center">
//             {weekDays.map((weekDay, index) => (
//               <View
//                 key={index}
//                 style={{ width: dayWidth }}
//                 className="flex items-center justify-center relative"
//               >
//                 <WeekDay {...weekDay} />
//               </View>
//             ))}
//           </View>
//         </ScrollView>

//         {/* 今天的直線 - 不會被遮蓋 */}
//         {todayLinePosition !== null && (
//           <View
//             style={{
//               position: 'absolute',
//               top: 48, // 從日期圓圈底部開始
//               left: todayLinePosition - 1,
//               width: 2,
//               height: 24, // 線的長度
//               backgroundColor: '#5E1526',
//               zIndex: 50, // 確保不被遮蓋
//             }}
//             pointerEvents="none"
//           />
//         )}
//       </View>

//       <View className="flex-1 bg-white rounded-t-3xl shadow-xl h-full">
//         <ScrollView
//           ref={bottomScrollViewRef}
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           onScroll={handleBottomScroll}
//           scrollEventThrottle={16}
//           snapToInterval={dayWidth}
//           snapToAlignment="start"
//           decelerationRate="fast"
//           contentOffset={{ x: 30 * dayWidth, y: 0 }}
//           className="flex-1"
//         >
//           <View style={{ width: dayWidth * totalDays }}>
//             <ScrollView
//               className="flex-1 pt-6 pb-4"
//               showsVerticalScrollIndicator
//               contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 20 }}
//             >
//               {isLoading ? (
//                 <View className="flex-1 justify-center items-center py-10">
//                   <Text className="text-gray-500">Loading projects...</Text>
//                 </View>
//               ) : visibleRange && projects.length > 0 ? (
//                 <CalendarItemRow
//                   visibleRange={visibleRange}
//                   projects={projects}
//                   dayWidth={dayWidth}
//                   todayPosition={isTodayVisible ? todayPosition : null}
//                 />
//               ) : (
//                 <View className="flex-1 justify-center items-center py-10">
//                   <Text className="text-gray-400 text-center">
//                     No projects found for the selected date range
//                   </Text>
//                 </View>
//               )}
//             </ScrollView>
//           </View>
//         </ScrollView>
//       </View>
//     </SafeAreaView>
//   );
// }
