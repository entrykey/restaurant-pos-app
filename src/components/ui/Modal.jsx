import React from "react";
import { X } from "lucide-react";

const Modal = ({ isOpen, onClose, title, children, className = "" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <div
                className={`bg-white w-full rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 bg-gray-50 border-b flex justify-between items-center shrink-0">
                    <div>
                        {title && <h3 className="text-2xl font-black text-gray-800">{title}</h3>}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
