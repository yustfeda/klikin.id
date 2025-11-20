
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { User } from '../types';
import { HomeIcon, ProductIcon, InfoIcon, LoginIcon, SearchIcon, XMarkIcon, ClockIcon, LockIcon, SunIcon, GlobeAltIcon, MapPinIcon, CalendarIcon, EnvelopeIcon, WhatsappIcon, CheckIcon, PlusIcon, MinusIcon, CartIcon } from '../components/Icons';
import { Product } from '../types';
import { subscribeToProducts, loginUser, registerUser, subscribeToBanner } from '../services/firebase';

// Improved CachedImage using LocalStorage
const CachedImage = ({ src, alt, className }: { src: string, alt: string, className?: string }) => {
    const [imgSrc, setImgSrc] = useState<string>(src);

    useEffect(() => {
        if (!src) return;
        const generateKey = (str: string) => `img_${str.length}_${str.slice(0, 20)}_${str.slice(-20)}`;
        const cacheKey = generateKey(src);
        
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                setImgSrc(cached);
            } else {
                if (src.startsWith('data:image')) {
                    try {
                        localStorage.setItem(cacheKey, src);
                    } catch (e) {
                         // Quota limit hit, ignore
                    }
                }
                setImgSrc(src);
            }
        } catch (e) {
            setImgSrc(src);
        }
    }, [src]);

    return <img src={imgSrc} alt={alt} className={className} loading="lazy" />;
};

const ProductCountdown = ({ targetDate }: { targetDate: number }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!targetDate) return;
        
        const updateTimer = () => {
            const now = Date.now();
            const diff = targetDate - now;

            if (diff <= 0) {
                setTimeLeft('Available Now');
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                
                if (days > 0) {
                    setTimeLeft(`${days}d ${hours}h ${minutes}m`);
                } else {
                    setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
                }
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    if (!targetDate) return null;

    return (
        <div className="text-center text-yellow-700 font-bold text-[10px] drop-shadow-sm mb-0.5">
            {timeLeft}
        </div>
    );
};

const ProductCard: React.FC<{ product: Product; onAction: (product: Product) => void }> = ({ product, onAction }) => {
    const sold = product.totalSold;
    const remaining = product.stock;
    const stockText = `${sold} / ${remaining}`;
    const total = sold + remaining;
    const barWidth = total > 0 ? (sold / total) * 100 : 0;

    const getExtraInfoIcon = (type?: string) => {
        switch(type) {
            case 'lokasi': return <MapPinIcon />;
            case 'waktu': return <ClockIcon />;
            case 'tanggal': return <CalendarIcon />;
            case 'email': return <EnvelopeIcon className="w-3 h-3" />;
            case 'wa': return <WhatsappIcon />;
            case 'web': return <GlobeAltIcon className="w-3 h-3" />;
            default: return <InfoIcon />;
        }
    };

    // Adjusted button width to match stock bar alignment (mx-2)
    const buttonBaseClass = "group w-[calc(100%-16px)] mx-2 mb-4 h-9 rounded-lg font-metropolis font-bold tracking-wide text-[10px] sm:text-xs shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-1.5 mt-auto duration-300 ease-in-out";

    const getButton = () => {
        const isClosed = product.isSaleClosed || product.stock === 0;
        
        if (product.isComingSoon && !isClosed) {
             return (
                <div className="flex flex-col w-full px-2 mb-4">
                    {product.releaseDate && <ProductCountdown targetDate={product.releaseDate} />}
                    <div className={`w-full h-9 rounded-lg font-metropolis font-bold tracking-wide text-[10px] shadow-sm flex items-center justify-center gap-1.5 bg-yellow-200 text-yellow-900 border-b-2 border-yellow-400 cursor-not-allowed`}>
                        <ClockIcon />
                        <span className="uppercase">Segera Hadir</span>
                    </div>
                </div>
            );
        }
        
        if (isClosed) {
            return (
                <div className={`${buttonBaseClass} bg-gray-800 text-white border-b-2 border-gray-900 cursor-not-allowed flex-col !gap-0 !py-0 !h-auto min-h-[36px]`}>
                    <div className="flex items-center gap-1 leading-none mt-1">
                        <LockIcon />
                        <span className="uppercase">Close</span>
                    </div>
                    <span className="text-[8px] font-sans font-normal opacity-75 leading-none pb-1">{product.totalSold} Terjual</span>
                </div>
            );
        }
        
        return (
            <button onClick={() => onAction(product)} className={`${buttonBaseClass} bg-brand-red text-white border-b-2 border-red-800 hover:bg-red-700 hover:shadow-red-600/50`}>
                <span className="mt-0.5 uppercase">Beli Sekarang</span>
                <span className="transform transition-transform duration-300 group-hover:translate-x-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                </span>
            </button>
        );
    };

    return (
        <div className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 ease-out flex flex-col h-auto border border-gray-100 w-[94%] sm:w-full mx-auto transform hover:-translate-y-1 relative z-10">
            {/* Image: Smaller on Desktop (md:h-36) for compact look */}
            <div className="relative w-full h-48 sm:h-44 md:h-36 overflow-hidden">
                <CachedImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                
                {(product.isSaleClosed || product.stock === 0) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md animate-pulse-slow">
                            <span className="text-brand-red font-bold text-[10px] transform -rotate-12 border-2 border-brand-red px-1 rounded-sm">HABIS</span>
                        </div>
                    </div>
                )}
                {product.isComingSoon && !product.isSaleClosed && product.stock > 0 && (
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                            <span className="text-brand-orange font-bold text-[10px]">SOON</span>
                        </div>
                    </div>
                )}

                {/* Badges */}
                <div className="absolute bottom-2 left-0 w-full px-2 flex justify-between items-end pointer-events-none z-20">
                     {product.discountPercent > 0 && (
                        <div className="bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow-lg border border-white/20 transform -rotate-2 animate-pulse-slow">
                            {product.discountPercent}% OFF
                        </div>
                    )}
                     {product.saleTag && (
                        <div className="ml-auto bg-brand-blue text-white text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wide flex items-center gap-1 shadow-lg border border-white/20">
                            <SunIcon />
                            {product.saleTag}
                        </div>
                    )}
                </div>
                
                <div className="absolute top-2 left-2 z-20">
                    <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold shadow-sm ${product.category === 'digital' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                        {product.category === 'digital' ? 'Web / Digital' : 'Fisik'}
                    </span>
                </div>
            </div>

            {/* Content: Compact layout (p-0 wrapper) */}
            <div className="flex flex-col flex-grow relative z-10 bg-white">
                {/* Title */}
                <div className="pt-2 px-2 mb-4">
                    <h3 className="font-bold text-lg sm:text-xl truncate text-gray-900 text-left leading-tight group-hover:text-brand-red transition-colors">{product.name}</h3>
                </div>
                
                {/* Extra Info - mx-2 spacing, my-4 vertical spacing */}
                {product.extraInfo && product.extraInfo.length > 0 && (
                    <div className="my-4 bg-gray-50 py-1 px-2 mx-2 rounded border border-gray-100 space-y-1">
                        {product.extraInfo.map((info, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[9px] text-gray-700">
                                <div className="w-3 h-3 flex-shrink-0 flex items-center justify-center text-brand-blue [&>svg]:w-full [&>svg]:h-full">
                                    {getExtraInfoIcon(info.iconType)}
                                </div>
                                <p className="flex-grow text-left leading-tight truncate">
                                    <span className="font-bold text-gray-800 uppercase mr-1">{info.label}:</span>
                                    <span>{info.value}</span>
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-auto px-2">
                     {/* Prices - Left Aligned */}
                    <div className="mb-4 text-left">
                         {/* Original Price (Strikethrough) */}
                        {product.originalPrice > product.discountedPrice && (
                            <span className="text-[10px] text-gray-400 line-through block mb-0.5 text-left">Rp{product.originalPrice.toLocaleString('id-ID')}</span>
                        )}
                        <p className="text-sm sm:text-base font-bold text-brand-red text-left">Rp{product.discountedPrice.toLocaleString('id-ID')}</p>
                    </div>

                    {/* Stock Bar */}
                    {!product.isSaleClosed && !product.isComingSoon && product.stock > 0 && (
                        <div className="mb-4">
                             <div className="flex items-center justify-between gap-1 mb-1">
                                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden border border-gray-200">
                                    <div className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full transition-all duration-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" style={{ width: `${barWidth}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-500 font-mono font-bold whitespace-nowrap">{stockText}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {getButton()}
        </div>
    );
};

const Logo = () => (
    <h1 className="flex items-baseline select-none cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth'})}>
        <div className="flex items-baseline tracking-tighter gap-0.5">
             {/* Removed drop-shadow */}
            <span className="font-vanguard text-brand-orange text-2xl sm:text-3xl tracking-wide leading-none">
                KELIK
            </span>
            <span className="font-aerion font-bold italic text-brand-blue text-lg sm:text-xl tracking-wide leading-none">
                in.com
            </span>
        </div>
    </h1>
);

const LoadingScreen = () => (
    <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
        <div className="animate-bounce mb-6">
            <Logo />
        </div>
        <div className="w-12 h-12 border-4 border-gray-200 border-t-brand-red border-b-brand-orange rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-bold text-gray-500 animate-pulse tracking-widest uppercase">Memuat Data...</p>
    </div>
);

const GuestPanel: React.FC = () => {
    const [view, setView] = useState('home');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [banner, setBanner] = useState<string | null>(null);
    const [isGuestBuyModalOpen, setIsGuestBuyModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const auth = useAuth();

    useEffect(() => {
        const unsubscribeProd = subscribeToProducts(setProducts);
        const unsubscribeBanner = subscribeToBanner(setBanner);
        return () => {
            unsubscribeProd();
            unsubscribeBanner();
        };
    }, []);

    const handleAction = (product: Product) => {
        setIsGuestBuyModalOpen(true);
    };

    const openLoginModal = (register = false) => {
        setIsRegisterMode(register);
        setLoginModalOpen(true);
        setIsGuestBuyModalOpen(false); 
    };

    const guestNavItems = [
        { name: 'Beranda', icon: <HomeIcon />, view: 'home' },
        { name: 'Katalog', icon: <ProductIcon />, view: 'catalog' },
        { name: 'Info Toko', icon: <InfoIcon />, view: 'info' },
        { name: 'Login/Register', icon: <LoginIcon />, action: () => openLoginModal() },
    ];

    const handleNavClick = (item: any) => {
        if (item.action) {
            item.action();
        } else if (item.view) {
            if(view === item.view) {
                 setSidebarOpen(false);
                 return;
            }
            
            setIsLoading(true);
            setSidebarOpen(false);
            
            setTimeout(() => {
                setView(item.view);
                setIsLoading(false);
            }, 500);
        }
    };

    const HamburgerIcon = ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) => (
        <button onClick={onClick} className="z-50 w-8 h-8 relative focus:outline-none md:hidden transition-all duration-300">
            <span className={`block w-5 h-0.5 bg-gray-800 absolute transition-all duration-300 ease-in-out left-1/2 -translate-x-1/2 ${isOpen ? 'rotate-45 top-1/2 -translate-y-1/2' : 'top-[32%]'}`}></span>
            <span className={`block w-5 h-0.5 bg-gray-800 absolute transition-all duration-300 ease-in-out left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 ${isOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-5 h-0.5 bg-gray-800 absolute transition-all duration-300 ease-in-out left-1/2 -translate-x-1/2 ${isOpen ? '-rotate-45 top-1/2 -translate-y-1/2' : 'top-[68%]'}`}></span>
        </button>
    );

    const NavLink: React.FC<{ item: any; isActive: boolean; onClick: () => void; isSidebar?: boolean }> = ({ item, isActive, onClick, isSidebar }) => (
        <button onClick={onClick} className={`group relative flex items-center ${isSidebar ? 'justify-start w-full pl-4' : 'justify-center'} px-3 py-2 rounded-md text-[10px] md:text-sm font-medium transition-all duration-300 ease-in-out ${isActive ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30' : 'text-gray-600 hover:bg-gray-100 hover:text-brand-red'}`}>
            <span className={`transform transition-transform duration-300 ${!isSidebar && 'group-hover:scale-110'} ${isSidebar && 'group-hover:translate-x-2'} ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
            {isSidebar && <span className="ml-3 font-teko text-base tracking-wide pt-0.5 transition-transform duration-300 group-hover:translate-x-1">{item.name}</span>}
            {!isSidebar && (
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-auto p-2 min-w-max bg-gray-800 text-white text-[10px] rounded-md scale-0 group-hover:scale-100 transition-all duration-300 z-10 shadow-lg pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                    {item.name}
                </span>
            )}
        </button>
    );

    const renderContent = () => {
        const components: { [key: string]: React.ReactNode } = {
            'home': <GuestHome products={products} banner={banner} onNavigateCatalog={() => handleNavClick({view: 'catalog'})} onProductClick={handleAction} onAuthClick={openLoginModal} />,
            'catalog': <GuestCatalog products={products} onAction={handleAction} />,
            'info': <GuestInfo />,
        };
        return (
            <div key={view} className="animate-in fade-in duration-500 ease-in-out pb-8">
                {components[view] || components['home']}
            </div>
        );
    };
    
    useEffect(() => {
      if (isLoginModalOpen || isGuestBuyModalOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'auto';
      }
    }, [isLoginModalOpen, isGuestBuyModalOpen]);

    return (
        <div className="flex-grow w-full bg-gray-50 font-sans flex flex-col min-h-screen">
             {isLoading && <LoadingScreen />}
             <header className="bg-white/90 backdrop-blur-md fixed top-0 left-0 right-0 z-40 items-center justify-between px-4 sm:px-6 py-2 shadow-sm flex transition-all duration-500 h-14">
                <Logo />
                <nav className="hidden md:flex items-center space-x-4">
                    {guestNavItems.map(item => (
                        <NavLink key={item.name} item={item} isActive={view === item.view} onClick={() => handleNavClick(item)} />
                    ))}
                </nav>
                <HamburgerIcon isOpen={isSidebarOpen} onClick={() => setSidebarOpen(!isSidebarOpen)} />
            </header>

            <div className={`fixed top-0 left-0 h-full w-64 bg-white/90 backdrop-blur-md z-50 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:hidden shadow-2xl border-r border-gray-200`}>
                <div className="p-4 mb-2 mt-2">
                    <Logo />
                </div>
                <nav className="flex flex-col px-3 space-y-1">
                    {guestNavItems.map(item => (
                        <NavLink key={item.name} item={item} isActive={view === item.view} onClick={() => handleNavClick(item)} isSidebar={true} />
                    ))}
                </nav>
            </div>
            {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-transparent backdrop-blur-sm z-40 md:hidden transition-all duration-500" />}

            <main className="flex-grow pt-16 px-2 sm:px-6 lg:px-8 min-h-screen pb-10">
                {renderContent()}
            </main>

            {isLoginModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-300 ease-out" onClick={() => setLoginModalOpen(false)}>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-md overflow-hidden transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setLoginModalOpen(false)} className="absolute top-3 right-3 text-gray-400 hover:text-brand-red transition-colors z-10">
                           <XMarkIcon />
                        </button>
                        <LoginRegister isRegister={isRegisterMode} setIsRegister={setIsRegisterMode} close={() => setLoginModalOpen(false)} />
                    </div>
                </div>
            )}

             {isGuestBuyModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-300 ease-out" onClick={() => setIsGuestBuyModalOpen(false)}>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden transform transition-all scale-100 p-5 flex flex-col items-center text-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setIsGuestBuyModalOpen(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors">
                           <XMarkIcon />
                        </button>
                        
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mb-3 animate-bounce">
                             <InfoIcon />
                        </div>
                        
                        <h3 className="text-base font-bold text-gray-800 mb-1">Perhatian!</h3>
                        <p className="text-gray-600 font-medium mb-3 text-xs">Buat akun dulu baru beli</p>
                        
                        <div className="w-24 h-auto mx-auto rounded-lg overflow-hidden mb-4 bg-transparent mix-blend-multiply">
                            <img src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExcmp1cDh0and5OWxoM3FsdnU0YnBpeWpsaWJkZjU2dHkycXZ3bTN4byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/H6EVk5HyKbWEmAbP3m/giphy.gif" alt="Register" className="w-full h-full object-contain" />
                        </div>

                        <div className="flex w-full gap-2">
                            <button onClick={() => setIsGuestBuyModalOpen(false)} className="flex-1 py-2 border border-gray-300 rounded-lg font-metropolis font-bold tracking-wide text-[10px] text-gray-600 hover:bg-gray-50 transition-colors uppercase">Nanti Saja</button>
                            <button onClick={() => openLoginModal(true)} className="flex-1 py-2 bg-brand-red text-white rounded-lg font-metropolis font-bold tracking-wide text-[10px] hover:bg-red-700 shadow-lg transition-colors uppercase">Daftar Akun</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const GuestHome: React.FC<{ products: Product[], banner: string | null, onNavigateCatalog: () => void, onProductClick: (p: Product) => void, onAuthClick: (register: boolean) => void }> = ({ products, banner, onNavigateCatalog, onProductClick, onAuthClick }) => (
    <div className="text-center py-4 sm:py-8">
        {banner && (
            // Reduced max-height on desktop for smaller banner (max-h-[140px])
            <div className="hidden md:block w-full max-w-3xl mx-auto mb-8 rounded-xl overflow-hidden shadow-xl border-2 border-white group cursor-pointer hover:shadow-2xl transition-all duration-500">
                <CachedImage src={banner} alt="Banner" className="w-full h-auto max-h-[140px] object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
        )}

        <div className="max-w-3xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-baseline justify-center gap-1.5 mb-4">
                <span className="text-xl sm:text-4xl md:text-5xl font-oswald text-gray-800 tracking-wide lowercase">
                    selamat datang di
                </span>
                <div className="flex items-baseline tracking-tighter gap-1 transform translate-y-0.5">
                     {/* Removed drop-shadow */}
                    <span className="font-vanguard text-brand-orange text-2xl sm:text-4xl md:text-5xl tracking-wide leading-none">
                        KELIK
                    </span>
                    <span className="font-aerion font-bold italic text-brand-blue text-lg sm:text-2xl md:text-3xl tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)] leading-none">
                        in.com
                    </span>
                </div>
            </div>

            <p className="text-gray-600 mb-6 max-w-xl mx-auto text-[10px] sm:text-base leading-relaxed px-4">
                Platform jual beli karya seni dan produk kreatif terpercaya. Login untuk mulai berbelanja atau hubungi admin untuk info lebih lanjut.
            </p>
            
            <div className="flex flex-row justify-center gap-2 px-4 w-full">
                <button onClick={onNavigateCatalog} className="w-auto bg-brand-red text-white font-metropolis font-bold tracking-wide text-[10px] py-2 px-5 rounded-full hover:bg-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-brand-red/30 uppercase whitespace-nowrap">
                    Lihat Katalog
                </button>
                <button onClick={() => onAuthClick(false)} className="w-auto bg-white text-gray-800 border border-gray-200 font-metropolis font-bold tracking-wide text-[10px] py-2 px-5 rounded-full hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-lg uppercase whitespace-nowrap">
                    Masuk Akun
                </button>
            </div>
        </div>
        
         <div className="bg-white py-6 border-t border-gray-100">
             <h3 className="text-base font-bold mb-4 text-gray-800 text-center">Produk Unggulan</h3>
             {/* Ensure 5 columns on XL desktop */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 xl:gap-2 px-2 max-w-7xl mx-auto items-start">
                {products.slice(0, 5).map(p => (
                     <div key={p.id} className="transform origin-top">
                         <ProductCard product={p} onAction={onProductClick} />
                     </div>
                ))}
            </div>
            <button onClick={onNavigateCatalog} className="mt-6 text-brand-red font-bold text-xs hover:underline">Lihat Semua Produk &rarr;</button>
         </div>
    </div>
);

const GuestCatalog: React.FC<{ products: Product[], onAction: (p: Product) => void }> = ({ products, onAction }) => (
    <div className="py-2 max-w-7xl mx-auto">
        <h2 className="text-base sm:text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><ProductIcon /> Katalog Produk</h2>
        {/* Ensure 5 columns on XL desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 xl:gap-2 items-start">
            {products.map(p => (
                 <ProductCard key={p.id} product={p} onAction={onAction} />
            ))}
        </div>
    </div>
);

const GuestInfo: React.FC = () => {
    // ... GuestInfo implementation remains same
    const faqs = [
        { q: "Apa itu KELIKin.com?", a: "KELIKin.com adalah toko unik yang menjual dan menerima pesanan barang fisik (karya seni, kerajinan) serta produk non-fisik seperti Website (Web Online)." },
        { q: "Bagaimana cara memesan?", a: "Silahkan login atau daftar akun terlebih dahulu. Pilih produk yang anda inginkan, masukkan ke keranjang, dan lakukan checkout." },
        { q: "Metode pembayaran?", a: "Kami menerima transfer bank ke BCA dan Mandiri. Setelah transfer, harap upload bukti pembayaran pada menu 'Pembayaran'." },
        { q: "Berapa lama proses Web?", a: "Website statis 1-3 hari, sedangkan website kompleks bisa memakan waktu 1-4 minggu." }
    ];

    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="py-6 max-w-4xl mx-auto bg-orange-50/30 rounded-2xl p-4 sm:p-8 border border-orange-100 shadow-inner">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-white text-brand-blue rounded-full flex items-center justify-center mx-auto mb-4 shadow-md border border-gray-100">
                    <InfoIcon />
                </div>
                <h2 className="text-xl font-bold mb-2 text-gray-800">Tentang KELIKin.com</h2>
                <p className="text-gray-600 leading-relaxed max-w-xl mx-auto font-medium text-[10px] sm:text-xs">
                    Solusi belanja cerdas untuk kebutuhan fisik dan digital anda. Transaksi aman, mudah, dan terpercaya.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left mb-8">
                <div className="p-4 bg-white rounded-xl shadow-sm hover:shadow-lg border border-orange-100 transition-all duration-300 hover:-translate-y-1">
                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2 shadow-inner"><WhatsappIcon /></div>
                    <h3 className="font-bold text-gray-800 text-xs mb-0.5">Hubungi Admin</h3>
                    <p className="text-[9px] text-gray-500 leading-relaxed">Via WhatsApp untuk respon cepat.</p>
                </div>
                 <div className="p-4 bg-white rounded-xl shadow-sm hover:shadow-lg border border-orange-100 transition-all duration-300 hover:-translate-y-1">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2 shadow-inner"><MapPinIcon /></div>
                    <h3 className="font-bold text-gray-800 text-xs mb-0.5">Lokasi</h3>
                    <p className="text-[9px] text-gray-500 leading-relaxed">Jakarta, Indonesia.</p>
                </div>
                 <div className="p-4 bg-white rounded-xl shadow-sm hover:shadow-lg border border-orange-100 transition-all duration-300 hover:-translate-y-1">
                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-2 shadow-inner"><ClockIcon /></div>
                    <h3 className="font-bold text-gray-800 text-xs mb-0.5">Operasional</h3>
                    <p className="text-[9px] text-gray-500 leading-relaxed">09:00 - 17:00 WIB</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
                <div className="p-4 border-b border-orange-100 bg-orange-50/50">
                     <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <InfoIcon /> Pertanyaan Umum (FAQ)
                    </h3>
                </div>
                <div className="divide-y divide-orange-50">
                    {faqs.map((faq, index) => (
                        <div key={index} className="group">
                            <button 
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className={`w-full flex items-center justify-between p-3 text-left transition-colors focus:outline-none ${openIndex === index ? 'bg-orange-50/30 text-brand-orange' : 'hover:bg-gray-50 text-gray-700'}`}
                            >
                                <span className="font-bold text-[10px] sm:text-xs">{faq.q}</span>
                                <span className={`transform transition-transform duration-300 ${openIndex === index ? 'rotate-180 text-brand-orange' : 'text-gray-400'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </span>
                            </button>
                            <div 
                                className={`overflow-hidden transition-all duration-300 ease-in-out bg-white ${openIndex === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                <p className="p-3 pt-0 text-[10px] text-gray-600 leading-relaxed">
                                    {faq.a}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const LoginRegister: React.FC<{ isRegister: boolean, setIsRegister: (v: boolean) => void, close: () => void }> = ({ isRegister, setIsRegister, close }) => {
    // ... LoginRegister implementation remains same
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const auth = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isRegister) {
                const user = await registerUser(email, username, password);
                auth.login(user);
            } else {
                const user = await loginUser(email, password);
                auth.login(user);
            }
            close();
        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-5">
            <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-800 mb-1">{isRegister ? 'Buat Akun' : 'Selamat Datang'}</h3>
                <p className="text-[10px] text-gray-500">{isRegister ? 'Isi data diri anda untuk mendaftar' : 'Silahkan login untuk melanjutkan'}</p>
            </div>

             {/* Small Logo below Welcome Text */}
             <div className="flex justify-center mb-4">
                <div className="flex items-baseline select-none">
                    <div className="flex items-baseline tracking-tighter gap-0.5">
                        <span className="font-vanguard text-brand-orange text-xl tracking-wide leading-none">
                            KELIK
                        </span>
                        <span className="font-aerion font-bold italic text-brand-blue text-sm tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] leading-none">
                            in.com
                        </span>
                    </div>
                </div>
             </div>
            
            {error && <div className="bg-red-50 text-red-600 p-2 rounded-lg text-[10px] mb-3 text-center">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">
                {isRegister && (
                    <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-1">Username</label>
                        <input type="text" required className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-red/50" value={username} onChange={e => setUsername(e.target.value)} />
                    </div>
                )}
                <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">Email</label>
                    <input type="email" required className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-red/50" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">Password</label>
                    <input type="password" required className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-red/50" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                
                <button disabled={loading} type="submit" className="w-full bg-brand-red text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors mt-1 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs">
                    {loading ? 'Loading...' : (isRegister ? 'Daftar Sekarang' : 'Masuk')}
                </button>
            </form>
            
            <div className="mt-4 text-center text-[10px] text-gray-600">
                {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
                <button onClick={() => setIsRegister(!isRegister)} className="text-brand-red font-bold hover:underline">
                    {isRegister ? 'Login disini' : 'Daftar disini'}
                </button>
            </div>
        </div>
    );
};

export default GuestPanel;
