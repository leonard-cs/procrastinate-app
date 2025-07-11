import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskContext } from '../contexts/TaskContext';
import AddTaskForm from '../components/AddTaskForm';
import { Task } from '../types/Task';

const AddTask: React.FC = () => {
  const navigate = useNavigate();
  const { addTask } = useTaskContext();

  const handleAdd = (task: Task) => {
    addTask(task);
    navigate('/');
  };

  return (
    <main className="max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-3xl">⊕</div>
          <h1 className="text-2xl font-bold text-gray-900">Add new task!</h1>
        </div>
      </div>
      
      {/* Form */}
      <div className="px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <AddTaskForm onAdd={handleAdd} />
        </div>
      </div>
    </main>
  );
};

export default AddTask;
