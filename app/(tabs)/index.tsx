import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Type definitions
type WeekDayProps = {
  day: string;
  isActive: boolean;
};

type CalendarItemProps = {
  title: string;
  date: string;
  colorClass: string;
};

// Liver SVG Component
const LiverIcon: React.FC = () => (
  <Svg width="120" height="120" viewBox="0 0 120 120">
    <Path
      d="M60 30C70 25 85 30 95 40C105 50 110 70 100 90C90 110 60 115 40 105C20 95 20 70 30 55C40 40 50 35 60 30Z"
      fill="#E6B8D6"
    />
    <Path
      d="M85 45C90 45 95 50 95 60C95 70 85 75 80 70C75 65 80 45 85 45Z"
      fill="#D8A6C6"
    />
  </Svg>
);

// Calendar Item Component
const CalendarItem: React.FC<CalendarItemProps> = ({ title, date, colorClass }) => (
  <View className={`${colorClass} rounded-xl p-4 mb-5 max-w-[80%]`}>
    <Text className="text-white font-bold text-base">{title}</Text>
    <Text className="text-white text-xs mt-1">{date}</Text>
  </View>
);

// Week Day Component
const WeekDay: React.FC<WeekDayProps> = ({ day, isActive }) => (
  <View className="items-center w-9">
    <Text className="text-xs text-gray-800 mb-1">Apr</Text>
    <View className={`${isActive ? 'bg-red-300' : 'bg-transparent'} w-9 h-9 rounded-full justify-center items-center`}>
      <Text className={`${isActive ? 'text-white' : 'text-gray-800'} text-base`}>{day}</Text>
    </View>
  </View>
);

// Calendar Event type
type CalendarEvent = {
  id: string;
  title: string;
  dateRange: string;
  colorClass: string;
};

const Calendar: React.FC = () => {
  // Sample calendar events data
  const events: CalendarEvent[] = [
    {
      id: '1',
      title: 'English Oral Presentation',
      dateRange: '2025.04.09 - 2025.04.30',
      colorClass: 'bg-red-900'
    },
    {
      id: '2',
      title: 'AI Hackathon',
      dateRange: '2025.04.09 - 2025.04.30',
      colorClass: 'bg-red-300'
    },
    {
      id: '3',
      title: 'GRE Test',
      dateRange: '2025.04.09 - 2025.04.30',
      colorClass: 'bg-red-950'
    },
    {
      id: '4',
      title: 'ML Final Project',
      dateRange: '2025.04.09 - 2025.04.30',
      colorClass: 'bg-red-600'
    }
  ];

  // Array of days to display in the week view
  const weekDays: { day: string; isActive: boolean }[] = [
    { day: '19', isActive: false },
    { day: '20', isActive: true },
    { day: '21', isActive: false },
    { day: '22', isActive: false },
    { day: '23', isActive: false },
    { day: '24', isActive: false },
    { day: '25', isActive: false },
  ];

  return (
    <View className="flex-1 bg-red-100">
      {/* Header */}
      <View className="pt-12 pr-4 items-end">
        <TouchableOpacity className="flex-row items-center bg-red-300 py-2 px-5 rounded-full">
          <Text className="text-white font-semibold">Home</Text>
          <Text className="text-white ml-1 text-lg">›</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar Title */}
      <View className="px-8 pt-4 pb-6">
        <Text className="text-2xl font-bold text-gray-800">Calendar</Text>
        <Text className="text-base text-gray-800 opacity-80 mt-1.5">Here&#39;s what your week looks like.</Text>
        <View className="absolute right-5 top-0">
          <LiverIcon />
        </View>
      </View>

      {/* Week Day Selector */}
      <View className="flex-row justify-between px-4 mb-2.5">
        {weekDays.map((weekDay, index) => (
          <WeekDay 
            key={index} 
            day={weekDay.day} 
            isActive={weekDay.isActive} 
          />
        ))}
      </View>

      {/* Timeline */}
      <View className="flex-1 pt-2.5 relative">
        {/* Timeline Line */}
        <View className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-red-300" />
        
        {/* Calendar Items */}
        <View className="px-8">
          {events.map((event) => (
            <CalendarItem 
              key={event.id}
              title={event.title}
              date={event.dateRange}
              colorClass={event.colorClass}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

export default Calendar;