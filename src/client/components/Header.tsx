import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow p-4 mb-6 flex justify-between items-center">
      <h1 className="text-xl font-bold text-blue-700">🎯 Procrastination Helper</h1>
      <nav className="space-x-4">
        <Link to="/" className="text-blue-600 hover:underline">
          Home
        </Link>
        <Link to="/add" className="text-blue-600 hover:underline">
          Add Task
        </Link>
      </nav>
    </header>
  );
};

export default Header;
