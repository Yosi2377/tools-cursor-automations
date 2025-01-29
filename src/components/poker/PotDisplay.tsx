import React from 'react';
import { DollarSign } from 'lucide-react';

interface PotDisplayProps {
  amount: number;
}

const PotDisplay: React.FC<PotDisplayProps> = ({ amount }) => {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm px-6 py-3 rounded-full border border-poker-accent/30">
      <div className="flex items-center gap-2 text-poker-accent">
        <DollarSign className="w-5 h-5" />
        <span className="font-bold text-xl">{amount}</span>
      </div>
    </div>
  );
};

export default PotDisplay;