import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TaskProvider } from './contexts/TaskContext';
import { BuddyProvider } from './contexts/BuddyContext';
import { UserProvider } from './contexts/UserContext';
import { useTaskContext } from './contexts/TaskContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import AddTask from './pages/AddTask';
import Buddy from './pages/Buddy';
import Login from './pages/Login';

const AppWithProviders: React.FC = () => {
  const { tasks } = useTaskContext();

  return (
    <BuddyProvider userTasks={tasks}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Home />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/add" element={
          <ProtectedRoute>
            <Layout>
              <AddTask />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/buddy" element={
          <ProtectedRoute>
            <Layout>
              <Buddy />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BuddyProvider>
  );
};

export default function App() {
  return (
    <UserProvider>
      <TaskProvider>
        <Router>
          <AppWithProviders />
        </Router>
      </TaskProvider>
    </UserProvider>
  );
}
