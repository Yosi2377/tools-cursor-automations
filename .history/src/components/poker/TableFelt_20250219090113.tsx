import React from 'react';

const TableFelt = () => {
  return (
    <div className="absolute inset-0 rounded-[100px] sm:rounded-[120px] md:rounded-[150px] overflow-hidden">
      {/* Outer glow effect */}
      <div className="absolute -inset-4 bg-blue-500/20 blur-xl" />
      
      {/* Table border with enhanced gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#654321] via-[#8B4513] to-[#4a3f35] shadow-2xl">
        {/* Inner padding with metallic effect */}
        <div className="absolute inset-2 sm:inset-3 rounded-[90px] sm:rounded-[110px] md:rounded-[140px] bg-gradient-to-b from-[#2d4f56] via-[#1e3d42] to-[#162e32] border border-[#8B4513]/30">
          {/* Felt texture with enhanced green */}
          <div className="absolute inset-2 rounded-[80px] sm:rounded-[100px] md:rounded-[130px] bg-gradient-to-b from-[#1b4d31] via-[#277148] to-[#1b4d31] shadow-inner">
            {/* Table pattern with improved lighting */}
            <div className="absolute inset-0"
                 style={{
                   background: `
                     radial-gradient(circle at 30% 20%, rgba(255,255,255,0.1) 0%, transparent 50%),
                     radial-gradient(circle at 70% 20%, rgba(255,255,255,0.05) 0%, transparent 40%),
                     radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.2) 90%)
                   `,
                   backgroundBlendMode: 'overlay'
                 }}
            />
            
            {/* Dynamic lighting effect */}
            <div className="absolute inset-0 opacity-30"
                 style={{
                   background: `
                     linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.05) 50%, transparent 55%),
                     linear-gradient(-45deg, transparent 40%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.05) 50%, transparent 55%)
                   `
                 }}
            />
            
            {/* Subtle texture overlay */}
            <div className="absolute inset-0 opacity-10"
                 style={{
                   backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E")`,
                   backgroundRepeat: 'repeat',
                   backgroundSize: '100px 100px'
                 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableFelt;