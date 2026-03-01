import React from 'react';
import { Phone, Users, Calendar, Clock, CheckCircle, ExternalLink, Edit2, Trash2, XCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ReservationCard = ({ reservation, onCheckIn, onEdit, onCancel }) => {
    const { theme } = useTheme();
    const getStatusStyles = (status) => {
        switch (status) {
            case 'Confirmed':
                return 'border-green-100 bg-green-500/20 text-green-500';
            case 'Checked-in':
            case 'SEATED':
            case 'COMPLETED':
                return `border ${theme.sectionBorder} ${theme.cardBg} ${theme.textPrimary}`;
            case 'Pending':
                return 'border-orange-100 bg-orange-500/20 text-orange-500';
            default:
                return `border ${theme.sectionBorder} ${theme.cardBg} ${theme.textMuted}`;
        }
    };

    const statusColor = (status) => {
        switch (status) {
            case 'CONFIRMED': return 'bg-green-500';
            case 'SEATED': return 'bg-gray-300';
            case 'PENDING': return 'bg-orange-500';
            case 'CANCELLED': return 'bg-red-500';
            default: return 'bg-gray-400';
        }
    };

    const isRemovable = !['CANCELLED', 'SEATED', 'COMPLETED'].includes(reservation.status);
    const isEditable = !['CANCELLED', 'COMPLETED'].includes(reservation.status);

    // Format the date/time from the backend
    const resDateObj = new Date(reservation.reservationTime);
    const displayTime = resDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const displayDate = resDateObj.toLocaleDateString();

    return (
        <div className={`${theme.cardBg} rounded-[32px] shadow-xl border ${theme.sectionBorder} p-6 relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1`}>
            {/* Status indicator bar */}
            <div className={`absolute top-0 left-0 w-2 h-full ${statusColor(reservation.status)}`} />

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className={`text-xl font-black ${theme.textPrimary} tracking-tight mb-1`}>
                        {reservation.customerId?.name || 'Unknown Guest'}
                    </h3>
                    <div className={`flex items-center gap-2 ${theme.textMuted} font-bold text-sm`}>
                        <Phone size={14} />
                        <span>{reservation.customerId?.phone || 'No Phone'}</span>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className="flex gap-2 mb-2">
                        {isEditable && (
                            <button
                                onClick={() => onEdit(reservation)}
                                className={`p-2 ${theme.sectionBg} rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-indigo-500 transition-colors shadow-sm`}
                                title="Edit Reservation"
                            >
                                <Edit2 size={16} />
                            </button>
                        )}
                        {isRemovable && (
                            <button
                                onClick={() => onCancel(reservation._id)}
                                className={`p-2 ${theme.sectionBg} rounded-xl hover:bg-red-50 dark:hover:bg-red-900/40 text-red-500 transition-colors shadow-sm`}
                                title="Cancel Reservation"
                            >
                                <XCircle size={16} />
                            </button>
                        )}
                    </div>
                    <div className="text-2xl font-black text-indigo-500 leading-none mb-1">
                        {displayTime}
                    </div>
                    <div className={`text-[10px] font-black uppercase ${theme.textMuted} tracking-widest`}>
                        {displayDate}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={`${theme.sectionBg} rounded-2xl p-4 flex flex-col items-center justify-center text-center`}>
                    <Users size={20} className={`${theme.textMuted} mb-1`} />
                    <span className={`text-sm font-black ${theme.textPrimary}`}>{reservation.guestCount || reservation.guests} Guests</span>
                </div>
                <div className={`${theme.sectionBg} rounded-2xl p-4 flex flex-col items-center justify-center text-center`}>
                    <span className={`text-[10px] font-black uppercase ${theme.textMuted} mb-1`}>Table</span>
                    <span className={`text-sm font-black ${reservation.tableId ? 'text-indigo-500' : 'text-orange-500 italic'}`}>
                        {reservation.tableId ? `Table ${reservation.tableId.tableNumber || reservation.tableId}` : 'Unassigned'}
                    </span>
                </div>
            </div>

            <div className={`flex items-center justify-between pt-4 border-t border-dashed ${theme.sectionBorder}`}>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(reservation.status)}`}>
                    {reservation.status}
                </div>

                {reservation.status === "CONFIRMED" && (
                    <button
                        onClick={() => onCheckIn(reservation)}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white text-sm font-black rounded-xl shadow-lg shadow-green-100 hover:bg-green-700 active:scale-95 transition-all"
                    >
                        Check In
                    </button>
                )}

                {(reservation.status === "SEATED" || reservation.status === "COMPLETED") && (
                    <div className="flex items-center gap-1.5 text-gray-400 font-bold text-xs uppercase tracking-wider">
                        <CheckCircle size={16} className="text-green-500" />
                        Seated
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReservationCard;
