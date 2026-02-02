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
} from "lucide-react";

const TableCard = ({
  table,
  duration,
  hasReservation,
  isAdmin,
  onSelect,
  totalLabel,
}) => {
  return (
    <div
      onClick={() => {
        if (table.isMaintenance && !isAdmin) return;
        onSelect?.(table);
      }}
      className={`h-32 md:h-40 p-4 md:p-6 rounded-3xl cursor-pointer transition-all hover:scale-105 shadow-lg flex flex-col justify-between relative ${
        table.isMaintenance
          ? "bg-red-50 border-2 border-red-200 opacity-80"
          : table.status === "occupied"
            ? "bg-indigo-600 text-white"
            : "bg-white border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-400 hover:bg-indigo-50"
      }`}
    >
      {/* Maintenance Badge */}
      {table.isMaintenance && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-[2px] rounded-3xl z-10">
          <Construction size={24} className="text-red-500 mb-1" />
          <span className="text-xs font-black text-red-600 uppercase">
            Maintenance
          </span>
        </div>
      )}

      {/* Reservation Badge */}
      {hasReservation && !table.isMaintenance && (
        <div className="absolute -top-2 -right-2 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-yellow-200 shadow-sm flex items-center gap-1 z-20">
          <CalendarCheck size={10} /> Reserved
        </div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <span className="font-black text-xl md:text-2xl">{table.name}</span>
          <div className="flex gap-2 mt-1 opacity-70">
            <span className="text-[10px] flex items-center gap-1">
              <Users size={10} /> {table.capacity}
            </span>
            <span className="text-[10px] flex items-center gap-1">
              {table.area === "AC" ? (
                <Wind size={10} />
              ) : table.area === "Outdoor" ? (
                <Sun size={10} />
              ) : (
                <Armchair size={10} />
              )}
              {table.area}
            </span>
          </div>
        </div>
        {table.order?.isSentToKOT && (
          <div className="bg-white/20 p-1 rounded-lg">
            <Printer size={14} />
          </div>
        )}
      </div>

      {duration && (
        <div
          className={`self-start px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] md:text-xs font-bold ${duration.colorClass}`}
        >
          <Timer size={10} /> {duration.label}
        </div>
      )}

      {totalLabel && (
        <p className="text-lg md:text-xl font-black text-right">{totalLabel}</p>
      )}
    </div>
  );
};

export default TableCard;

