import React, { useState, useEffect } from 'react';
import { CalendarCheck, Plus, Search, Filter, X, Phone, Users, Clock, Calendar, Check, Trash2 } from 'lucide-react';
import ReservationCard from '../../components/ReservationCard';
import { reservationsService } from './ReservationsService';

const Reservations = ({
    reservations,
    setReservations,
    handleCheckInReservation,
    hasPermission
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRes, setNewRes] = useState({
        customerName: "",
        phone: "",
        date: new Date().toISOString().split("T")[0],
        time: "",
        guests: 2,
        tableId: "",
    });
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);

    const handleAddRes = () => {
        if (newRes.customerName && newRes.phone && newRes.time) {
            const tableId = newRes.tableId ? parseInt(newRes.tableId) : null;
            const resToAdd = { ...newRes, id: Date.now(), tableId, status: "Confirmed" };

            setReservations([...reservations, resToAdd]);
            setIsModalOpen(false);
            setNewRes({
                customerName: "",
                phone: "",
                date: new Date().toISOString().split("T")[0],
                time: "",
                guests: 2,
                tableId: "",
            });
        }
    };

    const filteredReservations = reservations.filter(res => res.date === filterDate);

    if (!hasPermission("MANAGE_RESERVATIONS")) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center p-12 bg-white rounded-[40px] shadow-xl border max-w-md">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CalendarCheck size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Access Restricted</h2>
                    <p className="text-gray-500 font-medium">You don't have permission to manage reservations. Contact your administrator for access.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-gray-50/50">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                            <CalendarCheck size={28} />
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-gray-800 tracking-tight">
                            Reservations
                        </h2>
                    </div>
                    <p className="text-gray-500 font-bold flex items-center gap-2">
                        Book your tables and manage guest check-ins
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="bg-white p-2 rounded-2xl shadow-md border flex items-center gap-3">
                        <Calendar size={18} className="text-indigo-400 ml-2" />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-transparent font-black text-sm outline-none border-none pr-4"
                        />
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={20} /> New Booking
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {filteredReservations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                        {filteredReservations.map((res) => (
                            <ReservationCard
                                key={res.id}
                                reservation={res}
                                onCheckIn={handleCheckInReservation}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl border-4 border-gray-50">
                            <CalendarCheck size={48} className="text-gray-200" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 mb-2">No bookings for this date</h3>
                        <p className="text-gray-400 font-medium max-w-xs mx-auto">
                            Select another date or create a new reservation to get started.
                        </p>
                    </div>
                )}
            </div>

            {/* Add Reservation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-8 flex justify-between items-center border-b bg-indigo-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 tracking-tight">New Booking</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Guest Reservation</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-3 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Customer Name</label>
                                    <input
                                        value={newRes.customerName}
                                        onChange={(e) => setNewRes({ ...newRes, customerName: e.target.value })}
                                        placeholder="Enter full name"
                                        className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-gray-700 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Phone Number</label>
                                    <input
                                        value={newRes.phone}
                                        onChange={(e) => setNewRes({ ...newRes, phone: e.target.value })}
                                        placeholder="Enter mobile number"
                                        className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-gray-700 transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Date</label>
                                        <input
                                            type="date"
                                            value={newRes.date}
                                            onChange={(e) => setNewRes({ ...newRes, date: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-gray-700 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Time</label>
                                        <input
                                            type="time"
                                            value={newRes.time}
                                            onChange={(e) => setNewRes({ ...newRes, time: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-gray-700 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Guests</label>
                                        <div className="flex items-center bg-gray-50 rounded-2xl p-1">
                                            <button
                                                onClick={() => setNewRes({ ...newRes, guests: Math.max(1, newRes.guests - 1) })}
                                                className="w-10 h-10 bg-white rounded-xl shadow-sm text-indigo-600 font-black"
                                            >-</button>
                                            <span className="flex-1 text-center font-black text-gray-700">{newRes.guests}</span>
                                            <button
                                                onClick={() => setNewRes({ ...newRes, guests: newRes.guests + 1 })}
                                                className="w-10 h-10 bg-white rounded-xl shadow-sm text-indigo-600 font-black"
                                            >+</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Table (Optional)</label>
                                        <input
                                            type="number"
                                            value={newRes.tableId}
                                            onChange={(e) => setNewRes({ ...newRes, tableId: e.target.value })}
                                            placeholder="No."
                                            className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-gray-700 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleAddRes}
                                disabled={!newRes.customerName || !newRes.phone || !newRes.time}
                                className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                            >
                                Confirm Reservation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reservations;
