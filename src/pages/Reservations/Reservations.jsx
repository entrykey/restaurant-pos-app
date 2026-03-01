import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Plus, Search, Filter, X, Phone, Users, Clock, Calendar, Check, Trash2, Edit2 } from 'lucide-react';
import ReservationCard from '../../components/ReservationCard';
import { reservationsService } from './ReservationsService';
import DatePicker from "../../components/ui/DatePicker";
import { toast } from 'react-hot-toast';
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { useTheme } from "../../context/ThemeContext";
import { ROUTE_ACCESS, ROUTE_ACCESS_MANAGE } from "../../config/permissionStructure";

const Reservations = ({
    hasPermissionFor,
}) => {
    const { user } = useAuth();
    const { activeBranchId } = useApp();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [reservations, setReservations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);

    useEffect(() => {
        if (!activeBranchId) return;
        fetchReservations();
    }, [filterDate, activeBranchId]);

    const fetchReservations = async () => {
        setIsLoading(true);
        try {
            const data = await reservationsService.getReservations({
                shopId: user?.shop_id || user?.shopId,
                branchId: activeBranchId,
                date: filterDate
            });
            setReservations(data);
        } catch (error) {
            toast.error("Failed to load reservations");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckInReservation = async (res) => {
        try {
            await reservationsService.updateReservationStatus(res._id, "SEATED");
            toast.success("Guest checked in");
            fetchReservations();
        } catch (error) {
            toast.error("Failed to check in guest");
        }
    };

    const handleEditReservation = (res) => {
        navigate(`/reservations/edit/${res._id}`);
    };

    const handleCancelReservation = async (id) => {
        if (!window.confirm("Are you sure you want to cancel this reservation?")) return;
        try {
            await reservationsService.deleteReservation(id);
            toast.success("Reservation cancelled");
            fetchReservations();
        } catch (error) {
            toast.error("Failed to cancel reservation");
        }
    };

    const reservationsAccess = ROUTE_ACCESS.RESERVATIONS;
    const canView = hasPermissionFor?.(reservationsAccess.module, reservationsAccess.resource, reservationsAccess.action);
    const reservationsManage = ROUTE_ACCESS_MANAGE.RESERVATIONS;
    const canCreate = hasPermissionFor?.(reservationsManage.module, reservationsManage.resource, reservationsManage.action);

    if (!canView) {
        return (
            <div className={`h-full flex items-center justify-center ${theme.sectionBg}`}>
                <div className={`text-center p-12 ${theme.cardBg} rounded-[40px] shadow-xl ${theme.sectionBorder} max-w-md`}>
                    <div className={`w-20 h-20 ${theme.sectionBg} ${theme.textPrimary} rounded-full flex items-center justify-center mx-auto mb-6`}>
                        <CalendarCheck size={40} className="text-red-500" />
                    </div>
                    <h2 className={`text-2xl font-black ${theme.textPrimary} mb-2`}>Access Restricted</h2>
                    <p className={`font-medium ${theme.textMuted}`}>You don't have permission to manage reservations. Contact your administrator for access.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`p-4 md:p-8 min-h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar flex flex-col ${theme.pageBg || theme.sectionBg}`}>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-3 ${theme.buttonBg || 'bg-indigo-600'} text-white rounded-2xl shadow-lg`}>
                            <CalendarCheck size={28} />
                        </div>
                        <h2 className={`text-2xl md:text-4xl font-black ${theme.textPrimary} tracking-tight`}>
                            Reservations
                        </h2>
                    </div>
                    <p className={`${theme.textMuted} font-bold flex items-center gap-2`}>
                        Book your tables and manage guest check-ins
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className={`${theme.cardBg} p-2 rounded-2xl shadow-md ${theme.sectionBorder} flex items-center gap-3`}>
                        <Calendar size={18} className="text-indigo-400 ml-2" />
                        <DatePicker
                            value={filterDate}
                            onChange={val => setFilterDate(val)}
                            className="w-40 border-none"
                        />
                    </div>

                    {canCreate && (
                        <button
                            onClick={() => navigate('/reservations/new')}
                            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={20} /> New Booking
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                    <div className="h-[60vh] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : reservations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                        {reservations.map(res => (
                            <ReservationCard
                                key={res._id}
                                reservation={res}
                                onCheckIn={handleCheckInReservation}
                                onEdit={handleEditReservation}
                                onCancel={handleCancelReservation}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                        <div className={`w-32 h-32 ${theme.cardBg} rounded-full flex items-center justify-center mb-6 shadow-xl ${theme.sectionBorder} border-4`}>
                            <CalendarCheck size={48} className={theme.textMuted} />
                        </div>
                        <h3 className={`text-2xl font-black ${theme.textPrimary} mb-2`}>No bookings for this date</h3>
                        <p className={`font-medium max-w-xs mx-auto ${theme.textMuted}`}>
                            Select another date or create a new reservation to get started.
                        </p>
                    </div>
                )}
            </div>


        </div>
    );
};

export default Reservations;
