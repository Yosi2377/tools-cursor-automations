import React from 'react';

const TableFelt: React.FC = () => {
  return (
    <>
      {/* Navy blue outer border */}
      <div className="absolute inset-0 rounded-[200px] bg-[#1A1F2C]" />
      
      {/* Dark leather trim */}
      <div className="absolute inset-2 rounded-[190px] bg-[#141414]" />
      
      {/* Golden trim */}
      <div className="absolute inset-4 rounded-[180px] bg-[#FCD34D]" />
      
      {/* Green felt */}
      <div className="absolute inset-6 rounded-[170px] bg-[#059669] overflow-hidden">
        {/* Light gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_0%,transparent_60%)]" />
        
        {/* Felt texture */}
        <div 
          className="absolute inset-0 opacity-15 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }} 
        />
      </div>
    </>
  );
};

export default TableFelt;