import React from 'react';
import cn from 'classnames';

const PlayerSpot = ({ player }) => {
  return (
    <div
      className={cn(
        "relative w-36 h-36 rounded-full flex flex-col items-center justify-center",
        "bg-gradient-to-b from-slate-900/95 to-slate-800/95",
        "border-[3px] transition-all duration-300",
        player.isActive ? "border-emerald-500" : "border-gray-700",
        player.isTurn ? "ring-4 ring-amber-400/50" : ""
      )}
    >
      {/* Rest of the component content */}
    </div>
  );
};

export default PlayerSpot; 