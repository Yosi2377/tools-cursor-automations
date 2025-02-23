import React from 'react';

const PlayerSpot = ({ player }) => {
  return (
    <div
      className={`relative w-36 h-36 rounded-full flex flex-col items-center justify-center ${player.isActive ? 'border-emerald-500' : 'border-gray-700'} ${player.isTurn ? 'ring-4 ring-amber-400/50' : ''}`}
    >
      {/* Rest of the component content */}
    </div>
  );
};

export default PlayerSpot; 