import React, { useState } from "react";
import Modal from "../ui/Modal";

const ExpenseModal = ({ isOpen, onClose, onSave }) => {
    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState("");

    const handleSave = () => {
        if (title && amount) {
            onSave(title, amount);
            setTitle("");
            setAmount("");
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Expense" className="max-w-md">
            <div className="space-y-6">
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Expense Description (e.g. Milk, Power Bill)"
                    className="w-full p-4 border rounded-2xl outline-none"
                />
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount (INR)"
                    className="w-full p-4 border rounded-2xl outline-none"
                />
                <div className="flex gap-4 pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 font-bold text-gray-400"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg"
                    >
                        Record Expense
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ExpenseModal;
