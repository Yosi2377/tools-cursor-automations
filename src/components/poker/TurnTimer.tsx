import React, { useEffect, useState } from 'react';
import { Progress } from "@/components/ui/progress";

interface TurnTimerProps {
  isActive: boolean;
  onTimeout: () => void;
  duration?: number;
}

const TurnTimer: React.FC<TurnTimerProps> = ({ 
  isActive, 
  onTimeout,
  duration = 30 
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const progress = (timeLeft / duration) * 100;

  useEffect(() => {
    if (isActive) {
      setTimeLeft(duration);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isActive, duration, onTimeout]);

  if (!isActive) return null;

  return (
    <div className="w-32 space-y-2">
      <Progress 
        value={progress} 
        className="h-2 bg-poker-accent/20"
        indicatorClassName={
          timeLeft <= 5 
            ? 'animate-pulse bg-red-500' 
            : timeLeft <= 10 
              ? 'bg-yellow-500' 
              : 'bg-poker-accent'
        }
      />
      <p className="text-sm text-poker-accent font-mono">
        {timeLeft}s
      </p>
    </div>
  );
};

export default TurnTimer;