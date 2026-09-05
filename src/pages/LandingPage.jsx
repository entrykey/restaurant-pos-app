import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowRight,
    Zap,
    Boxes,
    FileText,
    Smartphone,
    BarChart3,
    Store,
    Moon,
    Sun,
    X,
    CheckCircle2,
    Scale,
    Mail,
    MapPin,
    Send,
    ChevronDown,
    ChevronUp,
    Printer,
    QrCode,
    Check,
    ShieldCheck,
    User,
    Phone,
    Building2,
    MessageSquare,
    ExternalLink,
    Clock,
    Plus,
    Minus,
    Trash2,
    ShoppingBag,
    Layers
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { shopService, contactService, itemService, categoryService } from '../services/api';
import toast from 'react-hot-toast';
import MiniaturePOSSimulator from '../components/MiniaturePOSSimulator';
import CommonSelect from '../components/ui/CommonSelect';

const LandingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { themeName, setTheme } = useTheme();

    const [scrolled, setScrolled] = useState(0);
    const [rawBusinessTypes, setRawBusinessTypes] = useState([]);
    const [selectedBtId, setSelectedBtId] = useState('');
    const [businessSubTypes, setBusinessSubTypes] = useState([]);
    const [selectedSubtypeId, setSelectedSubtypeId] = useState('');

    const [activeSolutionTab, setActiveSolutionTab] = useState(0);
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState(null);

    // Dynamic Items for POS Simulator
    const [availableItems, setAvailableItems] = useState([
        { id: '1', name: 'Special Burger Combo', price: 240, category: 'Food' },
        { id: '2', name: 'Cold Coffee (Large)', price: 120, category: 'Beverage' },
        { id: '3', name: 'Crispy French Fries', price: 90, category: 'Sides' },
        { id: '4', name: 'Veg Club Sandwich', price: 160, category: 'Food' }
    ]);

    // POS Simulator Cart
    const [simCart, setSimCart] = useState([
        { id: '1', name: 'Special Burger Combo', price: 240, qty: 2 },
        { id: '2', name: 'Cold Coffee (Large)', price: 120, qty: 1 }
    ]);
    const [paymentMode, setPaymentMode] = useState('UPI');

    // Contact Form State
    const [contactForm, setContactForm] = useState({
        name: '',
        email: '',
        phone: '',
        businessType: '',
        businessSubtype: '',
        message: ''
    });
    const [isSubmittingContact, setIsSubmittingContact] = useState(false);

    // Determine dark mode state
    const isDark = themeName === 'dark' || themeName === 'ocean';

    // SVG Logo selection: FILEPE_WHITE.svg for dark, FILEPE_BLUE.svg for light
    const logoSrc = isDark ? '/assets/FILEPE_WHITE.svg' : '/assets/FILEPE_BLUE.svg';

    // Fetch Business Types & Public Items dynamically from backend API
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY);
        window.addEventListener('scroll', handleScroll);

        const fetchInitialData = async () => {
            try {
                // Fetch dynamic Business Types
                const btData = await shopService.getBusinessTypes();
                if (Array.isArray(btData) && btData.length > 0) {
                    setRawBusinessTypes(btData);
                }
            } catch (error) {
                console.error("Failed to fetch initial backend data", error);
            }
        };

        fetchInitialData();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fetch subtypes when selected Business Type changes via CommonSelect
    const handleBusinessTypeSelect = async (btId, selectedOpt) => {
        setSelectedBtId(btId);

        const btName = selectedOpt ? (typeof selectedOpt === 'object' ? selectedOpt.label : selectedOpt) : '';

        setContactForm(prev => ({
            ...prev,
            businessType: btName,
            businessSubtype: ''
        }));
        setSelectedSubtypeId('');
        setBusinessSubTypes([]);

        if (btId) {
            try {
                const subTypesData = await shopService.getBusinessSubTypes(btId);
                if (Array.isArray(subTypesData) && subTypesData.length > 0) {
                    setBusinessSubTypes(subTypesData);
                    setSelectedSubtypeId('');
                }
            } catch (err) {
                console.error("Error fetching business sub-types:", err);
            }
        }
    };

    const handleSubtypeSelect = (subId, selectedOpt) => {
        setSelectedSubtypeId(subId);
        const subName = selectedOpt ? (typeof selectedOpt === 'object' ? selectedOpt.label : selectedOpt) : '';
        setContactForm(prev => ({ ...prev, businessSubtype: subName }));
    };

    // Meta theme-color update for browser toolbar
    useEffect(() => {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.setAttribute('content', isDark ? '#090A0F' : '#4F46E5');
    }, [isDark]);

    useEffect(() => {
        if (location.hash === '#terms') {
            setIsTermsOpen(true);
        }
    }, [location.hash]);

    const toggleTheme = () => {
        setTheme(isDark ? 'light' : 'dark');
    };

    // POS Terminal Helper Functions
    const addSimItem = (item) => {
        setSimCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { ...item, qty: 1 }];
        });
    };

    const updateSimQty = (id, delta) => {
        setSimCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.qty + delta;
                return newQty > 0 ? { ...item, qty: newQty } : null;
            }
            return item;
        }).filter(Boolean));
    };

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
            toast.error("Please fill your name, email address, and message.");
            return;
        }

        setIsSubmittingContact(true);
        const toastId = toast.loading("Submitting your inquiry...");

        const payload = {
            name: contactForm.name,
            email: contactForm.email,
            phone: contactForm.phone,
            businessType: contactForm.businessType,
            businessSubtype: contactForm.businessSubtype,
            message: contactForm.message,
            recipientEmail: 'filepeapp@gmail.com',
            company: 'Entrykey Business Solution LLP'
        };

        try {
            await contactService.sendContactInquiry(payload);
            toast.success("Thank you! Your message has been submitted to Entrykey Support.", { id: toastId });
        } catch (error) {
            console.log("Backend mailer fallback triggered:", error);
            toast.success("Message recorded! Launching direct mailer...", { id: toastId });
        } finally {
            setIsSubmittingContact(false);

            const mailtoSubject = encodeURIComponent(`FILEPE Website Inquiry - ${contactForm.name} (${contactForm.businessType}${contactForm.businessSubtype ? ' - ' + contactForm.businessSubtype : ''})`);
            const mailtoBody = encodeURIComponent(
                `Hello Entrykey Support,\n\nName: ${contactForm.name}\nEmail: ${contactForm.email}\nPhone: ${contactForm.phone || 'N/A'}\nBusiness Category: ${contactForm.businessType}\nBusiness Subtype: ${contactForm.businessSubtype || 'N/A'}\n\nMessage:\n${contactForm.message}\n\n---\nSent from FILEPE Billing Software Website`
            );

            setTimeout(() => {
                window.location.href = `mailto:filepeapp@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;
                setContactForm(prev => ({
                    ...prev,
                    name: '',
                    email: '',
                    phone: '',
                    message: ''
                }));
            }, 400);
        }
    };

    // Calculate SIM POS totals
    const simSubtotal = simCart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const simGst = Math.round(simSubtotal * 0.05);
    const simTotal = simSubtotal + simGst;

    const solutionsData = [
        {
            title: "Retail Stores & Supermarkets",
            subtitle: "Blazing fast barcode scanning, batch inventory control, and price-embedded weight scales.",
            stats: ["0.4s Barcode Scan", "Low-Stock Alerts", "GST Tax Categories"],
            highlights: [
                "Supports thermal receipt printers & cash drawers",
                "Batch & Expiry Date tracking for perishable goods",
                "Automated GST return generation (GSTR-1 & GSTR-3B ready)"
            ]
        },
        {
            title: "Restaurants & Cafes",
            subtitle: "Table management, Kitchen Display System (KDS), split billing, and KOT printing.",
            stats: ["Instant KOT Dispatch", "Table Floor Map", "Dine-in / Takeaway / Online"],
            highlights: [
                "Real-time order sync between waiters and kitchen staff",
                "Custom recipe & raw material inventory deduction",
                "Integrated Online Order aggregator management"
            ]
        },
        {
            title: "Wholesale & Distribution",
            subtitle: "Bulk ledger accounting, credit balance tracking, and multi-unit sales calculations.",
            stats: ["Bulk Invoice Generation", "Customer Credit Ledger", "HSN Code Directory"],
            highlights: [
                "Generate GST B2B e-invoices and e-way bill details",
                "Track supplier payments, purchase returns, and payables",
                "Custom discount schemes & volume pricing rules"
            ]
        },
        {
            title: "Services & Apparel",
            subtitle: "Barcode tagging, variant color/size matrices, and appointment billing.",
            stats: ["Size / Color Matrix", "Staff Commission", "WhatsApp Receipts"],
            highlights: [
                "Track employee sales performance and commission payouts",
                "Send paperless receipts directly via WhatsApp",
                "Multi-branch inventory transfer and central monitoring"
            ]
        }
    ];

    const faqs = [
        {
            q: "Is FILEPE compliant with Indian GST laws?",
            a: "Yes, 100%. FILEPE is engineered specifically for Indian businesses. It handles B2B and B2C invoices, HSN/SAC codes, state-wise tax splitting (CGST/SGST/IGST), and exports return-ready GSTR-1 and GSTR-3B files."
        },
        {
            q: "Can I use FILEPE on existing hardware like thermal printers and barcode scanners?",
            a: "Absolutely. FILEPE supports standard 2-inch and 3-inch thermal printers, ESC/POS hardware, USB & Wireless Barcode Scanners, Cash Drawers, and standard A4 printers without requiring expensive proprietary hardware."
        },
        {
            q: "How does the dynamic UPI QR code billing work?",
            a: "When finalizing an order, FILEPE generates a dynamic UPI QR code embedded directly with the exact bill amount. The customer scans it with any UPI app (GPay, PhonePe, Paytm), ensuring instant payment without manual entry errors."
        },
        {
            q: "Can I manage multiple shops or branches from one account?",
            a: "Yes! FILEPE offers multi-branch architecture. Business owners can view real-time consolidated reports, transfer stock between locations, and restrict staff permissions per branch."
        },
        {
            q: "Does FILEPE offer offline support during internet outages?",
            a: "Yes. The POS module continues billing seamlessly even if your internet connection drops, and automatically syncs data back to the cloud as soon as connection is restored."
        }
    ];

    const termsAndConditionsText = [
        {
            id: "1",
            title: "1. License and Usage",
            points: [
                "1.1. The Software is licensed, not sold. You are granted a limited, non-exclusive, non-transferable, and revocable license to use the Software for your business purposes.",
                "1.2. The license is subject to compliance with these Terms and applicable laws.",
                "1.3. You may not modify, copy, distribute, resell, or reverse-engineer the Software or any part of it.",
                "1.4. The Software must not be used for illegal or unauthorized transactions."
            ]
        },
        {
            id: "2",
            title: "2. Subscription and Payments",
            points: [
                "2.1. The Software offers both free and premium subscription plans. Premium plans require payment of a specified fee.",
                "2.2. Subscription fees are non-refundable once the license has been activated.",
                "2.3. Failure to renew a subscription before expiry may lead to the suspension of premium features.",
                "2.4. The Company reserves the right to modify pricing and subscription plans with prior notice.",
                "2.5. All charges are exclusive of applicable taxes unless otherwise specified."
            ]
        },
        {
            id: "3",
            title: "3. Features and Services",
            points: [
                "3.1. The Software provides billing, invoicing, inventory management, GST filing, and reporting features. Feature availability may vary based on the selected subscription plan.",
                "3.2. The Company reserves the right to add, modify, or discontinue features without prior notice.",
                "3.3. The Software may integrate with third-party services (e.g., UPI, WhatsApp, SMS gateways). The Company is not responsible for service interruptions, errors, or policies of third-party platforms."
            ]
        },
        {
            id: "4",
            title: "4. Data and Privacy",
            points: [
                "4.1. The Company values user privacy and ensures that user data is securely stored and processed.",
                "4.2. Users are responsible for maintaining accurate records and regularly backing up their data.",
                "4.3. The Company is not liable for data loss resulting from technical failures, user errors, or external factors.",
                "4.4. Refer to the Privacy Policy for more details on data handling and security practices."
            ]
        },
        {
            id: "5",
            title: "5. Liability and Disclaimers",
            points: [
                "5.1. The Software is provided \"as is\" without warranties of any kind. The Company does not guarantee uninterrupted or error-free operation.",
                "5.2. The Company is not responsible for any business losses, errors in invoices, financial discrepancies, or tax liabilities arising from the use of the Software.",
                "5.3. Users are responsible for verifying all invoices, reports, and tax calculations before submission to authorities.",
                "5.4. The Company shall not be liable for indirect, incidental, or consequential damages related to Software use."
            ]
        },
        {
            id: "6",
            title: "6. Termination of Service",
            points: [
                "6.1. The Company may terminate or suspend access to the Software without notice if the user violates these Terms.",
                "6.2. Upon termination, the user must cease using the Software and delete all copies.",
                "6.3. Users may voluntarily terminate their subscription, but no refunds will be issued for unused portions of the subscription period."
            ]
        },
        {
            id: "7",
            title: "7. Intellectual Property",
            points: [
                "7.1. The Software, its features, design, and all related intellectual property belong to Entrykey Business Solution LLP.",
                "7.2. Unauthorized reproduction, modification, or distribution of the Software is strictly prohibited.",
                "7.3. The Company reserves the right to take legal action against any infringement of its intellectual property."
            ]
        },
        {
            id: "8",
            title: "8. Governing Law and Dispute Resolution",
            points: [
                "8.1. These Terms are governed by the laws of India.",
                "8.2. Any disputes shall be resolved through arbitration in accordance with the Arbitration and Conciliation Act, 1996, and the arbitration venue shall be [City, India].",
                "8.3. Users agree to submit to the exclusive jurisdiction of courts in [City, India]."
            ]
        },
        {
            id: "9",
            title: "9. Amendments",
            points: [
                "9.1. The Company reserves the right to update or modify these Terms at any time.",
                "9.2. Users will be notified of significant changes via email or in-app notifications.",
                "9.3. Continued use of the Software after an update constitutes acceptance of the revised Terms."
            ]
        },
        {
            id: "10",
            title: "10. Support and Contact",
            points: [
                "For assistance, please contact:",
                "• Email: filepeapp@gmail.com",
                "By using FILEPE, you acknowledge and agree to these Terms and Conditions. If you do not agree, please discontinue use immediately."
            ]
        }
    ];

    return (
        <div className={`min-h-screen relative overflow-x-hidden font-sans transition-colors duration-300 ${isDark ? 'bg-[#090A0F] text-slate-100 selection:bg-indigo-500/30' : 'bg-slate-50 text-slate-900 selection:bg-indigo-500/20'
            }`}>
            {/* Header & Sticky Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${scrolled > 40
                ? (isDark ? 'bg-[#090A0F]/85 border-b border-slate-800/80 backdrop-blur-md shadow-2xl py-3.5' : 'bg-white/85 border-b border-slate-200 backdrop-blur-md shadow-md py-3.5')
                : 'py-6 bg-transparent'
                }`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    {/* Brand Logo */}
                    <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <img
                            src={logoSrc}
                            alt="FILEPE Logo"
                            className="h-9 sm:h-10 object-contain transition-transform hover:scale-105"
                        />
                        <span className="hidden sm:inline-block text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                            Entrykey
                        </span>
                    </div>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-tight">
                        <a href="#features" className={`transition-colors ${isDark ? 'hover:text-indigo-400 text-slate-300' : 'hover:text-indigo-600 text-slate-700'}`}>Features</a>
                        <a href="#solutions" className={`transition-colors ${isDark ? 'hover:text-indigo-400 text-slate-300' : 'hover:text-indigo-600 text-slate-700'}`}>Solutions</a>
                        <a href="#faq" className={`transition-colors ${isDark ? 'hover:text-indigo-400 text-slate-300' : 'hover:text-indigo-600 text-slate-700'}`}>FAQ</a>
                        <a href="#contact" className={`transition-colors ${isDark ? 'hover:text-indigo-400 text-slate-300' : 'hover:text-indigo-600 text-slate-700'}`}>Contact Us</a>
                    </div>

                    {/* Theme Toggle & CTA */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            className={`p-2.5 rounded-full transition-all border ${isDark
                                ? 'bg-slate-800/60 border-slate-700 text-amber-300 hover:bg-slate-800 hover:scale-105'
                                : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200 hover:scale-105'
                                }`}
                        >
                            {isDark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-600/50 hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <span>Become a Partner</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 max-w-[1440px] mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">

                    {/* Hero Left Content */}
                    <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 text-xs font-bold tracking-wide">
                            <ShieldCheck size={14} className="text-emerald-400" />
                            <span>Developed by Entrykey Business Solution LLP</span>
                        </div>

                        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08]">
                            FilePe - The Complete <span className="bg-gradient-to-r from-indigo-400 via-indigo-500 to-purple-400 bg-clip-text text-transparent">POS & Billing Engine</span> Built for Growth.
                        </h1>

                        <p className={`text-base sm:text-lg max-w-2xl font-normal leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Streamline your entire business with lightning-fast POS checkout, 100% GST filing compliance, dynamic UPI QR payments, WhatsApp receipts, and multi-branch inventory.
                        </p>

                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                            <button
                                onClick={() => navigate('/login')}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-xl shadow-xl shadow-indigo-600/30 hover:scale-105 transition-all flex items-center gap-3"
                            >
                                <span>Get Started / Login</span>
                                <ArrowRight size={18} />
                            </button>
                            <a
                                href="#contact"
                                className={`px-7 py-4 font-bold text-sm rounded-xl border transition-all flex items-center gap-2 ${isDark
                                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                                    : 'bg-white border-slate-300 hover:border-slate-400 text-slate-800 shadow-sm'
                                    }`}
                            >
                                <Mail size={16} className="text-indigo-500" />
                                <span>Contact Sales</span>
                            </a>
                        </div>

                        {/* Value Metrics */}
                        <div className="pt-8 border-t border-slate-800/40 grid grid-cols-3 gap-6 text-center lg:text-left">
                            <div>
                                <p className="text-2xl sm:text-3xl font-black text-indigo-500">0.4s</p>
                                <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Avg Bill Print</p>
                            </div>
                            <div>
                                <p className="text-2xl sm:text-3xl font-black text-emerald-400">100%</p>
                                <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>GST Compliant</p>
                            </div>
                            <div>
                                <p className="text-2xl sm:text-3xl font-black text-purple-400">24 / 7</p>
                                <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cloud Sync</p>
                            </div>
                        </div>
                    </div>

                    {/* Hero Right Miniature Interactive Animated App POS Simulator */}
                    <div className="lg:col-span-7">
                        <MiniaturePOSSimulator
                            isDark={isDark}
                            onNavigateLogin={() => navigate('/login')}
                        />
                    </div>
                </div>
            </section>

            {/* Core Features Grid Section */}
            <section id="features" className={`py-24 border-t ${isDark ? 'border-slate-800/60 bg-slate-950/50' : 'border-slate-200 bg-white'}`}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
                        <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-500">Built For Perfection</p>
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight">Engineered to Power Every Transaction</h2>
                        <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            No bloated tools. FILEPE gives retail stores and restaurants clean, high-performance features.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className={`p-8 rounded-3xl border transition-all ${isDark ? 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/40'
                            }`}>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6">
                                <Zap size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Instant POS & Printing</h3>
                            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Sub-second billing with barcode support, custom shortcuts, and direct ESC/POS thermal printer communication.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className={`p-8 rounded-3xl border transition-all ${isDark ? 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/40'
                            }`}>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
                                <FileText size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">100% GST Return Compliance</h3>
                            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Automated HSN/SAC classification, split CGST/SGST/IGST reports, and single-click GSTR filing exports.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className={`p-8 rounded-3xl border transition-all ${isDark ? 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/40'
                            }`}>
                            <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center mb-6">
                                <Boxes size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Real-time Stock Management</h3>
                            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Automatic inventory updates upon every sale, low-stock notifications, batch expiry tracking, and unit conversions.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className={`p-8 rounded-3xl border transition-all ${isDark ? 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/40'
                            }`}>
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-6">
                                <Smartphone size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">WhatsApp & Digital Receipts</h3>
                            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Go paperless by sending formatted PDF receipts directly to customers&apos; WhatsApp numbers instantly.
                            </p>
                        </div>

                        {/* Feature 5 */}
                        <div className={`p-8 rounded-3xl border transition-all ${isDark ? 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/40'
                            }`}>
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6">
                                <BarChart3 size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Profit & Sales Analytics</h3>
                            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Daily revenue trends, margin breakdowns, top selling items, expense tracking, and employee audit logs.
                            </p>
                        </div>

                        {/* Feature 6 */}
                        <div className={`p-8 rounded-3xl border transition-all ${isDark ? 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/40'
                            }`}>
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-6">
                                <Store size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Multi-Branch Architecture</h3>
                            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Centralized owner dashboard for managing multiple store branches, role permissions, and inventory transfers.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Solutions Tabbed Interactive Section */}
            <section id="solutions" className="py-24 max-w-7xl mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-500">Tailored Modules</p>
                    <h2 className="text-3xl sm:text-5xl font-black tracking-tight">Built for Your Specific Industry</h2>
                </div>

                {/* Tab buttons */}
                <div className="flex flex-wrap justify-center gap-3 mb-12">
                    {solutionsData.map((sol, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveSolutionTab(idx)}
                            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all ${activeSolutionTab === idx
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30'
                                : (isDark ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200')
                                }`}
                        >
                            {sol.title}
                        </button>
                    ))}
                </div>

                {/* Active Tab Content Card */}
                <div className={`p-8 sm:p-12 rounded-3xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xl'
                    }`}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-7 space-y-6">
                            <h3 className="text-2xl sm:text-3xl font-black">{solutionsData[activeSolutionTab].title}</h3>
                            <p className={`text-sm sm:text-base ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                {solutionsData[activeSolutionTab].subtitle}
                            </p>

                            <div className="space-y-3 pt-2">
                                {solutionsData[activeSolutionTab].highlights.map((h, i) => (
                                    <div key={i} className="flex items-center gap-3 text-xs sm:text-sm font-semibold">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                                            <Check size={12} />
                                        </div>
                                        <span>{h}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-5 flex flex-col gap-4">
                            {solutionsData[activeSolutionTab].stats.map((stat, i) => (
                                <div key={i} className={`p-4 rounded-2xl border flex items-center gap-3 ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                                    }`}>
                                    <CheckCircle2 size={18} className="text-indigo-400" />
                                    <span className="text-xs sm:text-sm font-bold">{stat}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Accordion Section */}
            <section id="faq" className={`py-24 border-t ${isDark ? 'border-slate-800/60 bg-slate-950/40' : 'border-slate-200 bg-slate-100/60'}`}>
                <div className="max-w-4xl mx-auto px-6">
                    <div className="text-center mb-14 space-y-3">
                        <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-500">Got Questions?</p>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Frequently Asked Questions</h2>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, idx) => (
                            <div
                                key={idx}
                                className={`rounded-2xl border transition-all overflow-hidden ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                                    }`}
                            >
                                <button
                                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                                    className="w-full p-6 text-left flex items-center justify-between font-bold text-sm sm:text-base gap-4"
                                >
                                    <span>{faq.q}</span>
                                    {openFaqIndex === idx ? <ChevronUp size={18} className="text-indigo-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                </button>
                                {openFaqIndex === idx && (
                                    <div className={`px-6 pb-6 text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* High-End Contact Us Section with Dynamic Backend Business Types & Subtypes */}
            <section id="contact" className="py-24 max-w-7xl mx-auto px-6 relative">

                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/10 via-purple-600/10 to-emerald-500/10 blur-[150px] pointer-events-none rounded-full" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch relative z-10">

                    {/* Left Office Location & Info Card */}
                    <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-xs font-extrabold uppercase tracking-widest border border-indigo-500/20">
                                <Mail size={14} />
                                <span>Direct Support & Sales</span>
                            </div>
                            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                                Let&apos;s Build Your Business Together
                            </h2>
                            <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Have questions about onboarding, enterprise pricing, or custom hardware setup? Reach out directly to our team in Technopark, Trivandrum.
                            </p>
                        </div>

                        {/* Location Details Card */}
                        <div className={`p-8 rounded-3xl border space-y-6 relative overflow-hidden transition-all shadow-xl ${isDark
                            ? 'bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-indigo-950/40 border-slate-800 shadow-indigo-950/20'
                            : 'bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/20 border-slate-200 shadow-xl'
                            }`}>
                            <div className="flex items-start gap-4">
                                <div className="p-3.5 rounded-2xl bg-indigo-600 text-white flex-shrink-0 shadow-lg shadow-indigo-600/30">
                                    <MapPin size={22} />
                                </div>
                                <div className="text-xs sm:text-sm space-y-1.5">
                                    <p className="font-black text-base tracking-tight">Entrykey Business Solution LLP</p>
                                    <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>Thejaswini, Technopark Phase I</p>
                                    <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>Technopark Rd, Technopark Campus</p>
                                    <p className="font-extrabold text-indigo-400">Trivandrum, Kerala - 695581</p>

                                    <a
                                        href="https://maps.google.com/?q=Technopark+Phase+1+Trivandrum"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-400 hover:text-indigo-300 pt-2 transition-colors"
                                    >
                                        <span>Open in Google Maps</span>
                                        <ExternalLink size={13} />
                                    </a>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-800/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-extrabold uppercase text-slate-400">Email Us</p>
                                        <a href="mailto:filepeapp@gmail.com" className="text-xs font-extrabold text-indigo-400 hover:underline">
                                            filepeapp@gmail.com
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 flex-shrink-0">
                                        <Clock size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-extrabold uppercase text-slate-400">Support Hours</p>
                                        <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                            <CheckCircle2 size={12} /> 24 Hours Support
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Interactive Form Card */}
                    <div className="lg:col-span-7">
                        <form
                            onSubmit={handleContactSubmit}
                            className={`p-8 sm:p-10 rounded-3xl border space-y-6 transition-all shadow-2xl relative ${isDark
                                ? 'bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950 border-slate-800 shadow-indigo-950/30'
                                : 'bg-white border-slate-200 shadow-2xl'
                                }`}
                        >
                            <div>
                                <h3 className="text-2xl font-black tracking-tight mb-1">Send Us a Direct Message</h3>
                                <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Fill out the form below and our team will assist you with onboarding, pricing, or custom hardware setup.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-extrabold uppercase tracking-wider mb-2 text-slate-400 flex items-center gap-1.5">
                                        <User size={13} />
                                        <span>Your Name *</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={contactForm.name}
                                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                        placeholder="Fill your name"
                                        className={`w-full px-4 py-3.5 rounded-2xl border text-xs sm:text-sm outline-none transition-all ${isDark
                                            ? 'bg-slate-800/40 border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-500'
                                            : 'bg-slate-50 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 placeholder-slate-400'
                                            }`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-extrabold uppercase tracking-wider mb-2 text-slate-400 flex items-center gap-1.5">
                                        <Mail size={13} />
                                        <span>Email Address *</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={contactForm.email}
                                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                        placeholder="Fill your email address"
                                        className={`w-full px-4 py-3.5 rounded-2xl border text-xs sm:text-sm outline-none transition-all ${isDark
                                            ? 'bg-slate-800/40 border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-500'
                                            : 'bg-slate-50 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 placeholder-slate-400'
                                            }`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-extrabold uppercase tracking-wider mb-2 text-slate-400 flex items-center gap-1.5">
                                        <Phone size={13} />
                                        <span>Phone Number</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={contactForm.phone}
                                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                                        placeholder="Fill your phone number"
                                        className={`w-full px-4 py-3.5 rounded-2xl border text-xs sm:text-sm outline-none transition-all ${isDark
                                            ? 'bg-slate-800/40 border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-500'
                                            : 'bg-slate-50 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 placeholder-slate-400'
                                            }`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-extrabold uppercase tracking-wider mb-2 text-slate-400 flex items-center gap-1.5">
                                        <Building2 size={13} />
                                        <span>Business Category</span>
                                    </label>
                                    <CommonSelect
                                        options={rawBusinessTypes.length > 0
                                            ? rawBusinessTypes.map(bt => ({ label: bt.displayString || bt.name, value: bt._id || bt.id }))
                                            : [
                                                { label: 'Retail Store & Supermarket', value: 'retail' },
                                                { label: 'Restaurant & Cafe', value: 'restaurant' },
                                                { label: 'Wholesale & Distribution', value: 'wholesale' },
                                                { label: 'Apparel & Fashion', value: 'apparel' },
                                                { label: 'Electronics & Hardware', value: 'electronics' },
                                                { label: 'Services & Salons', value: 'services' }
                                            ]
                                        }
                                        value={selectedBtId}
                                        onChange={handleBusinessTypeSelect}
                                        placeholder="Select Business Category..."
                                        searchPlaceholder="Search Category..."
                                        icon={Building2}
                                    />
                                </div>
                            </div>

                            {/* Dynamic Business Sub-Category Selection (Shown ONLY AFTER selecting Business Category) */}
                            {selectedBtId && businessSubTypes.length > 0 && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="block text-xs font-extrabold uppercase tracking-wider mb-2 text-slate-400 flex items-center gap-1.5">
                                        <Layers size={13} />
                                        <span>Business Sub-Category</span>
                                    </label>
                                    <CommonSelect
                                        options={businessSubTypes.map(sub => ({ label: sub.displayString || sub.name, value: sub._id || sub.id }))}
                                        value={selectedSubtypeId}
                                        onChange={handleSubtypeSelect}
                                        placeholder="Select Business Sub-Category..."
                                        searchPlaceholder="Search Sub-Category..."
                                        icon={Layers}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider mb-2 text-slate-400 flex items-center gap-1.5">
                                    <MessageSquare size={13} />
                                    <span>Your Message *</span>
                                </label>
                                <textarea
                                    rows="4"
                                    required
                                    value={contactForm.message}
                                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                    placeholder="Fill your message..."
                                    className={`w-full px-4 py-3.5 rounded-2xl border text-xs sm:text-sm outline-none transition-all ${isDark
                                        ? 'bg-slate-800/40 border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-500'
                                        : 'bg-slate-50 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 placeholder-slate-400'
                                        }`}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmittingContact}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] transition-all flex items-center justify-center gap-2.5"
                            >
                                <Send size={18} />
                                <span>{isSubmittingContact ? "Submitting Inquiry..." : "Submit Inquiry to Support"}</span>
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className={`py-12 border-t ${isDark ? 'border-slate-800/60 bg-slate-950 text-slate-400' : 'border-slate-200 bg-white text-slate-600'}`}>
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <img src={logoSrc} alt="FILEPE Logo" className="h-8 object-contain" />
                        <div className="text-xs">
                            <p className="font-bold text-slate-300">FILEPE Billing Software</p>
                            <p className="text-[11px] opacity-75">Entrykey Business Solution LLP</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold">
                        <button onClick={() => setIsTermsOpen(true)} className="hover:text-indigo-400 transition-colors">Terms & Conditions</button>
                        <a href="mailto:filepeapp@gmail.com" className="hover:text-indigo-400 transition-colors flex items-center gap-1">
                            <Mail size={14} />
                            filepeapp@gmail.com
                        </a>
                    </div>

                    <p className="text-xs text-slate-500 font-medium">
                        &copy; {new Date().getFullYear()} Entrykey Business Solution LLP. All rights reserved.
                    </p>
                </div>
            </footer>

            {/* Terms & Conditions Modal */}
            {isTermsOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className={`relative w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${isDark ? 'bg-[#0f111a] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                        }`}>
                        {/* Modal Header */}
                        <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
                                    <Scale size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black tracking-tight">Terms and Conditions</h2>
                                    <p className="text-xs text-indigo-400 font-bold">Entrykey Business Solution LLP - FILEPE Billing Software</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsTermsOpen(false)}
                                className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'}`}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-xs md:text-sm leading-relaxed font-sans">
                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
                                <p className="font-semibold">
                                    These Terms and Conditions (&quot;Terms&quot;) govern the use of the FILEPE billing software (&quot;Software&quot;), developed and provided by Entrykey Business Solution LLP (&quot;Company&quot;). By downloading, installing, or using the Software, you agree to these Terms. If you do not agree, please discontinue use immediately.
                                </p>
                            </div>

                            {termsAndConditionsText.map((term) => (
                                <div key={term.id} className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <h3 className="text-base font-black text-indigo-400 mb-3">{term.title}</h3>
                                    <div className="space-y-2">
                                        {term.points.map((pt, idx) => (
                                            <p key={idx} className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                                                {pt}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <div className={`p-5 rounded-2xl border text-center ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`}>
                                <p className="font-extrabold text-sm">Support & Official Inquiries</p>
                                <p className="text-xs mt-1">Email: <a href="mailto:filepeapp@gmail.com" className="underline font-bold">filepeapp@gmail.com</a></p>
                                <p className="text-[11px] opacity-80 mt-2">By using FILEPE, you acknowledge and agree to these Terms and Conditions.</p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className={`p-4 border-t flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                            <span className="text-xs text-slate-500 font-medium">Entrykey Business Solution LLP</span>
                            <button
                                onClick={() => setIsTermsOpen(false)}
                                className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-500 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
