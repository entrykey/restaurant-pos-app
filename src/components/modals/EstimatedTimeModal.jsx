import React, { useState } from "react";
import { Clock, Timer } from "lucide-react";
import Modal from "../ui/Modal";

const EstimatedTimeModal = ({ isOpen, onClose, onConfirm }) => {
    const [time, setTime] = useState(15);
    const presets = [5, 10, 15, 20, 30, 45, 60];

    const handleConfirm = () => {
        onConfirm(parseInt(time) || 0);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="max-w-sm"
            title={
                <span className="flex items-center gap-2">
                    <Timer size={24} className="text-indigo-600" /> Start Preparation
                </span>
            }
        >
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
                        Estimated Time (minutes)
                    </label>
                    <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="number"
                            autoFocus
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-indigo-500 outline-none text-xl font-black text-gray-800"
                            placeholder="15"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    {presets.map((p) => (
                        <button
                            key={p}
                            onClick={() => setTime(p)}
                            className={`py-2 rounded-xl font-bold text-sm transition-all ${time == p
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105"
                                    : "bg-white border border-gray-100 text-gray-500 hover:bg-gray-50"
                                }`}
                        >
                            {p}m
                        </button>
                    ))}
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 py-4 bg-indigo-600 rounded-2xl font-bold text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                        Start Prep
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default EstimatedTimeModal;
