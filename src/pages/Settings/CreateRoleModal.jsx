import React, { useState } from "react";
import { X, Shield, Check, Loader2, Plus } from "lucide-react";
import { roleService } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "react-hot-toast";

const CreateRoleModal = ({ isOpen, onClose, onRoleCreated, currentShopId }) => {
    const { themeName } = useTheme();
    const isDark = themeName === 'dark' || themeName === 'ocean';

    const [name, setName] = useState("Shop Owner");
    const [code, setCode] = useState("SHOP_OWNER");
    const [scope, setScope] = useState("GLOBAL");
    const [isSystemRole, setIsSystemRole] = useState(true);
    const [description, setDescription] = useState("Default Shop Owner role for shop management.");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleCodeChange = (e) => {
        const uppercaseVal = e.target.value.toUpperCase().replace(/\s+/g, '_');
        setCode(uppercaseVal);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!name.trim()) {
            setError("Role name is required");
            return;
        }

        if (!code.trim()) {
            setError("Role code is required");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                code: code.trim().toUpperCase(),
                scope,
                isSystemRole,
                shopId: isSystemRole ? null : (currentShopId || null),
                description: description.trim(),
                permissions: []
            };

            const createdRole = await roleService.createRole(payload);
            toast.success(`Role "${createdRole.name || name}" created successfully!`);
            
            if (onRoleCreated) {
                onRoleCreated(createdRole);
            }
            onClose();
        } catch (err) {
            console.error("Failed to create role:", err);
            setError(err.message || err.error || "Failed to create role. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden transition-all border ${
                isDark 
                    ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-indigo-950/40' 
                    : 'bg-white border-slate-200 text-slate-900'
            }`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-5 border-b ${
                    isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                            <Shield size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight">Create New Role</h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Add a new Shop Owner or system role
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-xl transition-all ${
                            isDark 
                                ? 'hover:bg-slate-800 text-slate-400 hover:text-white' 
                                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3.5 rounded-2xl text-xs font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20 text-center">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-extrabold uppercase tracking-wider mb-1.5 text-slate-500 dark:text-slate-400">
                                Role Name *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Shop Owner"
                                required
                                className={`w-full px-4 py-3 rounded-2xl border text-sm font-semibold outline-none transition-all ${
                                    isDark 
                                        ? 'bg-slate-800/50 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                                        : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                                }`}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-extrabold uppercase tracking-wider mb-1.5 text-slate-500 dark:text-slate-400">
                                Role Code *
                            </label>
                            <input
                                type="text"
                                value={code}
                                onChange={handleCodeChange}
                                placeholder="e.g. SHOP_OWNER"
                                required
                                className={`w-full px-4 py-3 rounded-2xl border text-sm font-bold tracking-wide uppercase outline-none transition-all ${
                                    isDark 
                                        ? 'bg-slate-800/50 border-slate-700 focus:border-indigo-500 text-indigo-400 placeholder-slate-500' 
                                        : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-indigo-600 placeholder-slate-400'
                                }`}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-extrabold uppercase tracking-wider mb-1.5 text-slate-500 dark:text-slate-400">
                                Scope
                            </label>
                            <select
                                value={scope}
                                onChange={(e) => setScope(e.target.value)}
                                className={`w-full px-4 py-3 rounded-2xl border text-sm font-semibold outline-none transition-all ${
                                    isDark 
                                        ? 'bg-slate-800/50 border-slate-700 focus:border-indigo-500 text-white' 
                                        : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-slate-900'
                                }`}
                            >
                                <option value="GLOBAL">GLOBAL (System Level)</option>
                                <option value="SHOP">SHOP (Shop Level)</option>
                                <option value="BRANCH">BRANCH (Branch Level)</option>
                            </select>
                        </div>

                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isSystemRole}
                                    onChange={(e) => setIsSystemRole(e.target.checked)}
                                    className="w-5 h-5 rounded-lg text-indigo-600 border-slate-300 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                                />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    System Role
                                </span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider mb-1.5 text-slate-500 dark:text-slate-400">
                            Description
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the role responsibilities..."
                            className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-all ${
                                isDark 
                                    ? 'bg-slate-800/50 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                                    : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                            }`}
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className={`px-5 py-2.5 text-xs font-extrabold rounded-xl border transition-all ${
                                isDark 
                                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 text-xs font-extrabold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <>
                                    <Plus size={16} />
                                    <span>Create Role</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateRoleModal;
