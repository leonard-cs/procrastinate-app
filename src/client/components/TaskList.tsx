import React from 'react';
import { Task } from '../types/Task';
import TaskItem from './TaskItem';

interface TaskListProps {
    tasks: Task[];
    onComplete: (id: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onComplete }) => {
    if (tasks.length === 0) {
      return (
        <div className="text-center py-16">
          <div className="text-8xl mb-6">🍽️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks yet</h3>
          <p className="text-gray-500 mb-6">Add your first task to get started</p>
          <div className="bg-blue-50 rounded-lg p-4 mx-4">
            <p className="text-blue-800 text-sm">💡 Tip: Use the ❤️ button below to add a new task!</p>
          </div>
        </div>
      );
    }
  
    return (
      <div className="space-y-0">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} toggleComplete={onComplete} />
        ))}
      </div>
    );
  };

export default TaskList;