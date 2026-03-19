import React from "react";
import { MessageSquare } from "lucide-react";
import Modal from "../ui/Modal";
import { useTheme } from "../../context/ThemeContext";

const NoteModal = ({ isOpen, onClose, noteData, onSave, onDataChange }) => {
    const { theme } = useTheme();
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="max-w-sm"
            title={
                <span className="flex items-center gap-2">
                    <MessageSquare size={20} className="text-indigo-600" /> <span className={theme.textHeading}>Add Note</span>
                </span>
            }
        >
            <textarea
                autoFocus
                className={`w-full h-32 p-4 ${theme.inputBg} rounded-2xl border-2 ${theme.borderLight} focus:border-indigo-500 outline-none ${theme.textPrimary} font-medium resize-none mb-4`}
                placeholder="Enter custom instructions here (e.g. Less spicy, Extra sauce)..."
                value={noteData.text}
                onChange={(e) => onDataChange(e.target.value)}
            />
            <div className="flex gap-2">
                <button
                    onClick={onClose}
                    className={`flex-1 py-3 ${theme.surfaceBg} border-2 ${theme.borderLight} rounded-xl font-bold ${theme.textMuted} hover:${theme.pageBg}`}
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
