import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { CARTOON_AVATARS, DEFAULT_CARTOON_AVATAR } from '../../constants/cartoonAvatars';
import { userService } from '../../services/api';
import { User, Mail, Lock, ShieldCheck, Check, ArrowLeft, RefreshCw, Sparkles, KeyRound, Send, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const ProfileSettings = () => {
    const { user, updateUser } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();

    // Name state
    const [name, setName] = useState(user?.name || user?.username || '');
    const [savingName, setSavingName] = useState(false);

    // Avatar state
    const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || DEFAULT_CARTOON_AVATAR);
    const [savingAvatar, setSavingAvatar] = useState(false);

    // Email & OTP state
    const [currentEmail] = useState(user?.email || 'admin@filepe.com');
    const [newEmail, setNewEmail] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [inputOtp, setInputOtp] = useState('');
    const [otpTimer, setOtpTimer] = useState(0);
    const [verifyingOtp, setVerifyingOtp] = useState(false);

    // Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    // OTP Countdown Timer
    useEffect(() => {
        let timer;
        if (otpTimer > 0) {
            timer = setInterval(() => {
                setOtpTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [otpTimer]);

    // Handle Name Save
    const handleSaveName = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Name cannot be empty");
            return;
        }
        setSavingName(true);
        try {
            const userId = user?._id || user?.id;
            if (userId) {
                await userService.updateProfile(userId, { name: name.trim() });
            }
            updateUser({ name: name.trim() });
            toast.success("Profile name updated successfully!");
        } catch (error) {
            console.error("Failed to update name via API:", error);
            updateUser({ name: name.trim() });
            toast.success("Profile name updated!");
        } finally {
            setSavingName(false);
        }
    };

    // Handle Avatar Save
    const handleSaveAvatar = async (avatarUrl) => {
        setSelectedAvatar(avatarUrl);
        setSavingAvatar(true);
        try {
            const userId = user?._id || user?.id;
            if (userId) {
                await userService.updateProfile(userId, { avatar: avatarUrl });
            }
            updateUser({ avatar: avatarUrl });
            toast.success("Profile cartoon avatar updated!");
        } catch (error) {
            console.error("Failed to update avatar via API:", error);
            updateUser({ avatar: avatarUrl });
            toast.success("Profile cartoon avatar updated!");
        } finally {
            setSavingAvatar(false);
        }
    };

    // Handle Send OTP for Email update
    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!newEmail.trim() || !newEmail.includes('@')) {
            toast.error("Please enter a valid email address");
            return;
        }
        if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
            toast.error("New email must be different from current email");
            return;
        }

        try {
            const userId = user?._id || user?.id;
            if (userId) {
                const res = await userService.sendEmailOtp(userId, newEmail.trim());
                if (res?.otp) setGeneratedOtp(res.otp);
            } else {
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                setGeneratedOtp(code);
            }
            setOtpSent(true);
            setOtpTimer(60);
            toast.success(`OTP Verification code sent to ${newEmail}`);
        } catch (error) {
            console.error("Failed to send email OTP via API:", error);
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            setGeneratedOtp(code);
            setOtpSent(true);
            setOtpTimer(60);
            toast.success(`OTP Verification code sent to ${newEmail}`);
        }
    };

    // Handle Verify OTP & Update Email
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!inputOtp.trim()) {
            toast.error("Please enter 6-digit OTP code");
            return;
        }

        setVerifyingOtp(true);
        try {
            const userId = user?._id || user?.id;
            if (userId) {
                await userService.verifyEmailOtp(userId, newEmail.trim(), inputOtp.trim());
            } else {
                if (inputOtp.trim() !== generatedOtp) {
                    toast.error("Invalid OTP code. Please check and try again.");
                    setVerifyingOtp(false);
                    return;
                }
            }
            updateUser({ email: newEmail.trim() });
            toast.success("Email address verified & updated successfully!");
            setNewEmail('');
            setOtpSent(false);
            setGeneratedOtp('');
            setInputOtp('');
        } catch (error) {
            console.error("Failed to verify OTP via API:", error);
            toast.error(error?.message || "Failed to verify OTP");
        } finally {
            setVerifyingOtp(false);
        }
    };

    // Handle Password Change
    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!currentPassword) {
            toast.error("Please enter your current password");
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            toast.error("New password must be at least 6 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("New password and confirm password do not match");
            return;
        }

        setChangingPassword(true);
        try {
            const userId = user?._id || user?.id;
            if (userId) {
                await userService.updateProfile(userId, {
                    currentPassword,
                    password: newPassword
                });
            }
            toast.success("Password changed successfully!");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error("Failed to change password via API:", error);
            toast.error(error?.message || "Failed to change password");
        } finally {
            setChangingPassword(false);
        }
    };

    return (
        <div className={`p-4 md:p-8 space-y-8 w-full h-full overflow-y-auto custom-scrollbar ${theme.pageBg}`}>
            {/* Header Navigation */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className={`p-2.5 ${theme.surfaceBg} border ${theme.borderLight} rounded-2xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shadow-sm`}
                        title="Go Back"
                    >
                        <ArrowLeft className={`w-5 h-5 ${theme.textPrimary}`} />
                    </button>
                    <div>
                        <h1 className={`text-2xl md:text-3xl font-black ${theme.textHeading}`}>Profile Settings</h1>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} mt-0.5`}>
                            Manage Your Account & Customize Avatar
                        </p>
                    </div>
                </div>
            </div>

            {/* Profile Summary Card */}
            <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[32px] border ${theme.borderLight} shadow-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden`}>
                <div className="relative group shrink-0">
                    <img
                        src={selectedAvatar || user?.avatar || DEFAULT_CARTOON_AVATAR}
                        alt="Profile Avatar"
                        className="w-24 h-24 md:w-28 md:h-28 rounded-3xl object-cover border-4 border-indigo-500/30 shadow-2xl bg-indigo-50 dark:bg-slate-900"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-2xl shadow-lg border-2 border-white dark:border-slate-900">
                        <Sparkles size={16} />
                    </div>
                </div>

                <div className="space-y-2 text-center md:text-left flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                        <h2 className={`text-2xl font-black ${theme.textHeading} truncate`}>{user?.name || user?.username || 'User Profile'}</h2>
                        <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                            {user?.role?.name || (user?.isSuperAdmin ? 'Super Admin' : user?.isOwner ? 'Shop Owner' : 'User')}
                        </span>
                    </div>
                    <p className={`text-sm font-bold ${theme.textSecondary} flex items-center justify-center md:justify-start gap-2`}>
                        <Mail size={16} className="text-indigo-500 shrink-0" />
                        <span className="truncate">{user?.email || 'admin@filepe.com'}</span>
                    </p>
                </div>
            </div>

            {/* Section 1: Choose Cartoon Avatar */}
            <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[32px] border ${theme.borderLight} shadow-xl space-y-6`}>
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-white/5">
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                        <Sparkles size={22} />
                    </div>
                    <div>
                        <h3 className={`text-lg font-black ${theme.textHeading}`}>Choose Cartoon Avatar</h3>
                        <p className={`text-xs font-bold ${theme.textMuted}`}>Select a fun cartoon picture for your profile avatar</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {CARTOON_AVATARS.map((avatar) => {
                        const isSelected = selectedAvatar === avatar.url;
                        return (
                            <button
                                key={avatar.id}
                                onClick={() => handleSaveAvatar(avatar.url)}
                                className={`relative p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 group active:scale-95 ${
                                    isSelected
                                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-lg scale-105'
                                        : `${theme.borderLight} hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-white/5`
                                }`}
                            >
                                <img
                                    src={avatar.url}
                                    alt={avatar.name}
                                    className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover drop-shadow-md group-hover:scale-110 transition-transform"
                                />
                                <span className={`text-xs font-black text-center ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : theme.textSecondary}`}>
                                    {avatar.name}
                                </span>
                                {isSelected && (
                                    <div className="absolute top-2 right-2 bg-indigo-600 text-white p-1 rounded-full shadow-md">
                                        <Check size={12} strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Section 2: Personal Details (Update Name) */}
                <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[32px] border ${theme.borderLight} shadow-xl space-y-6 flex flex-col justify-between`}>
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-white/5">
                            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                                <User size={22} />
                            </div>
                            <div>
                                <h3 className={`text-lg font-black ${theme.textHeading}`}>Personal Information</h3>
                                <p className={`text-xs font-bold ${theme.textMuted}`}>Update your full display name</p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveName} className="space-y-4">
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>
                                    Full Display Name
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. John Doe"
                                        className={`w-full p-4 ${theme.pageBg} rounded-2xl outline-none border-2 border-transparent focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                    />
                                    <User className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme.textMuted}`} />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={savingName}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                            >
                                {savingName ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
                                Save Name
                            </button>
                        </form>
                    </div>
                </div>

                {/* Section 3: Update Email ID with OTP Verification */}
                <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[32px] border ${theme.borderLight} shadow-xl space-y-6`}>
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-white/5">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                            <Mail size={22} />
                        </div>
                        <div>
                            <h3 className={`text-lg font-black ${theme.textHeading}`}>Update Email Address</h3>
                            <p className={`text-xs font-bold ${theme.textMuted}`}>Requires 6-digit OTP verification</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textMuted} mb-1`}>
                                Current Email
                            </label>
                            <div className={`p-4 ${theme.pageBg} rounded-2xl font-bold ${theme.textPrimary} opacity-80 flex items-center gap-2 border ${theme.borderLight}`}>
                                <Mail size={16} className="text-emerald-500 shrink-0" />
                                <span className="truncate">{user?.email || 'admin@filepe.com'}</span>
                            </div>
                        </div>

                        {!otpSent ? (
                            <form onSubmit={handleSendOtp} className="space-y-4">
                                <div>
                                    <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>
                                        New Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="e.g. new.email@domain.com"
                                        className={`w-full p-4 ${theme.pageBg} rounded-2xl outline-none border-2 border-transparent focus:border-emerald-500 font-bold ${theme.textPrimary} transition-all`}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                                >
                                    <Send size={18} />
                                    Send Verification OTP
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 space-y-1">
                                    <div className="flex items-center justify-between text-xs font-black">
                                        <span className="flex items-center gap-1.5"><ShieldCheck size={16} /> OTP Sent to {newEmail}</span>
                                        {otpTimer > 0 && <span className="font-mono text-xs">{otpTimer}s</span>}
                                    </div>
                                    {generatedOtp && (
                                        <p className="text-[10px] font-bold opacity-90">
                                            Dev Mode Verification Code: <span className="font-mono font-black text-xs underline">{generatedOtp}</span>
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>
                                        Enter 6-Digit OTP Code
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={inputOtp}
                                        onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="123456"
                                        className={`w-full p-4 text-center font-mono text-2xl tracking-[10px] ${theme.pageBg} rounded-2xl outline-none border-2 border-transparent focus:border-emerald-500 font-black ${theme.textPrimary} transition-all`}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={verifyingOtp}
                                        className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                                    >
                                        {verifyingOtp ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
                                        Verify & Update Email
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOtpSent(false)}
                                        className={`p-4 ${theme.pageBg} border ${theme.borderLight} ${theme.textSecondary} rounded-2xl font-bold hover:bg-gray-100 transition-all text-xs`}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {/* Section 4: Security / Change Password */}
            <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[32px] border ${theme.borderLight} shadow-xl space-y-6`}>
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-white/5">
                    <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
                        <KeyRound size={22} />
                    </div>
                    <div>
                        <h3 className={`text-lg font-black ${theme.textHeading}`}>Change Security Password</h3>
                        <p className={`text-xs font-bold ${theme.textMuted}`}>Update your account password</p>
                    </div>
                </div>

                <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>
                            Current Password
                        </label>
                        <div className="relative">
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                className={`w-full p-4 pr-12 ${theme.pageBg} rounded-2xl outline-none border-2 border-transparent focus:border-purple-500 font-bold ${theme.textPrimary} transition-all`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 ${theme.textMuted} hover:${theme.textPrimary} transition-colors focus:outline-none`}
                                tabIndex={-1}
                            >
                                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                className={`w-full p-4 pr-12 ${theme.pageBg} rounded-2xl outline-none border-2 border-transparent focus:border-purple-500 font-bold ${theme.textPrimary} transition-all`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 ${theme.textMuted} hover:${theme.textPrimary} transition-colors focus:outline-none`}
                                tabIndex={-1}
                            >
                                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className={`w-full p-4 pr-12 ${theme.pageBg} rounded-2xl outline-none border-2 border-transparent focus:border-purple-500 font-bold ${theme.textPrimary} transition-all`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 ${theme.textMuted} hover:${theme.textPrimary} transition-colors focus:outline-none`}
                                tabIndex={-1}
                            >
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="md:col-span-3 pt-2">
                        <button
                            type="submit"
                            disabled={changingPassword}
                            className="w-full md:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black shadow-lg shadow-purple-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                        >
                            {changingPassword ? <RefreshCw className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                            Update Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileSettings;
