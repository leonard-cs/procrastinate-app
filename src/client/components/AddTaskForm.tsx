import React, { useState } from 'react';
import { Task, EffortLevel } from '../types/Task';
import { useUserContext } from '../contexts/UserContext';

interface AddTaskFormProps {
  onAdd: (task: Task) => void;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAdd }) => {
  const user = useUserContext();
  const [name, setName] = useState('');
  const [effort, setEffort] = useState<EffortLevel>('medium');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      userId: user?.uid || '',
      name,
      effort,
      createdAt: new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      completed: false,
      isPoked: false,
    };

    onAdd(newTask);
    setName('');
    setEffort('medium');
    setDueDate('');
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Task Name
        </label>
        <input
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          type="text"
          placeholder="Enter a task..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Effort Level
        </label>
        <select
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={effort}
          onChange={(e) => setEffort(e.target.value as EffortLevel)}
        >
          <option value="light">🟢 Light effort</option>
          <option value="medium">🟡 Medium effort</option>
          <option value="heavy">🔴 Heavy effort</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Due Date (Optional)
        </label>
        <input
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          type="date"
          value={dueDate}
          min={today}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Add Task
      </button>
    </form>
  );
};

export default AddTaskForm;

