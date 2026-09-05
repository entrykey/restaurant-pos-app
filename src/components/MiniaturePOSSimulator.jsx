import React, { useState, useEffect } from 'react';
import { 
    Utensils, 
    ShoppingBag, 
    Plus, 
    Minus, 
    Printer, 
    Tag, 
    CheckCircle2, 
    Search,
    Sparkles,
    MousePointer2,
    Play,
    Pause,
    QrCode,
    Receipt,
    X,
    TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const MINI_PRODUCTS = [
    {
        id: 'p1',
        name: 'Beef Roast Special',
        category: 'Meat',
        price: 200,
        unit: 'INR',
        stock: 6,
        tag: 'HOT',
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80'
    },
    {
        id: 'p2',
        name: 'Fried Rice Combo',
        category: 'Rice',
        price: 50,
        unit: 'INR/Kg',
        stock: 50,
        badge: 'FILEPE OPTIMIZED',
        image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400&q=80'
    },
    {
        id: 'p3',
        name: 'Tuna Grilled Steak',
        category: 'Grill',
        price: 100,
        unit: 'INR/Kg',
        stock: 17,
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80'
    },
    {
        id: 'p4',
        name: 'Cold Coffee Shake',
        category: 'Beverage',
        price: 80,
        unit: 'INR',
        stock: 12,
        image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=400&q=80'
    }
];

const MiniaturePOSSimulator = ({ isDark = false, onNavigateLogin }) => {
    // Multi-Tab state management
    const [activeTabId, setActiveTabId] = useState('tab1');
    const [tabCarts, setTabCarts] = useState({
        tab1: [{ id: 'p2', name: 'Fried Rice Combo', price: 50, qty: 1 }],
        tab2: [{ id: 'p4', name: 'Cold Coffee Shake', price: 80, qty: 2 }],
        tab3: []
    });

    const [selectedCategory, setSelectedCategory] = useState('All');
    const [offerApplied, setOfferApplied] = useState(false);
    const [paymentMode, setPaymentMode] = useState('UPI');
    
    // Auto-Demo state & animated hand position
    const [autoPlay, setAutoPlay] = useState(true);
    const [demoStep, setDemoStep] = useState(0); 
    const [cursorPos, setCursorPos] = useState({ x: 22, y: 38, visible: true, clicking: false });
    const [toastMessage, setToastMessage] = useState('');

    // Active tab's current cart
    const currentCart = tabCarts[activeTabId] || [];

    // Cart calculations
    const subtotal = currentCart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const calculatedDiscount = offerApplied ? Math.round(subtotal * 0.1) : 0;
    const tax = Math.round((subtotal - calculatedDiscount) * 0.05);
    const total = Math.max(0, subtotal - calculatedDiscount + tax);

    // Handlers for cart management
    const addToCart = (product) => {
        setTabCarts(prev => {
            const activeCart = prev[activeTabId] || [];
            const existing = activeCart.find(item => item.id === product.id);
            let updated;
            if (existing) {
                updated = activeCart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
            } else {
                updated = [...activeCart, { id: product.id, name: product.name, price: product.price, qty: 1 }];
            }
            return { ...prev, [activeTabId]: updated };
        });
    };

    const updateQty = (id, delta) => {
        setTabCarts(prev => {
            const activeCart = prev[activeTabId] || [];
            const updated = activeCart.map(item => {
                if (item.id === id) {
                    const newQty = item.qty + delta;
                    return newQty > 0 ? { ...item, qty: newQty } : null;
                }
                return item;
            }).filter(Boolean);
            return { ...prev, [activeTabId]: updated };
        });
    };

    const toggleOffer = () => {
        setOfferApplied(prev => !prev);
    };

    // Auto Demo Loop simulation
    useEffect(() => {
        if (!autoPlay) {
            setCursorPos(prev => ({ ...prev, visible: false }));
            return;
        }

        const stepTimer = setTimeout(() => {
            switch (demoStep) {
                case 0:
                    // Ensure active tab is TAB 1
                    setActiveTabId('tab1');
                    setCursorPos({ x: 22, y: 40, visible: true, clicking: false });
                    setTimeout(() => {
                        setCursorPos(p => ({ ...p, clicking: true }));
                        addToCart(MINI_PRODUCTS[0]);
                        setToastMessage("+ 1 Beef Roast Added");
                        setTimeout(() => {
                            setCursorPos(p => ({ ...p, clicking: false }));
                            setDemoStep(1);
                        }, 500);
                    }, 900);
                    break;

                case 1:
                    // Move cursor to "Tuna Grilled"
                    setCursorPos({ x: 22, y: 74, visible: true, clicking: false });
                    setTimeout(() => {
                        setCursorPos(p => ({ ...p, clicking: true }));
                        addToCart(MINI_PRODUCTS[2]);
                        setToastMessage("+ 1 Tuna Grilled Added");
                        setTimeout(() => {
                            setCursorPos(p => ({ ...p, clicking: false }));
                            setDemoStep(2);
                        }, 500);
                    }, 900);
                    break;

                case 2:
                    // Move cursor to "Apply Offer" banner on the right panel
                    setCursorPos({ x: 72, y: 64, visible: true, clicking: false });
                    setTimeout(() => {
                        setCursorPos(p => ({ ...p, clicking: true }));
                        setOfferApplied(true);
                        setToastMessage("🏷️ 10% Flat Offer Applied!");
                        setTimeout(() => {
                            setCursorPos(p => ({ ...p, clicking: false }));
                            setDemoStep(3);
                        }, 500);
                    }, 900);
                    break;

                case 3:
                    // Move cursor to "Checkout" button
                    setCursorPos({ x: 80, y: 88, visible: true, clicking: false });
                    setTimeout(() => {
                        setCursorPos(p => ({ ...p, clicking: true }));
                        setToastMessage("🎉 Bill Printed & Receipt Generated!");
                        setTimeout(() => {
                            setCursorPos(p => ({ ...p, clicking: false }));
                            setDemoStep(4);
                        }, 600);
                    }, 1000);
                    break;

                case 4:
                    // Pause & reset loop
                    setTimeout(() => {
                        setTabCarts({
                            tab1: [{ id: 'p2', name: 'Fried Rice Combo', price: 50, qty: 1 }],
                            tab2: [{ id: 'p4', name: 'Cold Coffee Shake', price: 80, qty: 2 }],
                            tab3: []
                        });
                        setOfferApplied(false);
                        setToastMessage("Terminal Ready for Next Order");
                        setDemoStep(0);
                    }, 2200);
                    break;

                default:
                    setDemoStep(0);
            }
        }, 1800);

        return () => clearTimeout(stepTimer);
    }, [demoStep, autoPlay]);

    const categories = ['All', 'Rice', 'Grill', 'Meat', 'Beverage'];

    const tabsList = [
        { id: 'tab1', label: 'TAB 1' },
        { id: 'tab2', label: 'TAB 2' },
        { id: 'tab3', label: 'TAB 3' }
    ];

    return (
        <div className={`relative rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden transition-all text-xs font-sans ${
            isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-indigo-950/60' 
                : 'bg-white border-slate-200 text-slate-900 shadow-2xl shadow-indigo-950/10'
        }`}>
            {/* Top Operating Control Bar */}
            <div className={`px-4 py-2 flex items-center justify-between border-b ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100/80 border-slate-200'
            }`}>
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                    </div>
                    <div className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider ml-1 ${
                        isDark ? 'text-indigo-400' : 'text-indigo-700'
                    }`}>
                        <Sparkles size={13} className="text-amber-500 animate-pulse" />
                        <span>FILEPE POS LIVE TERMINAL</span>
                    </div>
                </div>

                {/* Auto Demo Control Pill */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setAutoPlay(!autoPlay)}
                        className={`px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold flex items-center gap-1.5 transition-all border ${
                            autoPlay 
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30' 
                                : (isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300')
                        }`}
                    >
                        {autoPlay ? <Pause size={11} /> : <Play size={11} />}
                        <span>{autoPlay ? 'Auto Demo Running' : 'Manual Mode'}</span>
                    </button>
                </div>
            </div>

            {/* Main Workspace (Responsive: Stacked on Mobile, 6:6 Split on Tablet/Desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[350px] relative">
                
                {/* Left Section: Product Catalog & Category Area */}
                <div className={`col-span-1 md:col-span-6 p-2.5 sm:p-3 border-b md:border-b-0 md:border-r flex flex-col justify-between ${
                    isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'
                }`}>
                    <div className="space-y-2">
                        {/* Header Title & Overlayed Tab Bar */}
                        <div className={`pb-2 border-b space-y-2 ${
                            isDark ? 'border-slate-800' : 'border-slate-200'
                        }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <TrendingUp size={15} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                    <h4 className={`font-black text-xs sm:text-sm tracking-tight ${
                                        isDark ? 'text-white' : 'text-slate-900'
                                    }`}>Sales Order</h4>
                                </div>

                                {/* Mini Search bar */}
                                <div className="relative w-28 sm:w-36">
                                    <Search size={11} className="absolute left-2.5 top-2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        readOnly
                                        placeholder="Search menu..."
                                        className={`w-full border rounded-lg pl-7 pr-2 py-0.5 text-[10px] outline-none ${
                                            isDark 
                                                ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500' 
                                                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm'
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Overlayed Multi-Tab Navigation Bar (TAB 1, TAB 2, TAB 3) */}
                            <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
                                {tabsList.map((tab) => {
                                    const isActive = activeTabId === tab.id;
                                    const tabCartCount = (tabCarts[tab.id] || []).reduce((s, i) => s + i.qty, 0);

                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTabId(tab.id)}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 border shadow-sm ${
                                                isActive
                                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/30'
                                                    : (isDark 
                                                        ? 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200' 
                                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100')
                                            }`}
                                        >
                                            <span>{tab.label}</span>
                                            {tabCartCount > 0 && (
                                                <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-extrabold ${
                                                    isActive ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                                }`}>
                                                    {tabCartCount}
                                                </span>
                                            )}
                                            <X size={10} className={`opacity-60 hover:opacity-100 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                        </button>
                                    );
                                })}

                                {/* Add Tab Plus Icon Button */}
                                <button 
                                    onClick={() => {
                                        toast.success("New Sales Tab Created");
                                    }}
                                    className={`p-1 rounded-lg border transition-all ${
                                        isDark 
                                            ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' 
                                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
                                    }`}
                                    title="Add New Sales Tab"
                                >
                                    <Plus size={11} />
                                </button>
                            </div>
                        </div>

                        {/* Category Pills Bar */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all whitespace-nowrap border ${
                                        selectedCategory === cat
                                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                                            : (isDark 
                                                ? 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200' 
                                                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 shadow-sm')
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Product Cards Grid */}
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                            {MINI_PRODUCTS.filter(p => selectedCategory === 'All' || p.category === selectedCategory).map((product) => (
                                <div
                                    key={product.id}
                                    onClick={() => {
                                        addToCart(product);
                                        toast.success(`Added ${product.name}`);
                                    }}
                                    className={`group relative rounded-xl p-2 border transition-all cursor-pointer hover:scale-[1.01] shadow-sm flex flex-col justify-between ${
                                        isDark 
                                            ? 'bg-slate-950 border-slate-800 hover:border-indigo-500' 
                                            : 'bg-white border-slate-300 hover:border-indigo-600 shadow-slate-200'
                                    }`}
                                >
                                    {/* Product Image & Badges */}
                                    <div className="relative h-16 sm:h-18 w-full rounded-lg overflow-hidden mb-1 bg-slate-200 dark:bg-slate-900">
                                        <img 
                                            src={product.image} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        {product.tag && (
                                            <span className="absolute top-1.5 left-1.5 bg-rose-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow">
                                                {product.tag}
                                            </span>
                                        )}
                                        {product.badge && (
                                            <span className="absolute top-1.5 right-1.5 bg-indigo-600 text-white text-[7px] font-extrabold uppercase px-1.5 py-0.5 rounded shadow">
                                                {product.badge}
                                            </span>
                                        )}

                                        {/* Plus Add Button */}
                                        <button className="absolute bottom-1.5 right-1.5 w-5 h-5 bg-white text-slate-900 rounded-full flex items-center justify-center shadow group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <Plus size={11} />
                                        </button>
                                    </div>

                                    {/* Product Info */}
                                    <div>
                                        <p className={`text-[9px] font-extrabold uppercase tracking-wider ${
                                            isDark ? 'text-slate-400' : 'text-slate-500'
                                        }`}>{product.category}</p>
                                        <h5 className={`font-black text-[11px] truncate leading-tight mt-0.5 ${
                                            isDark ? 'text-white' : 'text-slate-900'
                                        }`}>{product.name}</h5>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className={`text-[11px] font-black ${
                                                isDark ? 'text-indigo-400' : 'text-indigo-700'
                                            }`}>
                                                ₹{product.price} <span className="text-[8px] text-slate-500 font-normal">{product.unit}</span>
                                            </span>
                                            <span className={`text-[8px] font-extrabold ${
                                                isDark ? 'text-emerald-400' : 'text-emerald-700'
                                            }`}>Qty: {product.stock}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Hardware Status Footer */}
                    <div className={`mt-2.5 px-3 py-1.5 rounded-xl border flex items-center justify-between text-[10px] font-bold ${
                        isDark 
                            ? 'bg-indigo-950/40 border-indigo-800/40 text-slate-300' 
                            : 'bg-indigo-50/80 border-indigo-200 text-slate-900'
                    }`}>
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>0.4s Bill Print & KOT Dispatch</span>
                        </span>
                        <span className={`font-black flex items-center gap-1 ${
                            isDark ? 'text-emerald-400' : 'text-emerald-700'
                        }`}>
                            <CheckCircle2 size={12} /> Hardware Ready
                        </span>
                    </div>
                </div>

                {/* Right Section: Order Summary Panel */}
                <div className={`col-span-1 md:col-span-6 p-2.5 sm:p-3 flex flex-col justify-between ${
                    isDark ? 'bg-slate-950' : 'bg-slate-100/90'
                }`}>
                    <div className="space-y-2.5">
                        {/* Summary Header */}
                        <div className={`flex items-center justify-between pb-2 border-b ${
                            isDark ? 'border-slate-800' : 'border-slate-300'
                        }`}>
                            <h4 className={`font-black text-xs sm:text-sm tracking-tight flex items-center gap-1.5 ${
                                isDark ? 'text-white' : 'text-slate-900'
                            }`}>
                                <Receipt size={15} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                <span>Order Summary</span>
                            </h4>
                            <div className={`p-1.5 rounded-lg ${
                                isDark ? 'bg-indigo-600/10 text-indigo-400' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                                <Printer size={13} />
                            </div>
                        </div>

                        {/* Cart Item Cards List */}
                        <div className="space-y-1.5 max-h-36 sm:max-h-40 overflow-y-auto pr-0.5">
                            {currentCart.length === 0 ? (
                                <div className="py-8 text-center text-slate-500 text-[11px] font-bold flex flex-col items-center gap-1.5">
                                    <ShoppingBag size={22} className="text-slate-400" />
                                    <span>No items in active tab</span>
                                </div>
                            ) : (
                                currentCart.map((item) => (
                                    <div key={item.id} className={`p-2 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
                                        isDark 
                                            ? 'bg-slate-900 border-slate-800' 
                                            : 'bg-white border-slate-300'
                                    }`}>
                                        <div className="flex-1 pr-2">
                                            <p className={`text-[11px] font-black truncate ${
                                                isDark ? 'text-white' : 'text-slate-900'
                                            }`}>{item.name}</p>
                                            <p className={`text-[10px] font-extrabold mt-0.5 ${
                                                isDark ? 'text-slate-400' : 'text-slate-600'
                                            }`}>₹{item.price} each</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Quantity adjuster */}
                                            <div className={`flex items-center rounded-lg border overflow-hidden text-[10px] ${
                                                isDark 
                                                    ? 'border-slate-700 bg-slate-950 text-white' 
                                                    : 'border-slate-300 bg-slate-100 text-slate-900'
                                            }`}>
                                                <button 
                                                    onClick={() => updateQty(item.id, -1)}
                                                    className="px-1.5 py-0.5 hover:text-indigo-600 transition-colors"
                                                >
                                                    <Minus size={10} />
                                                </button>
                                                <span className={`px-1.5 font-black ${
                                                    isDark ? 'text-white' : 'text-slate-900'
                                                }`}>{item.qty}</span>
                                                <button 
                                                    onClick={() => updateQty(item.id, 1)}
                                                    className="px-1.5 py-0.5 hover:text-indigo-600 transition-colors"
                                                >
                                                    <Plus size={10} />
                                                </button>
                                            </div>

                                            <span className={`text-xs font-black min-w-[42px] text-right ${
                                                isDark ? 'text-indigo-400' : 'text-indigo-700'
                                            }`}>
                                                ₹{item.price * item.qty}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Calculations, Offers & Action Buttons */}
                    <div className={`space-y-2 pt-2.5 border-t text-[11px] sm:text-xs ${
                        isDark ? 'border-slate-800' : 'border-slate-300'
                    }`}>
                        <div className="flex justify-between font-bold">
                            <span className={isDark ? 'text-slate-400' : 'text-slate-700'}>Subtotal</span>
                            <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{subtotal}.00 INR</span>
                        </div>

                        {/* Apply Offer Banner */}
                        <button
                            onClick={toggleOffer}
                            className={`w-full py-1.5 px-2.5 rounded-xl text-[10px] sm:text-[11px] font-black flex items-center justify-between border transition-all ${
                                offerApplied 
                                    ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300') 
                                    : (isDark ? 'bg-purple-950/60 text-purple-300 border-purple-800/60 hover:bg-purple-900/60' : 'bg-purple-100 text-purple-950 border-purple-300 hover:bg-purple-200')
                            }`}
                        >
                            <span className="flex items-center gap-1.5">
                                <Tag size={12} className={isDark ? 'text-purple-400' : 'text-purple-700'} />
                                <span>{offerApplied ? '10% Flat Offer Applied' : 'Apply Instant Offer'}</span>
                            </span>
                            <span className="text-[9px] uppercase tracking-wider font-black underline">
                                {offerApplied ? 'REMOVE' : 'APPLY (10%)'}
                            </span>
                        </button>

                        {offerApplied && (
                            <div className={`flex justify-between font-black ${
                                isDark ? 'text-emerald-400' : 'text-emerald-700'
                            }`}>
                                <span>Discount (10%)</span>
                                <span>- ₹{calculatedDiscount}.00 INR</span>
                            </div>
                        )}

                        <div className="flex justify-between font-bold">
                            <span className={isDark ? 'text-slate-400' : 'text-slate-700'}>Tax (GST 5%)</span>
                            <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{tax}.00 INR</span>
                        </div>

                        <div className={`flex justify-between items-center text-xs sm:text-sm pt-2 border-t ${
                            isDark ? 'border-slate-800' : 'border-slate-300'
                        }`}>
                            <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Net Payable</span>
                            <span className={`text-base font-black ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>₹{total}.00 INR</span>
                        </div>

                        {/* Payment Selector & QR Badge */}
                        <div className="flex items-center justify-between pt-0.5">
                            <div className="flex gap-1">
                                {['UPI', 'Cash', 'Card'].map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setPaymentMode(mode)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                                            paymentMode === mode 
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                                                : (isDark ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-100')
                                        }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                            <span className={`text-[10px] font-extrabold flex items-center gap-1 ${
                                isDark ? 'text-emerald-400' : 'text-emerald-700'
                            }`}>
                                <QrCode size={13} /> Dynamic QR
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <button 
                                onClick={() => {
                                    toast.success("KOT Sent to Kitchen!");
                                }}
                                className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25 transition-transform hover:scale-[1.01]"
                            >
                                <Printer size={13} />
                                <span>Send KOT</span>
                            </button>

                            <button 
                                onClick={() => {
                                    if (onNavigateLogin) onNavigateLogin();
                                    else toast.success(`Bill Paid ₹${total}.00 INR!`);
                                }}
                                className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 transition-transform hover:scale-[1.01]"
                            >
                                <CheckCircle2 size={13} />
                                <span>Checkout</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Animated Guided Cursor Element */}
                {cursorPos.visible && (
                    <div 
                        className="absolute pointer-events-none transition-all duration-700 ease-out z-50 flex flex-col items-center"
                        style={{
                            left: `${cursorPos.x}%`,
                            top: `${cursorPos.y}%`
                        }}
                    >
                        {/* Tooltip floating ABOVE cursor */}
                        {toastMessage && (
                            <div className="-translate-y-7 px-2.5 py-0.5 rounded-lg bg-slate-900 text-white border border-indigo-500/80 text-[10px] font-black shadow-xl backdrop-blur-md whitespace-nowrap animate-fade-in">
                                {toastMessage}
                            </div>
                        )}
                        <div className={`p-1 rounded-full bg-indigo-600 text-white shadow-xl transform transition-transform ${
                            cursorPos.clicking ? 'scale-75 bg-emerald-500 ring-4 ring-emerald-300/50' : 'scale-100 ring-2 ring-white/60 animate-bounce'
                        }`}>
                            <MousePointer2 size={15} className="fill-indigo-600 text-white" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MiniaturePOSSimulator;
