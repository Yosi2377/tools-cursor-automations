import React from 'react';

const TableFelt = () => {
  return (
    <div className="absolute inset-0 rounded-[200px] overflow-hidden">
      {/* Table border */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#4a3f35] to-[#2d261f]">
        {/* Inner padding */}
        <div className="absolute inset-4 rounded-[180px] bg-gradient-to-b from-[#234e52] to-[#1a373a]">
          {/* Felt texture */}
          <div className="absolute inset-2 rounded-[170px] bg-[#277148] shadow-inner">
            {/* Table pattern */}
            <div className="absolute inset-0 opacity-30"
                 style={{
                   backgroundImage: `radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.2) 100%)`,
                   backgroundSize: '100% 100%'
                 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableFelt;