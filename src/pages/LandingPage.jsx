import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, CheckCircle2, Building2, Store, CreditCard } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const LandingPage = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();

    // Default to a dark theme for the landing page to make it look premium
    const isDark = theme.mode === 'dark' || true; // Force dark mode aesthetic for landing if preferred, or use context.

    return (
        <div className={`min-h-screen relative overflow-hidden bg-[#0A0A10] text-white selection:bg-indigo-500/30 font-sans`}>
            
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-indigo-600/20 to-transparent blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-fuchsia-600/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute -left-40 top-1/3 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />

            {/* Glowing Grid */}
            <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

            {/* Navbar */}
            <nav className="relative z-50 border-b border-white/5 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/25`}>
                            F
                        </div>
                        <span className="font-black tracking-tight text-xl text-white">
                            FilePe
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        <a href="#features" className="text-sm font-bold text-gray-300 hover:text-white transition-colors hidden md:block">Features</a>
                        <a href="#about" className="text-sm font-bold text-gray-300 hover:text-white transition-colors hidden md:block">About</a>
                        <button 
                            onClick={() => navigate('/login')}
                            className="text-sm font-bold text-gray-300 hover:text-white transition-colors"
                        >
                            Login
                        </button>
                        <button 
                            onClick={() => navigate('/login')}
                            className="group relative px-6 py-2.5 bg-white text-black font-black text-sm rounded-full overflow-hidden shadow-xl hover:shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Start Trial
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-32 pb-20 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-8 animate-fade-in-up">
                    <Sparkles size={14} />
                    Next-Gen Point of Sale
                </div>

                <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-8 max-w-4xl text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 animate-title">
                    Manage your business like <br className="hidden md:block"/> never before.
                </h1>

                <p className="text-lg md:text-xl text-gray-400 font-medium max-w-2xl mb-12 animate-fade-in-up animation-delay-200">
                    The ultimate smart POS system designed for modern restaurants, retail stores, and wholesale businesses. Effortless billing, dynamic inventory, and deep insights.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up animation-delay-300">
                    <button 
                        onClick={() => navigate('/login')}
                        className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-fuchsia-600 rounded-2xl font-black text-white shadow-2xl hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300"></div>
                        <span className="relative z-10 flex items-center justify-center gap-3">
                            Start Your Free Trial
                            <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                        </span>
                    </button>
                </div>

                <div className="mt-20 pt-10 border-t border-white/5 w-full max-w-5xl animate-fade-in-up animation-delay-400">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-8 text-center">Built for businesses of all sizes</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <div className="group bg-white/[0.02] border border-white/5 p-8 rounded-3xl hover:bg-white/[0.04] transition-colors relative overflow-hidden backdrop-blur-sm">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all text-indigo-500">
                                <Store size={64} />
                            </div>
                            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20 shadow-inner">
                                <Store size={24} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-3">Restaurants</h3>
                            <p className="text-sm font-medium text-gray-400 leading-relaxed">
                                Complete dining hall management, Kitchen Displays (KDS), online orders, and table reservation systems.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="group bg-white/[0.02] border border-white/5 p-8 rounded-3xl hover:bg-white/[0.04] transition-colors relative overflow-hidden backdrop-blur-sm">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all text-fuchsia-500">
                                <Building2 size={64} />
                            </div>
                            <div className="w-12 h-12 bg-fuchsia-500/10 text-fuchsia-400 rounded-2xl flex items-center justify-center mb-6 border border-fuchsia-500/20 shadow-inner">
                                <Building2 size={24} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-3">Retail & Wholesale</h3>
                            <p className="text-sm font-medium text-gray-400 leading-relaxed">
                                Multi-branch inventory tracking, party bulk orders, direct sales, and granular barcode operations.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="group bg-white/[0.02] border border-white/5 p-8 rounded-3xl hover:bg-white/[0.04] transition-colors relative overflow-hidden backdrop-blur-sm">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all text-emerald-500">
                                <CreditCard size={64} />
                            </div>
                            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20 shadow-inner">
                                <CheckCircle2 size={24} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-3">Seamless Billing</h3>
                            <p className="text-sm font-medium text-gray-400 leading-relaxed">
                                Blazing fast checkout, split payments, multi-channel payment tracking, and dynamic discounting.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LandingPage;
