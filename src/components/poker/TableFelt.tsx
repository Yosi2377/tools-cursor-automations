const TableFelt = () => {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#0d4a2c] to-[#0a3720] rounded-xl shadow-2xl">
      {/* Table border */}
      <div className="absolute inset-2 border-4 border-[#8B4513] rounded-lg overflow-hidden">
        {/* Table felt */}
        <div className="absolute inset-0 bg-[#0d4a2c]">
          {/* Table pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableFelt;