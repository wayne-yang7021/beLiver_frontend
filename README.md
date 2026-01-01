# beLiver 🎯

**beLiver** is a comprehensive personal productivity and task management application built with React Native and Expo. It helps you organize your life, projects, and goals with a beautiful, intuitive interface.

## ✨ Key Features

### 🏠 Home Dashboard
*   **Daily Focus**: Get a clear view of your tasks for the day.
*   **Interactive Controls**: Quickly mark tasks as complete or edit details on the fly.
*   **Date Navigation**: Seamlessly switch between days to plan ahead or review past performance.
*   **Greetings**: Personalized welcome message to start your day right.

### 📅 Advanced Calendar
*   **Gantt-Style Timeline**: Visualize your projects over time with a horizontal scrolling Gantt chart.
*   **Infinite Scrolling**: Navigate endlessly into the past or future.
*   **Project Visibility**: Easily see which projects are active within specific date ranges.
*   **Quick Navigation**: Jump back to "Today" with a single tap.

### 🚀 Project & Milestone Management
*   **Structured Organization**: Break down big goals into Projects, Milestones, and actionable Tasks.
*   **Milestone Tracking**: View detailed milestone progress with visual circular progress indicators (Estimated vs. Actual hours).
*   **Task Management**: Add, edit, and delete tasks within milestones. set deadlines, and estimate effort.

### 🎨 Beautiful UI/UX
*   **Modern Design**: Built with a cohesive color palette (Salmon/Pink branding) and clean typography.
*   **Smooth Animations**: Engaging interactions using `react-native-reanimated`.
*   **Responsive**: Optimized for mobile devices.

## 🛠️ Tech Stack

*   **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
*   **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
*   **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native)
*   **State Management**: React Context (Session Management)
*   **Icons**: [Lucide React](https://lucide.dev/) & Expo Vector Icons
*   **Utilities**: `date-fns` for date manipulation.

## 🚀 Getting Started

### Prerequisites

*   Node.js (LTS recommended)
*   npm or yarn

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/your-username/beLiver_frontend.git
    cd beLiver_frontend
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Environment Configuration**

    The app expects a backend API. By default, it looks for `http://localhost:3000`.
    You can configure the API URL by setting the `EXPO_PUBLIC_API_URL` environment variable.

    Create a `.env` file in the root directory (optional):
    ```env
    EXPO_PUBLIC_API_URL=http://your-backend-api-url
    ```

4.  **Start the application**

    ```bash
    npx expo start
    ```

    *   Press `a` to open in Android Emulator
    *   Press `i` to open in iOS Simulator
    *   Press `w` to open in Web Browser
    *   Or scan the QR code with the Expo Go app on your physical device.

## 📂 Project Structure

```
beLiver_frontend/
├── app/                 # Expo Router screens and routes
│   ├── home.tsx         # Main dashboard
│   ├── calendar.tsx     # Calendar/Gantt view
│   ├── projects/        # Project routes
│   └── milestones/      # Milestone detail routes
├── components/          # Reusable UI components
│   ├── Notification.tsx # Notification system
│   └── ui/              # Base UI elements
├── context/             # React Context (Auth/Session)
├── assets/              # Images and static assets
└── ...config files      # Tailwind, TypeScript, Expo configs
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

*This project was built using Expo.*
