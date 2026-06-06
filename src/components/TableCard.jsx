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
  Check,
  UserCheck,
  XCircle,
  CalendarX
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../auth/usePermission";

const TableCard = ({
  table,
  duration,
  hasReservation,
  isAdmin,
  onSelect,
  totalLabel,
  onMarkArrived,
  onCancelReservation
}) => {
  const { theme, themeName } = useTheme();
  const { canModule } = usePermission();

  const handleAction = (e, callback) => {
    e.stopPropagation();
    callback?.(hasReservation);
  };

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
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-lg border ${table.status === 'occupied' 
              ? 'bg-white/10 border-white/20 text-white' 
              : (themeName === 'dark' ? 'bg-indigo-900/40 border-indigo-800/50 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-600')
            }`}>
               {table.diningCategoryId?.name || 'Area'}
            </span>
            <span className={`text-[10px] md:text-xs font-bold flex items-center gap-1 ${table.status === 'occupied' ? 'bg-white/20 text-white' : `${theme.sidebarItemHoverBg} ${theme.textSecondary}`} px-2 py-0.5 rounded-full`}>
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

      {/* Middle: Status Badges & Reservation Actions */}
      <div className="flex-1 flex flex-col gap-2 mt-2">
        <div className="flex flex-wrap items-center gap-2">
          {table.order?.kotStatus === 'preparing' && (
            <div className="bg-orange-400 text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md animate-pulse border border-orange-500/20">
              <div className="w-1 h-1 bg-white rounded-full animate-ping" />
              Preparing
            </div>
          )}

          {table.order?.kotStatus === 'ready' && (
            <div className="bg-green-400 text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md animate-bounce border border-green-500/20">
              <div className="w-1 h-1 bg-white rounded-full" />
              Ready
            </div>
          )}

          {table.order?.kotStatus === 'served' && (
            <div className="bg-blue-500 text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md border border-blue-600/20">
              <Check size={10} />
              Served
            </div>
          )}

          {duration && (
            <div className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[9px] font-black uppercase tracking-tight bg-white/20 text-white border border-white/10 shadow-sm`}>
              <Timer size={12} /> {duration.label}
            </div>
          )}
        </div>

        {table.status === "occupied" && table.order && (() => {
          const staffName = (() => {
            const managed = table.order.managedBy;
            const created = table.order.createdBy;
            if (typeof managed === "object" && managed !== null) {
              return managed.name || managed.username;
            }
            if (typeof created === "object" && created !== null) {
              return created.name || created.username;
            }
            return null;
          })();
          if (!staffName) return null;
          return (
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-white/75 truncate">
              <UserCheck size={10} className="shrink-0 text-white/50" />
              <span className="text-white/45 uppercase tracking-wider">Managed by</span>
              <span className="text-white/90 truncate">{staffName}</span>
            </div>
          );
        })()}

        {hasReservation && !table.isMaintenance && (
          <div className="flex flex-col gap-2 mt-1">
            <div className="bg-yellow-400 text-yellow-900 self-start px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm border border-yellow-500/20">
              <CalendarCheck size={12} /> {hasReservation.time || 'Reserved'}
            </div>
            
            {/* Arrived and Cancel Buttons */}
            {table.status !== 'occupied' && (
              <div className="flex gap-2">
                <button 
                  onClick={(e) => handleAction(e, onMarkArrived)}
                  className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-xl shadow-lg transition-all active:scale-90 flex items-center gap-1 font-black text-[9px] uppercase"
                  title="Guest Arrived"
                >
                  <UserCheck size={14} /> Arrived
                </button>
                
                {canModule('reservation') && (
                  <button 
                    onClick={(e) => handleAction(e, onCancelReservation)}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl shadow-lg transition-all active:scale-90 flex items-center gap-1 font-black text-[9px] uppercase"
                    title="Cancel Reservation"
                  >
                    <CalendarX size={14} /> Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: Total */}
      <div className="flex justify-end items-end mt-2 gap-2">
        {totalLabel && (
          <div className="text-right flex flex-col items-end ml-auto">
            <span className="text-[10px] font-bold uppercase opacity-60 leading-none mb-1">Total Amount</span>
            <span className="text-xl md:text-3xl font-black tracking-tighter leading-none whitespace-nowrap">
              {totalLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableCard;


