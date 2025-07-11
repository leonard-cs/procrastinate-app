import React, { useEffect, useState } from 'react';

interface TimerProps {
  duration?: number; // in seconds (default to 600)
  onFinish?: () => void;
}

const Timer: React.FC<TimerProps> = ({ duration = 600, onFinish }) => {
  const [secondsLeft, setSecondsLeft] = useState(duration);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onFinish) onFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onFinish]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="text-center mt-4">
      <p className="text-2xl font-mono">
        ⏳ {minutes.toString().padStart(2, '0')}:
        {seconds.toString().padStart(2, '0')}
      </p>
      <p className="text-sm text-gray-500">Stay focused… you're doing great!</p>
    </div>
  );
};

export default Timer;
