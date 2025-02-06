import React from 'react';
import { DollarSign } from 'lucide-react';

interface PotDisplayProps {
  pot: number;
  rake?: number;
}

const PotDisplay: React.FC<PotDisplayProps> = ({ pot, rake = 0 }) => {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm px-6 py-3 rounded-full border border-poker-accent/30">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 text-poker-accent">
          <DollarSign className="w-5 h-5" />
          <span className="font-bold text-xl">{pot}</span>
        </div>
        {rake > 0 && (
          <div className="text-xs text-poker-accent/60">
            Rake: ${rake}
          </div>
        )}
      </div>
    </div>
  );
};

export default PotDisplay;