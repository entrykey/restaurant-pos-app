import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { categoryService, shopService } from '../services/api';
import { getBingImage } from '../utils/getImage';

const LandingPage = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [scrolled, setScrolled] = useState(0);
    const [categories, setCategories] = useState([]);
    const [businessTypes, setBusinessTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY);
        window.addEventListener('scroll', handleScroll);
        
        // Fetch categories and business types
        const fetchData = async () => {
            try {
                const [categoryData, btData] = await Promise.all([
                    categoryService.getPublicCategories(),
                    shopService.getBusinessTypes()
                ]);

                // Combine categories with same name
                const uniqueMap = new Map();
                categoryData.forEach(cat => {
                    const nameKey = cat.name.trim().toLowerCase();
                    if (!uniqueMap.has(nameKey)) {
                        uniqueMap.set(nameKey, {
                            name: cat.name,
                            image: getBingImage(cat.name, { w: 300, h: 300 })
                        });
                    }
                });
                setCategories(Array.from(uniqueMap.values()));
                
                // Set business types (using displayString from backend)
                setBusinessTypes(btData.map(bt => {
                    const name = bt.displayString || bt.name || "Business Type";
                    return {
                        ...bt,
                        name: name,
                        image: getBingImage(name, { w: 400, h: 400 })
                    };
                }));
            } catch (error) {
                console.error("Failed to fetch landing data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Thresholds for navbar states
    const isNavbarVisible = scrolled > 100;
    const showPartnerBtnInNavbar = scrolled > 100;

    return (
        <div className="min-h-screen relative overflow-x-hidden bg-[#0A0A10] text-white selection:bg-indigo-500/30 font-sans">
            
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-to-b from-indigo-600/10 to-transparent blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-fuchsia-600/5 blur-[150px] rounded-full pointer-events-none" />

            {/* Become a Partner Button (Initial state, top right) */}
            <div className={`fixed top-8 right-8 z-[110] transition-all duration-500 
                ${scrolled > 100 ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'}`}>
                <button 
                    onClick={() => navigate('/login')}
                    className="px-6 py-3 bg-white text-black font-black text-sm rounded-full shadow-2xl hover:scale-105 transition-transform flex items-center gap-2"
                >
                    Become a Partner
                    <ArrowRight size={16} />
                </button>
            </div>

            {/* Sticky Navbar (Transitioning states) */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-out border-b border-white/5 bg-black/60 backdrop-blur-xl
                ${isNavbarVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                <div className="w-full px-6 h-16 flex items-center justify-between">
                    {/* Logo/Heading */}
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
                            F
                        </div>
                        <span className="font-black tracking-tight text-lg text-white uppercase">
                            FilePe
                        </span>
                    </div>

                    {/* Navbar Button (Conditional) */}
                    <div className={`transition-all duration-300 ${showPartnerBtnInNavbar ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                        <button 
                            onClick={() => navigate('/login')}
                            className="px-5 py-2 bg-indigo-600 text-white font-bold text-xs rounded-full hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            Become a Partner
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex flex-col items-center justify-center px-4 min-h-[80vh] text-center">
                {/* Initial Centered Logo/Heading */}
                <div className={`flex flex-col items-center gap-6 transition-all duration-700 ${scrolled > 50 ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100'}`}>
                    <div className="w-24 h-24 rounded-3xl flex items-center justify-center font-black text-5xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-[0_0_50px_rgba(79,70,229,0.3)]">
                        F
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white">
                        FilePe
                    </h1>
                </div>

            </main>

            {/* Categories & Business Types Section */}
            <section className="relative z-10 w-full px-6 py-12">
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="aspect-square rounded-3xl bg-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-16">
                        {/* Business Types Grid */}
                        <div className="flex flex-wrap items-start justify-center gap-10">
                            {businessTypes.map((bt, index) => (
                                <div 
                                    key={index}
                                    className="group relative flex flex-col items-center gap-6 p-2 transition-all cursor-pointer"
                                >
                                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden transition-all">
                                        <img 
                                            src={bt.image} 
                                            alt={bt.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/400?text=Shop'; }}
                                        />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-sm md:text-base font-black text-white/90 tracking-widest uppercase group-hover:text-indigo-400 transition-colors">
                                            {bt.name}
                                        </h3>
                                        <div className="h-0.5 w-0 group-hover:w-full bg-indigo-500 mx-auto transition-all duration-300 mt-1" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Categories Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {categories.map((category, index) => (
                                <div 
                                    key={index}
                                    className="group relative aspect-square rounded-3xl overflow-hidden bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all cursor-pointer hover:scale-105"
                                >
                                    <img 
                                        src={category.image} 
                                        alt={category.name}
                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <p className="text-sm font-black text-white tracking-tight uppercase group-hover:text-indigo-400 transition-colors">
                                            {category.name}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Footer space */}
            <footer className="py-20 text-center border-t border-white/5">
                <p className="text-gray-500 text-sm font-medium">&copy; 2024 FilePe. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
