import React, { useState, useEffect } from 'react';
import ModalPortal from '../components/ModalPortal';
import { Task } from '../types/Task';

interface TaskEditModalProps {
  task: Task | null;
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({ task, onClose, onSave, onDelete }) => {
  const [name, setName] = useState('');
  const [effort, setEffort] = useState<'light' | 'medium' | 'heavy'>('light');
  const [dueDate, setDueDate] = useState<string>(''); // ISO date string
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(3);
  const [isDeleteEnabled, setIsDeleteEnabled] = useState(false);

  useEffect(() => {
    if (task) {
      setName(task.name);
      setEffort(task.effort);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().substring(0, 10) : '');

      // Reset delete confirmation state when task changes
      setShowConfirmDelete(false);
      setDeleteCountdown(3);
      setIsDeleteEnabled(false);
    }
  }, [task]);

  if (!task) return null;

  useEffect(() => {
    if (!showConfirmDelete) return;

    if (deleteCountdown > 0) {
      const timer = setTimeout(() => {
        setDeleteCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Only enable delete when countdown hits 0
    setIsDeleteEnabled(true);
  }, [showConfirmDelete, deleteCountdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedTask: Task = {
      ...task,
      name,
      effort,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    };

    onSave(updatedTask);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
        <div className="bg-white rounded-lg p-6 w-96">
          <h2 className="text-xl font-semibold mb-4">Edit Task</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col">
              Name
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="border rounded px-2 py-1"
              />
            </label>

            <label className="flex flex-col">
              Effort
              <select
                value={effort}
                onChange={e => setEffort(e.target.value as 'light' | 'medium' | 'heavy')}
                className="border rounded px-2 py-1"
              >
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="heavy">Heavy</option>
              </select>
            </label>

            <label className="flex flex-col">
              Due Date
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="border rounded px-2 py-1"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                setShowConfirmDelete(true);
                setDeleteCountdown(3);
                setIsDeleteEnabled(false);
              }}
              className="w-full border border-red-600 text-red-600 hover:bg-red-50 font-medium rounded px-3 py-2 text-sm transition-colors"
            >
              🗑️ Delete Task
            </button>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </form>
          {showConfirmDelete && (
            <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg p-6 w-80 shadow-lg">
                <h3 className="text-lg font-semibold mb-3 text-red-600">Confirm Deletion</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Are you sure you want to delete this task? This action cannot be undone.
                </p>

                <div className="flex justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
                    onClick={() => setShowConfirmDelete(false)}
                  >
                    Cancel
                  </button>

                  <button
                    disabled={!isDeleteEnabled}
                    className={`px-4 py-2 rounded text-white text-sm ${
                      isDeleteEnabled
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-red-300 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      onDelete(task.id);
                      setShowConfirmDelete(false);
                      onClose();
                    }}
                  >
                    {isDeleteEnabled ? 'Delete' : `Wait (${deleteCountdown}s)`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};

export default TaskEditModal;
