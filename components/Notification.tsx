import React, { useEffect, useState } from 'react';
import {
    Animated,
    Dimensions,
    GestureResponderEvent,
    PanResponder,
    PanResponderGestureState,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

// Types and Interfaces
interface NotificationData {
  projectId?: string;
  milestoneId?: string;
  action?: string;
  [key: string]: any;
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  icon: string;
  timestamp: string;
  read: boolean;
  data?: NotificationData;
}

interface NotificationCardProps {
  title?: string;
  message?: string;
  icon?: string;
  onDismiss?: () => void;
  onPress?: () => void;
}

interface NotificationManagerProps {
  userId?: string;
  apiEndpoint?: string;
  authToken?: string;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ 
  title = "BeLiver",
  message = "You should start the milestone 1 of the SAD project, or you will have 50% possibility to fail this class.",
  icon = "📚",
  onDismiss,
  onPress 
}) => {
  const [translateX] = useState<Animated.Value>(new Animated.Value(0));
  const [opacity] = useState<Animated.Value>(new Animated.Value(1));

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_: GestureResponderEvent, gestureState: PanResponderGestureState): boolean => {
      return Math.abs(gestureState.dx) > 20;
    },
    onPanResponderMove: (_: GestureResponderEvent, gestureState: PanResponderGestureState): void => {
      translateX.setValue(gestureState.dx);
    },
    onPanResponderRelease: (_: GestureResponderEvent, gestureState: PanResponderGestureState): void => {
      if (Math.abs(gestureState.dx) > width * 0.3) {
        // Dismiss notification if swiped far enough
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: gestureState.dx > 0 ? width : -width,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss && onDismiss());
      } else {
        // Snap back to center
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity 
        style={styles.notificationContent}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message} numberOfLines={3}>
            {message}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// API Service Class
class NotificationService {
  private apiEndpoint: string;
  private authToken: string;

  constructor(apiEndpoint: string, authToken: string) {
    this.apiEndpoint = apiEndpoint;
    this.authToken = authToken;
  }

  async fetchNotifications(): Promise<Notification[]> {
    try {
      const response = await fetch(`${this.apiEndpoint}/notifications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
      });
      
      if (response.ok) {
        const data: Notification[] = await response.json();
        return data;
      }
      throw new Error('Failed to fetch notifications');
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }
}

// Main component that handles notifications
const NotificationManager: React.FC<NotificationManagerProps> = ({
  userId = 'user123',
  apiEndpoint = 'YOUR_API_ENDPOINT',
  authToken = 'YOUR_TOKEN'
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationService] = useState<NotificationService>(
    new NotificationService(apiEndpoint, authToken)
  );

  // Fetch notifications from backend
  const fetchNotifications = async (): Promise<void> => {
    const data = await notificationService.fetchNotifications();
    setNotifications(data);
  };

  // Listen for push notifications
  useEffect(() => {
    fetchNotifications();
    
    // Set up periodic fetch or WebSocket connection
    const interval = setInterval(fetchNotifications, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = async (notificationId: string): Promise<void> => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
    
    // Mark as read on backend
    await notificationService.markAsRead(notificationId);
  };

  const handleNotificationPress = (notification: Notification): void => {
    // Handle notification tap - navigate to relevant screen
    console.log('Notification pressed:', notification);
    
    // Example navigation based on notification data
    if (notification.data?.action === 'open_project') {
      // navigation.navigate('Project', { projectId: notification.data.projectId });
      console.log('Navigate to project:', notification.data.projectId);
    } else if (notification.data?.action === 'view_deadline') {
      // navigation.navigate('Deadlines', { milestoneId: notification.data.milestoneId });
      console.log('Navigate to deadlines:', notification.data.milestoneId);
    }
    
    // Mark as read when pressed
    handleDismiss(notification.id);
  };

  return (
    <View style={styles.notificationManager}>
      {notifications.map((notification: Notification) => (
        <NotificationCard
          key={notification.id}
          title={notification.title}
          message={notification.message}
          icon={notification.icon}
          onDismiss={() => handleDismiss(notification.id)}
          onPress={() => handleNotificationPress(notification)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  notificationManager: {
    position: 'absolute',
    top: 100, // Adjust based on your status bar height
    left: 0,
    right: 0,
    zIndex: 1000,
  },
});

// Type definitions for external use
export { NotificationService };
export type { Notification, NotificationCardProps, NotificationData, NotificationManagerProps };
export default NotificationManager;