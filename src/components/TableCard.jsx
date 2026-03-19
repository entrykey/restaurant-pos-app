import React from "react";
import {
  Armchair,
  CalendarCheck,
  Construction,
  Printer,
  Sun,
  Timer,
  Users,
  Wind,
  Check
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const TableCard = ({
  table,
  duration,
  hasReservation,
  isAdmin,
  onSelect,
  totalLabel,
}) => {
  const { theme, themeName } = useTheme();
  return (
    <div
      onClick={() => {
        if (table.isMaintenance && !isAdmin) return;
        onSelect?.(table);
      }}
      className={`min-h-[140px] md:min-h-[160px] p-5 rounded-[32px] cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg flex flex-col relative group ${table.isMaintenance
        ? (themeName === 'dark' ? "bg-red-900/20 border-2 border-red-800/50" : "bg-red-50 border-2 border-red-200")
        : table.status === "occupied"
          ? "bg-indigo-600 text-white"
          : `${theme.surfaceBg} border-2 border-dashed ${theme.borderLight} ${theme.textMuted} hover:border-indigo-400 ${theme.sidebarItemHoverBg}`
        } ${table.isSelected ? "ring-4 ring-indigo-400 ring-offset-4" : ""}`}
    >
      {/* Selection Checkbox */}
      {table.isSelectionMode && (
        <div className={`absolute top-4 left-4 w-6 h-6 rounded-full border-2 flex items-center justify-center z-30 transition-all ${table.isSelected 
          ? (table.status === 'occupied' ? "bg-white border-white" : "bg-indigo-600 border-indigo-600") 
          : "bg-white/10 border-white/30"
          }`}>
          {table.isSelected && <div className={`${table.status === 'occupied' ? 'bg-indigo-600' : 'bg-white'} w-2.5 h-2.5 rounded-full`} />}
        </div>
      )}

      {/* Maintenance Overlay */}
      {table.isMaintenance && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center ${themeName === 'dark' ? 'bg-gray-900/60' : 'bg-white/60'} backdrop-blur-[2px] rounded-[32px] z-10`}>
          <Construction size={28} className="text-red-500 mb-2" />
          <span className={`text-xs font-black ${themeName === 'dark' ? 'text-red-400' : 'text-red-600'} uppercase tracking-widest`}>
            Maintenance
          </span>
        </div>
      )}

      {/* Header: Name and Capacity */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <span className={`font-black text-2xl md:text-3xl leading-tight tracking-tight ${table.status === 'occupied' ? 'text-white' : theme.textHeading}`}>
            {table.name}
          </span>
          <div className="flex items-center gap-2 mt-1 opacity-80">
            <span className="text-[10px] md:text-xs font-bold flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
              <Users size={12} /> {table.capacity}
            </span>
            {table.isParent && <span className="text-[10px] font-black uppercase bg-white/30 px-2 py-0.5 rounded-full">Master</span>}
            {table.parentTableId && <span className="text-[10px] font-black uppercase bg-white/30 px-2 py-0.5 rounded-full">Joined</span>}
            {table.isCombined && <span className="text-[10px] font-black uppercase bg-white/30 px-2 py-0.5 rounded-full">Merged</span>}
          </div>
        </div>

        {table.status === "occupied" && (
          <div className="bg-white/20 p-2 rounded-2xl backdrop-blur-sm">
            <Printer size={18} className="opacity-90" />
          </div>
        )}
      </div>

      {/* Middle: Status Badges */}
      <div className="flex-1 flex flex-col gap-2 mt-2">
        {hasReservation && !table.isMaintenance && (
          <div className="bg-yellow-400 text-yellow-900 self-start px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm border border-yellow-500/20">
            <CalendarCheck size={12} /> Reserved
          </div>
        )}

        {table.order?.kotStatus === 'preparing' && (
          <div className="bg-orange-400 text-white self-start px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-orange-500/20 animate-pulse border border-orange-500/20">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            Preparing...
          </div>
        )}

        {table.order?.kotStatus === 'ready' && (
          <div className="bg-green-400 text-white self-start px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-green-500/20 animate-bounce border border-green-500/20">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
            Ready to Serve
          </div>
        )}

        {table.order?.kotStatus === 'served' && (
          <div className="bg-blue-500 text-white self-start px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-blue-500/20 border border-blue-600/20">
            <Check size={12} />
            Food Served
          </div>
        )}
      </div>

      {/* Footer: Time and Total */}
      <div className="flex justify-between items-end mt-4">
        <div>
          {duration && (
            <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] md:text-xs font-black uppercase tracking-tight ${duration.colorClass.replace('bg-', 'bg-patch-').includes('text-white') ? duration.colorClass : 'bg-white/20 text-white'}`}>
              <Timer size={14} /> {duration.label}
            </div>
          )}
        </div>

        {totalLabel && (
          <div className="text-right flex flex-col">
            <span className="text-[10px] font-bold uppercase opacity-60 leading-none mb-1">Total</span>
            <span className="text-xl md:text-3xl font-black tracking-tighter leading-none">{totalLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableCard;

