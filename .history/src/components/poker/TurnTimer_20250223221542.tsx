import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TurnTimerProps {
  isActive?: boolean;
  onTimeout?: () => void;
}

const TurnTimer: React.FC<TurnTimerProps> = ({ 
  isActive = true,
  onTimeout = () => {}
}) => {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, onTimeout]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="absolute -top-8 left-1/2 transform -translate-x-1/2"
    >
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center
        ${timeLeft > 10 ? 'bg-green-500' : timeLeft > 5 ? 'bg-yellow-500' : 'bg-red-500'}
        text-white text-sm font-bold
      `}>
        {timeLeft}
      </div>
    </motion.div>
  );
};

export default TurnTimer;