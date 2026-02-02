import React from 'react';
import { Phone, Users, Calendar, Clock, CheckCircle, ExternalLink } from 'lucide-react';

const ReservationCard = ({ reservation, onCheckIn }) => {
    const getStatusStyles = (status) => {
        switch (status) {
            case 'Confirmed':
                return 'border-green-100 bg-green-50 text-green-700';
            case 'Checked-in':
                return 'border-gray-100 bg-gray-50 text-gray-500';
            case 'Pending':
                return 'border-orange-100 bg-orange-50 text-orange-700';
            default:
                return 'border-gray-100 bg-gray-50 text-gray-700';
        }
    };

    const statusColor = (status) => {
        switch (status) {
            case 'Confirmed': return 'bg-green-500';
            case 'Checked-in': return 'bg-gray-300';
            case 'Pending': return 'bg-orange-500';
            default: return 'bg-gray-400';
        }
    };

    return (
        <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 p-6 relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1">
            {/* Status indicator bar */}
            <div className={`absolute top-0 left-0 w-2 h-full ${statusColor(reservation.status)}`} />

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-black text-gray-800 tracking-tight mb-1">
                        {reservation.customerName}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
                        <Phone size={14} />
                        <span>{reservation.phone}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black text-indigo-600 leading-none mb-1">
                        {reservation.time}
                    </div>
                    <div className="text-[10px] font-black uppercase text-gray-300 tracking-widest">
                        {reservation.date}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <Users size={20} className="text-gray-400 mb-1" />
                    <span className="text-sm font-black text-gray-800">{reservation.guests} Guests</span>
                </div>
                <div className="bg-indigo-50/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase text-indigo-300 mb-1">Table</span>
                    <span className={`text-sm font-black ${reservation.tableId ? 'text-indigo-600' : 'text-orange-500 italic'}`}>
                        {reservation.tableId ? `Table ${reservation.tableId}` : 'Unassigned'}
                    </span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-dashed border-gray-100">
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(reservation.status)}`}>
                    {reservation.status}
                </div>

                {reservation.status === "Confirmed" && (
                    <button
                        onClick={() => onCheckIn(reservation)}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white text-sm font-black rounded-xl shadow-lg shadow-green-100 hover:bg-green-700 active:scale-95 transition-all"
                    >
                        Check In
                    </button>
                )}

                {reservation.status === "Checked-in" && (
                    <div className="flex items-center gap-1.5 text-gray-400 font-bold text-xs uppercase tracking-wider">
                        <CheckCircle size={16} className="text-green-500" />
                        Completed
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReservationCard;
