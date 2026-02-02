import React from "react";
import { MessageSquare } from "lucide-react";
import Modal from "../ui/Modal";

const NoteModal = ({ isOpen, onClose, noteData, onSave, onDataChange }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="max-w-sm"
            title={
                <span className="flex items-center gap-2">
                    <MessageSquare size={20} className="text-indigo-600" /> Add Note
                </span>
            }
        >
            <textarea
                autoFocus
                className="w-full h-32 p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-indigo-500 outline-none text-gray-700 font-medium resize-none mb-4"
                placeholder="Enter custom instructions here (e.g. Less spicy, Extra sauce)..."
                value={noteData.text}
                onChange={(e) => onDataChange(e.target.value)}
            />
            <div className="flex gap-2">
                <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-white border-2 border-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    onClick={onSave}
                    className="flex-1 py-3 bg-indigo-600 rounded-xl font-bold text-white shadow-lg hover:bg-indigo-700"
                >
                    Save Note
                </button>
            </div>
        </Modal>
    );
};

export default NoteModal;
