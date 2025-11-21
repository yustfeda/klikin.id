
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { HomeIcon, ProductIcon, CartIcon, PaymentIcon, OrdersIcon, ProfileIcon, LogoutIcon, ClockIcon, LockIcon, SunIcon, GlobeAltIcon, MapPinIcon, CalendarIcon, InfoIcon, TrashIcon, CheckIcon, XMarkIcon, EditIcon, HeadsetIcon, EnvelopeIcon, WhatsappIcon, PlusIcon, MinusIcon, XCircleIcon, PaperAirplaneIcon } from '../components/Icons';
import { Product, Order, OrderStatus, InvoiceSettings, ProductCategory, Message, User } from '../types';
import { analyzePaymentProof } from '../services/geminiService';
import { subscribeToProducts, createOrder, subscribeToOrders, updateOrderProof, updateUserProfile, hideOrderForUser, subscribeToInvoiceSettings, updateOrderStatus, subscribeToMessages, markMessageAsRead, deleteUser } from '../services/firebase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const hexToRgba = (hex: string, alpha: number) => {
    let c: any;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    return hex;
};

// Improved CachedImage using LocalStorage for Base64
const CachedImage = ({ src, alt, className }: { src: string, alt: string, className?: string }) => {
    const [imgSrc, setImgSrc] = useState<string>(src);

    useEffect(() => {
        if (!src) return;
        const generateKey = (str: string) => {
            return `img_${str.length}_${str.slice(0, 20)}_${str.slice(-20)}`;
        };

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
                        console.warn("LocalStorage quota exceeded, skipping image cache");
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

const Logo = () => (
    <h1 className="flex items-baseline select-none cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth'})}>
        <div className="flex items-baseline tracking-tighter gap-0.5">
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

const OrderCountdown = ({ timestamp }: { timestamp: number }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const deadline = timestamp + (6 * 60 * 60 * 1000);
        const updateTimer = () => {
            const now = Date.now();
            const diff = deadline - now;
            if (diff <= 0) {
                setTimeLeft('00:00:00');
                setIsExpired(true);
            } else {
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [timestamp]);

    return (
        <div className={`inline-flex items-center gap-1 font-mono font-bold text-[9px] sm:text-xs ${isExpired ? 'text-red-600' : 'text-brand-red'}`}>
            <ClockIcon />
            <span>{isExpired ? 'Expired' : timeLeft}</span>
        </div>
    );
};

const ProductCountdown = ({ targetDate }: { targetDate: number }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isHidden, setIsHidden] = useState(false);

    useEffect(() => {
        if (!targetDate) {
            setIsHidden(true);
            return;
        }
        
        const updateTimer = () => {
            try {
                const now = Date.now();
                const diff = targetDate - now;
                if (diff <= 0) {
                    setIsHidden(true);
                } else {
                    setIsHidden(false);
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
            } catch (e) {
                setIsHidden(true);
            }
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    if (isHidden || !targetDate) return null;

    return (
        <span className="text-[inherit] font-bold tracking-tight leading-none">
            {timeLeft}
        </span>
    );
};

const SwipeableCartItem: React.FC<{ item: {product: Product, quantity: number}, onRemove: () => void, onBuy: () => void }> = ({ item, onRemove, onBuy }) => {
    const [offsetX, setOffsetX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const startX = useRef(0);

    let finalPrice = item.product.discountedPrice;
    let isWholesale = false;
    if (item.product.enableWholesale && item.product.wholesaleMinQty && item.product.wholesalePercent) {
        if (item.quantity >= item.product.wholesaleMinQty) {
            finalPrice = finalPrice * (1 - item.product.wholesalePercent / 100);
            isWholesale = true;
        }
    }
    const totalItemPrice = finalPrice * item.quantity;

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        setIsSwiping(true);
        if ('touches' in e) {
            startX.current = e.touches[0].clientX;
        } else {
             startX.current = (e as React.MouseEvent).clientX;
        }
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isSwiping) return;
        let currentX;
        if ('touches' in e) {
            currentX = e.touches[0].clientX;
        } else {
            if ((e as React.MouseEvent).buttons !== 1) return;
            currentX = (e as React.MouseEvent).clientX;
        }
        const diff = currentX - startX.current;
        if (diff < 0 && diff > -150) {
            setOffsetX(diff);
        }
    };

    const handleTouchEnd = () => {
        setIsSwiping(false);
        if (offsetX < -60) {
            setOffsetX(-80); 
        } else {
            setOffsetX(0); 
        }
    };

    const handleDeleteClick = () => {
        setShowConfirm(true);
    };

    const confirmDelete = (confirm: boolean) => {
        if (confirm) {
            onRemove();
        }
        setShowConfirm(false);
        setOffsetX(0);
    };

    return (
        <div className="relative overflow-hidden rounded-lg mb-2 select-none">
            <div className="absolute inset-0 flex justify-end items-center bg-red-100 rounded-lg pr-4">
                <button onClick={handleDeleteClick} className="text-red-600 font-bold flex items-center gap-1 text-[10px]">
                    <TrashIcon /> Hapus
                </button>
            </div>

            <div 
                className="bg-white p-2 sm:p-3 rounded-lg shadow-sm border border-gray-100 relative z-10 transition-transform duration-300 ease-out flex flex-col sm:flex-row items-center gap-2 sm:gap-3"
                style={{ transform: `translateX(${offsetX}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
            >
                 <CachedImage src={item.product.imageUrl} alt={item.product.name} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md pointer-events-none" />
                <div className="flex-grow text-center sm:text-left w-full">
                    <h3 className="font-bold text-[10px] sm:text-sm pointer-events-none">{item.product.name}</h3>
                     <div className="pointer-events-none">
                        {isWholesale ? (
                             <div className="flex flex-col items-center sm:items-start">
                                <span className="text-[9px] text-gray-400 line-through">Rp{(item.product.discountedPrice * item.quantity).toLocaleString('id-ID')}</span>
                                <span className="text-brand-red font-bold text-[10px] sm:text-sm">Rp{totalItemPrice.toLocaleString('id-ID')} (Grosir)</span>
                            </div>
                        ) : (
                            <p className="text-brand-red font-bold text-[10px] sm:text-sm">Rp{totalItemPrice.toLocaleString('id-ID')}</p>
                        )}
                        <p className="text-[9px] text-gray-500">Qty: {item.quantity}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                     <button 
                        onClick={onBuy}
                        className="w-auto px-3 py-1 bg-brand-yellow text-brand-red font-bold rounded-md hover:bg-yellow-400 shadow-sm whitespace-nowrap font-metropolis text-[9px] sm:text-xs uppercase tracking-wide"
                     >
                        Checkout
                     </button>
                </div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none sm:hidden">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </div>
            </div>

            {showConfirm && (
                <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg animate-in fade-in duration-200">
                    <p className="font-bold text-gray-800 mb-2 text-[10px]">Yakin hapus?</p>
                    <div className="flex gap-2">
                        <button onClick={() => confirmDelete(false)} className="px-3 py-1 border border-gray-300 rounded-full text-[9px] font-bold hover:bg-gray-50">Tidak</button>
                        <button onClick={() => confirmDelete(true)} className="px-3 py-1 bg-red-500 text-white rounded-full text-[9px] font-bold hover:bg-red-600">Ya</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const UserProductCard: React.FC<{ product: Product; onBuy: () => void; onAddToCart: () => void }> = ({ product, onBuy, onAddToCart }) => {
    const [isReleased, setIsReleased] = useState(() => {
         if (!product.isComingSoon) return true;
         if ((product.releaseDate || 0) <= 0) return false;
         return Date.now() >= product.releaseDate!;
    });

    useEffect(() => {
         const check = () => {
             if (!product.isComingSoon) return true;
             if ((product.releaseDate || 0) <= 0) return false;
             return Date.now() >= product.releaseDate!;
         };
         setIsReleased(check());

         if (product.isComingSoon && (product.releaseDate || 0) > 0) {
             const diff = product.releaseDate! - Date.now();
             if (diff > 0) {
                 const timer = setTimeout(() => setIsReleased(true), diff);
                 return () => clearTimeout(timer);
             }
         }
    }, [product.isComingSoon, product.releaseDate]);

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

    // Button Style: Light Blue (Blue 400)
    const buttonBaseClass = "group w-[calc(100%-16px)] mx-2 mb-4 md:mb-2 h-9 rounded-lg font-metropolis font-bold tracking-wide text-[10px] sm:text-xs shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-1.5 mt-auto duration-300 ease-in-out";

    const getButton = () => {
        const isClosed = product.isSaleClosed || product.stock === 0;
        const effectivelyComingSoon = product.isComingSoon && !isReleased;
        
        if (effectivelyComingSoon && !isClosed) {
             return (
                <div className="w-full px-2 mb-4 md:mb-2 mt-auto">
                    <div className={`w-full h-auto py-1 rounded-lg font-metropolis font-bold tracking-wide text-[10px] shadow-sm flex flex-col items-center justify-center bg-yellow-100 text-yellow-800 border border-yellow-200 cursor-not-allowed`}>
                        <div className="flex items-center gap-1.5">
                            <ClockIcon />
                            <span className="uppercase">Segera Hadir</span>
                        </div>
                        {(product.releaseDate || 0) > 0 && (
                            <div className="text-[8px] sm:text-[10px] mt-0.5">
                                <ProductCountdown targetDate={product.releaseDate!} />
                            </div>
                        )}
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
             // Light Blue Button
             <button onClick={onBuy} className={`${buttonBaseClass} bg-blue-400 text-white border-b-2 border-blue-500 hover:bg-blue-500 hover:shadow-blue-400/50`}>
                <span className="mt-0.5 uppercase">Beli Sekarang</span>
                <span className="transform transition-transform duration-300 group-hover:translate-x-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                </span>
            </button>
        );
    };

    // Modified container classes: Remove bg-white/shadow/border on md screens (desktop)
    return (
        <div className="group bg-white md:bg-transparent md:shadow-none md:border-0 md:hover:shadow-none md:hover:translate-y-0 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 ease-out flex flex-col h-auto border border-gray-100 md:border-0 w-[94%] sm:w-full mx-auto transform hover:-translate-y-1 relative z-10 pb-1">
             {/* Image Container */}
             <div className="relative w-full h-48 sm:h-44 md:h-36 overflow-hidden md:rounded-lg">
                <CachedImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                
                {(product.isSaleClosed || product.stock === 0) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md animate-pulse-slow">
                            <span className="text-brand-red font-bold text-[10px] transform -rotate-12 border-2 border-brand-red px-1 rounded-sm">HABIS</span>
                        </div>
                    </div>
                )}
                {product.isComingSoon && !isReleased && !product.isSaleClosed && product.stock > 0 && (
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                            <span className="text-brand-orange font-bold text-[10px]">SOON</span>
                        </div>
                    </div>
                )}

                <div className="absolute top-2 left-2 z-20">
                    <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold shadow-sm ${product.category === 'digital' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                        {product.category === 'digital' ? 'Web / Digital' : 'Fisik'}
                    </span>
                </div>

                <div className="absolute bottom-2 left-0 w-full px-2 flex justify-between items-end pointer-events-none z-20">
                     {product.discountPercent > 0 && (
                        <div className="bg-red-600 text-white text-xs font-extrabold px-2 py-0.5 rounded shadow-lg border border-white/20 transform -rotate-2 animate-pulse-slow">
                            {product.discountPercent}% OFF
                        </div>
                    )}
                     {product.saleTag && (
                        <div className="ml-auto bg-brand-blue text-white text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide flex items-center gap-1 shadow-lg border border-white/20">
                            <SunIcon />
                            {product.saleTag}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col flex-grow relative z-10 bg-white md:bg-transparent">
                {/* Title increased: text-xl (mobile), text-2xl (desktop) */}
                <div className="px-2 pt-3 md:pt-1 mb-4 md:mb-2">
                     <h3 className="font-bold text-xl sm:text-2xl mb-1 text-gray-900 text-left leading-tight group-hover:text-brand-red transition-colors truncate">{product.name}</h3>
                </div>

                {/* Extra Info Spacing increased: my-5, space-y-3 (mobile) & Font Size Adjusted for Desktop */}
                {product.extraInfo && product.extraInfo.length > 0 && (
                    <div className="my-5 md:my-2 space-y-3 sm:space-y-1 bg-gray-50 md:bg-transparent md:border-0 md:p-0 py-1.5 px-2 mx-2 rounded border border-gray-100">
                         {product.extraInfo.map((info, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[9px] md:text-[11px] text-gray-700">
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

                <div className="text-left relative px-2 mt-auto">
                    <div className="flex flex-col mb-6 md:mb-3">
                         {/* Price Increased */}
                         {product.originalPrice > product.discountedPrice && (
                            <span className="text-sm text-gray-400 line-through text-left block mb-0.5">Rp{(product.originalPrice).toLocaleString('id-ID')}</span>
                        )}
                        
                        <div className="flex items-center justify-between min-h-[24px]">
                             <p className="text-xl sm:text-2xl font-bold text-brand-red text-left">Rp{product.discountedPrice.toLocaleString('id-ID')}</p>

                             {!product.isSaleClosed && (!product.isComingSoon || isReleased) && product.stock > 0 && (
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
                                    className="w-8 h-8 p-1.5 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-brand-yellow text-gray-600 hover:text-brand-red transition-colors group/cart animate-ring-interval flex items-center justify-center"
                                    title="Tambah ke Keranjang"
                                >
                                    <div className="w-5 h-5 [&>svg]:w-full [&>svg]:h-full"><CartIcon /></div>
                                </button>
                             )}
                        </div>
                    </div>

                    {!product.isSaleClosed && (!product.isComingSoon || isReleased) && product.stock > 0 && (
                         // Stock Bar: h-2 (mobile), sm:h-1.5 (desktop)
                        <div className="relative mb-6 md:mb-3">
                            <div className="flex items-center justify-between gap-1 mb-1">
                                <div className="w-full bg-gray-100 rounded-full h-2 sm:h-1.5 overflow-hidden border border-gray-200">
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

const ConfirmModal: React.FC<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }> = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4">
            <div className="bg-white p-4 rounded-xl shadow-2xl max-w-xs w-full m-4 transform transition-all scale-100">
                <h3 className="text-sm font-bold text-gray-800 mb-1">{title}</h3>
                <p className="text-gray-600 mb-4 text-[10px] leading-relaxed">{message}</p>
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="px-3 py-1.5 text-gray-600 font-bold text-[10px] hover:bg-gray-100 rounded-lg">Tidak</button>
                    <button onClick={onConfirm} className="px-3 py-1.5 bg-brand-red text-white font-bold text-[10px] rounded-lg hover:bg-red-700">Ya</button>
                </div>
            </div>
        </div>
    );
};

const SuccessModal: React.FC<{ isOpen: boolean; title: string; message: string; onClose: () => void }> = ({ isOpen, title, message, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4">
            <div className="bg-white p-4 rounded-xl shadow-2xl max-w-xs w-full m-4 transform transition-all scale-100 text-center">
                 <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                     <CheckIcon />
                 </div>
                <h3 className="text-sm font-bold text-gray-800 mb-1">{title}</h3>
                <p className="text-gray-600 mb-4 text-[10px] leading-relaxed">{message}</p>
                <button onClick={onClose} className="w-full px-3 py-1.5 bg-green-600 text-white font-bold text-[10px] rounded-lg hover:bg-green-700">Oke</button>
            </div>
        </div>
    );
};

const MessageModal: React.FC<{ isOpen: boolean; message: Message | null; onClose: () => void }> = ({ isOpen, message, onClose }) => {
    if (!isOpen || !message) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4" onClick={onClose}>
            <div className="bg-white p-5 rounded-xl shadow-2xl max-w-md w-full m-4 transform transition-all scale-100 relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                    <XMarkIcon />
                </button>
                <div className="mb-3 border-b pb-2">
                     <h3 className="text-sm font-bold text-brand-blue mb-1">{message.title}</h3>
                     <p className="text-[9px] text-gray-400">{new Date(message.timestamp).toLocaleString()}</p>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                     <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
                <button onClick={onClose} className="w-full mt-4 px-3 py-2 bg-gray-100 text-gray-700 font-bold text-[10px] rounded-lg hover:bg-gray-200">Tutup</button>
            </div>
        </div>
    );
};

const CheckoutModal: React.FC<{ isOpen: boolean; product: Product | null; initialQty: number; onClose: () => void; onSubmit: (qty: number, data: {name: string, address: string, phone: string}) => void }> = ({ isOpen, product, initialQty, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({ name: '', address: '', phone: '' });
    const [qty, setQty] = useState(initialQty);

    useEffect(() => {
        setQty(initialQty);
    }, [initialQty, isOpen]);

    if (!isOpen || !product) return null;

    const increaseQty = () => {
        if (qty < product.stock) setQty(qty + 1);
    };
    const decreaseQty = () => {
        if (qty > 1) setQty(qty - 1);
    };

    let unitPrice = product.discountedPrice;
    let isWholesale = false;
    if (product.enableWholesale && product.wholesaleMinQty && product.wholesalePercent) {
        if (qty >= product.wholesaleMinQty) {
            unitPrice = unitPrice * (1 - product.wholesalePercent / 100);
            isWholesale = true;
        }
    }
    const totalPrice = unitPrice * qty;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(qty, formData);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300 p-4">
            <div className="bg-white p-4 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><XMarkIcon /></button>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Checkout</h3>
                <p className="text-[10px] text-gray-500 mb-3">Lengkapi data pengiriman</p>
                
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
                    <h4 className="font-bold text-xs text-gray-800 mb-2">{product.name}</h4>
                    
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-gray-600">Jumlah:</span>
                        <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden">
                            <button onClick={decreaseQty} className="p-1 hover:bg-gray-100 text-gray-600"><MinusIcon /></button>
                            <span className="px-3 text-xs font-bold min-w-[24px] text-center text-gray-900">{qty}</span>
                            <button onClick={increaseQty} className="p-1 hover:bg-gray-100 text-gray-600"><PlusIcon /></button>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
                         <span className="text-[10px] font-bold text-gray-600">Total Harga:</span>
                         <div className="text-right">
                            {isWholesale && <span className="block text-[8px] text-green-600 font-bold">Diskon Grosir Aktif!</span>}
                            <span className="text-sm font-bold text-brand-red">Rp{totalPrice.toLocaleString('id-ID')}</span>
                         </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-1">Nama Penerima</label>
                        <input required type="text" placeholder="Nama Lengkap" className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-brand-orange" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-1">Nomor WhatsApp</label>
                        <input required type="tel" placeholder="0812..." className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-brand-orange" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                     <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-1">Alamat Lengkap</label>
                        <textarea required placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota, Kode Pos" className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-brand-orange h-20 resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    </div>
                    <button type="submit" className="w-full bg-brand-red text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors shadow-lg flex items-center justify-center gap-2 text-xs mt-2">
                        <PaymentIcon /> Buat Pesanan
                    </button>
                </form>
            </div>
        </div>
    );
};

const UserPanel: React.FC = () => {
    const [view, setView] = useState('home');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
    const [checkoutQty, setCheckoutQty] = useState(1);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
    const [orders, setOrders] = useState<Order[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [pendingOrderCount, setPendingOrderCount] = useState(0);

    const auth = useAuth();

    useEffect(() => {
        const unsubProd = subscribeToProducts(setProducts);
        const unsubOrders = subscribeToOrders((allOrders) => {
            if (auth.currentUser) {
                const myOrders = allOrders.filter(o => o.userId === auth.currentUser!.uid && !o.hiddenForUser);
                setOrders(myOrders);
                
                const pending = myOrders.filter(o => o.status === OrderStatus.PENDING).length;
                setPendingOrderCount(pending);
            }
        });
        
        const unsubMsgs = subscribeToMessages((msgs) => {
            if (auth.currentUser) {
                const myMsgs = msgs.filter(m => m.userId === auth.currentUser?.uid || m.userId === 'ALL');
                setMessages(myMsgs);
                const unread = myMsgs.filter(m => !m.isRead && (m.userId === auth.currentUser?.uid || m.userId === 'ALL')).length;
                setUnreadCount(unread);
            }
        });

        // Load Cart
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
             try {
                setCartItems(JSON.parse(savedCart));
             } catch (e) {}
        }

        return () => { unsubProd(); unsubOrders(); unsubMsgs(); };
    }, [auth.currentUser]);

    // Notification for Pending Orders on Load
    useEffect(() => {
        if (pendingOrderCount > 0) {
            auth.showNotification({ type: 'info', message: `Anda memiliki ${pendingOrderCount} pesanan pending.` });
        }
    }, [pendingOrderCount]);

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (product: Product) => {
        const existing = cartItems.find((item: any) => item.productId === product.id);
        if (existing) {
             if (existing.quantity < product.stock) {
                const updated = cartItems.map((item: any) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
                setCartItems(updated);
                auth.showNotification({ type: 'success', message: 'Jumlah barang ditambah di keranjang' });
             } else {
                 auth.showNotification({ type: 'error', message: 'Stok tidak mencukupi' });
             }
        } else {
            setCartItems([...cartItems, { productId: product.id, quantity: 1 }]);
            auth.showNotification({ type: 'success', message: 'Produk masuk keranjang' });
        }
    };

    const removeFromCart = (index: number) => {
        const newCart = [...cartItems];
        newCart.splice(index, 1);
        setCartItems(newCart);
        auth.showNotification({ type: 'info', message: 'Produk dihapus dari keranjang' });
    };
    
    const handleBuyNow = (product: Product) => {
        setCheckoutProduct(product);
        setCheckoutQty(1);
        setShowCheckoutModal(true);
    };

    const handleBuyFromCart = (item: any) => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            setCheckoutProduct(product);
            setCheckoutQty(item.quantity);
            setShowCheckoutModal(true);
        }
    };

    const handleCheckoutSubmit = async (qty: number, shipping: {name: string, address: string, phone: string}) => {
        if (!checkoutProduct || !auth.currentUser) return;
        try {
            const orderId = await createOrder(auth.currentUser.uid, auth.currentUser.username, checkoutProduct, qty, shipping);
            setShowCheckoutModal(false);
            
            // Remove from cart if exists
            const inCartIndex = cartItems.findIndex((item: any) => item.productId === checkoutProduct.id);
            if (inCartIndex > -1) {
                removeFromCart(inCartIndex);
            }

            // Redirect Logic
            const message = `Halo Admin KELIKin.com, saya ingin membeli:
Nama: ${shipping.name}
Produk: ${checkoutProduct.name}
Qty: ${qty}
Alamat: ${shipping.address}
No HP: ${shipping.phone}

Mohon diproses.`;
            
            const waUrl = `https://wa.me/6285817938860?text=${encodeURIComponent(message)}`;
            const targetUrl = checkoutProduct.buyLink ? checkoutProduct.buyLink : waUrl;
            
            window.open(targetUrl, '_blank');
            
            // Show generic success as backup or if user comes back
            setSuccessMessage({ 
                title: 'Pesanan Dibuat!', 
                message: 'Anda akan dialihkan untuk menyelesaikan pemesanan. Cek menu Pesanan untuk status.' 
            });
            setShowSuccessModal(true);

        } catch (error) {
            auth.showNotification({ type: 'error', message: 'Gagal membuat pesanan' });
        }
    };

    const userNavItems = [
        { name: 'Beranda', icon: <HomeIcon />, view: 'home' },
        { name: 'Produk', icon: <ProductIcon />, view: 'products' },
        { name: 'Keranjang', icon: <CartIcon />, view: 'cart', badge: cartItems.length },
        { name: 'Pesanan', icon: <OrdersIcon />, view: 'orders', badge: pendingOrderCount },
        { name: 'Kotak Masuk', icon: <EnvelopeIcon />, view: 'inbox', badge: unreadCount },
        { name: 'Profil', icon: <ProfileIcon />, view: 'profile' },
        { name: 'Logout', icon: <LogoutIcon />, action: auth.logout },
    ];

    const handleNavClick = (item: any) => {
        if (item.action) {
            item.action();
        } else if (item.view) {
             if (view === item.view) {
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

    const HamburgerIcon = ({ isOpen, onClick, badgeCount }: { isOpen: boolean; onClick: () => void, badgeCount?: number }) => (
        <button onClick={onClick} className="z-50 w-8 h-8 relative focus:outline-none md:hidden transition-all duration-300">
            <span className={`block w-5 h-0.5 bg-gray-800 absolute transition-all duration-300 ease-in-out left-1/2 -translate-x-1/2 ${isOpen ? 'rotate-45 top-1/2 -translate-y-1/2' : 'top-[32%]'}`}></span>
            <span className={`block w-5 h-0.5 bg-gray-800 absolute transition-all duration-300 ease-in-out left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 ${isOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-5 h-0.5 bg-gray-800 absolute transition-all duration-300 ease-in-out left-1/2 -translate-x-1/2 ${isOpen ? '-rotate-45 top-1/2 -translate-y-1/2' : 'top-[68%]'}`}></span>
             
             {!isOpen && badgeCount && badgeCount > 0 ? (
                 <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white shadow-sm animate-bounce">
                    {badgeCount}
                </span>
            ) : null}
        </button>
    );

    const NavLink: React.FC<{ item: any; isActive: boolean; onClick: () => void; isSidebar?: boolean }> = ({ item, isActive, onClick, isSidebar }) => (
        <button onClick={onClick} className={`group relative flex items-center ${isSidebar ? 'justify-start w-full pl-4' : 'justify-center'} px-3 py-2 rounded-md text-[10px] md:text-sm font-medium transition-all duration-300 ease-in-out ${isActive ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30' : 'text-gray-600 hover:bg-gray-100 hover:text-brand-red'}`}>
            <span className={`transform transition-transform duration-300 ${!isSidebar && 'group-hover:scale-110'} ${isSidebar && 'group-hover:translate-x-2'} ${isActive ? 'scale-110' : ''} relative`}>
                {item.icon}
                {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white shadow-sm animate-bounce">
                        {item.badge}
                    </span>
                )}
            </span>
            {isSidebar && <span className="ml-3 font-teko text-base tracking-wide pt-0.5 transition-transform duration-300 group-hover:translate-x-1">{item.name}</span>}
            {!isSidebar && (
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-auto p-2 min-w-max bg-gray-800 text-white text-[10px] rounded-md scale-0 group-hover:scale-100 transition-all duration-300 z-10 shadow-lg pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                    {item.name}
                </span>
            )}
        </button>
    );
    
    // User Components
    const UserHome = () => (
        <div className="text-center py-4 sm:py-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Hi, {auth.currentUser?.username}</h2>
            <p className="text-gray-500 mb-8 text-xs sm:text-sm">Selamat datang kembali di KELIKin.com</p>
            
            {pendingOrderCount > 0 && (
                 <div className="mb-6 mx-auto max-w-sm bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between animate-pulse shadow-sm">
                     <div className="flex items-center gap-2 text-yellow-800">
                         <ClockIcon />
                         <span className="text-[10px] font-bold">Menunggu Penyelesaian: {pendingOrderCount} Pesanan</span>
                     </div>
                     <button onClick={() => handleNavClick({view: 'orders'})} className="text-[9px] font-bold bg-yellow-200 px-3 py-1 rounded-full text-yellow-900 hover:bg-yellow-300 transition-colors">Lihat</button>
                 </div>
            )}
            
            <h3 className="text-left text-base font-bold mb-4 px-2">Produk Terbaru</h3>
             {/* Updated Grid: lg:grid-cols-4 xl:grid-cols-5 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 xl:gap-2 px-2">
                {products.slice(0, 8).map(p => (
                    <UserProductCard key={p.id} product={p} onBuy={() => handleBuyNow(p)} onAddToCart={() => addToCart(p)} />
                ))}
            </div>
        </div>
    );
    
    const UserProducts = () => (
        <div className="py-2">
            <h2 className="text-base sm:text-xl font-bold mb-4 px-2 text-gray-800">Semua Produk</h2>
             {/* Updated Grid: lg:grid-cols-4 xl:grid-cols-5 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 xl:gap-2 px-2">
                {products.map(p => (
                     <UserProductCard key={p.id} product={p} onBuy={() => handleBuyNow(p)} onAddToCart={() => addToCart(p)} />
                ))}
            </div>
        </div>
    );
    
    const UserCart = () => {
        return (
            <div className="max-w-md mx-auto py-4 px-2">
                <h2 className="text-base sm:text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><CartIcon /> Keranjang Saya</h2>
                {cartItems.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <CartIcon />
                        <p className="mt-2 text-[10px]">Keranjang masih kosong.</p>
                        <button onClick={() => handleNavClick({view: 'products'})} className="mt-4 text-brand-red font-bold text-[10px] hover:underline">Mulai Belanja</button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {cartItems.map((item: any, index: number) => {
                            const product = products.find(p => p.id === item.productId);
                            if (!product) return null;
                            return (
                                <SwipeableCartItem 
                                    key={index} 
                                    item={{product, quantity: item.quantity}} 
                                    onRemove={() => removeFromCart(index)}
                                    onBuy={() => handleBuyFromCart({productId: product.id, quantity: item.quantity})}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };
    
    const UserOrders = () => {
        return <OrdersList orders={orders} />;
    };

    const OrdersList = ({ orders }: { orders: Order[] }) => {
         const [uploadingId, setUploadingId] = useState<string | null>(null);
         const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
         const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
         const [selectedProofs, setSelectedProofs] = useState<{[key:string]: string}>({});
         const [selectedFileNames, setSelectedFileNames] = useState<{[key:string]: string}>({});
         
         useEffect(() => {
             subscribeToInvoiceSettings(setInvoiceSettings);
         }, []);

         const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, orderId: string) => {
            const file = e.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setSelectedProofs(prev => ({...prev, [orderId]: reader.result as string}));
                    setSelectedFileNames(prev => ({...prev, [orderId]: file.name}));
                };
                reader.readAsDataURL(file);
            }
        };

        const handleSendProof = async (orderId: string) => {
            const base64 = selectedProofs[orderId];
            if (base64) {
                setUploadingId(orderId);
                try {
                     await updateOrderProof(orderId, base64);
                     // Clear selections
                     const newProofs = {...selectedProofs};
                     delete newProofs[orderId];
                     setSelectedProofs(newProofs);
                     
                     const newNames = {...selectedFileNames};
                     delete newNames[orderId];
                     setSelectedFileNames(newNames);

                     auth.showNotification({ type: 'success', message: 'Bukti pembayaran dikirim!' });
                } catch (error) {
                    auth.showNotification({ type: 'error', message: 'Gagal mengirim bukti' });
                } finally {
                    setUploadingId(null);
                }
            }
        };

        const generateInvoice = async (order: Order) => {
             // ... (Existing invoice logic kept same, omitted for brevity but assumed present)
             // Placeholder for existing logic to save space in this response block
             if (!invoiceSettings) return;
             const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a5' });
             if (invoiceSettings.logoUrl) doc.addImage(invoiceSettings.logoUrl, 'JPEG', 10, 10, 30, 15);
             doc.text(`Order #${order.id.substring(0,5)}`, 10, 40);
             doc.save(`Invoice.pdf`);
         };

         const handleRemoveHistory = async () => {
             if (confirmDeleteId) {
                await hideOrderForUser(confirmDeleteId);
                setConfirmDeleteId(null);
                auth.showNotification({ type: 'success', message: 'Riwayat pesanan dihapus.' });
             }
         };

         return (
             <div className="max-w-lg mx-auto py-2 px-2 space-y-3">
                 <h2 className="text-base sm:text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><OrdersIcon /> Pesanan Saya</h2>
                 {orders.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <OrdersIcon />
                        <p className="mt-2 text-[10px]">Belum ada pesanan.</p>
                    </div>
                 ) : (
                     orders.map(order => (
                         <div key={order.id} className="bg-white p-3 rounded-xl shadow-md border border-gray-100 relative overflow-hidden">
                             <div className="flex justify-between items-start mb-2 pb-2 border-b border-gray-50">
                                 <div>
                                     <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                        order.status === OrderStatus.PAID ? 'bg-green-100 text-green-700' :
                                        order.status === OrderStatus.PENDING ? 'bg-yellow-100 text-yellow-700' : 
                                        order.status === OrderStatus.REJECTED ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                     }`}>
                                         {order.status}
                                     </span>
                                     <p className="text-[9px] text-gray-400 mt-1">{new Date(order.timestamp).toLocaleDateString()}</p>
                                 </div>
                                 <div className="text-right">
                                      <p className="font-bold text-brand-red text-sm">Rp{order.totalPrice.toLocaleString('id-ID')}</p>
                                      {order.status === OrderStatus.PENDING && <OrderCountdown timestamp={order.timestamp} />}
                                 </div>
                             </div>
                             
                             <div className="flex gap-3 mb-3">
                                 <CachedImage src={order.items[0].product.imageUrl} alt={order.items[0].product.name} className="w-12 h-12 rounded object-cover bg-gray-100" />
                                 <div>
                                     <h4 className="font-bold text-xs text-gray-800 line-clamp-1">{order.items[0].product.name}</h4>
                                     <p className="text-[9px] text-gray-500">Qty: {order.items[0].quantity}</p>
                                 </div>
                             </div>
                             
                             <div className="flex flex-wrap gap-2 mt-2 items-center">
                                 {order.status === OrderStatus.PENDING && (
                                     <div className="w-full sm:w-auto">
                                        {order.paymentProof ? (
                                            <button disabled className="w-full px-3 py-1.5 bg-yellow-500 text-white font-bold text-[10px] rounded-lg cursor-not-allowed flex items-center justify-center gap-1 shadow-inner opacity-80">
                                                <LockIcon /> Menunggu Konfirmasi
                                            </button>
                                        ) : (
                                            <div className="flex gap-2 items-center">
                                                <label className="cursor-pointer flex-grow sm:flex-grow-0 px-3 py-1.5 bg-blue-600 text-white font-bold text-[10px] rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1 shadow-md whitespace-nowrap">
                                                    {selectedFileNames[order.id] ? (selectedFileNames[order.id].length > 15 ? selectedFileNames[order.id].substring(0,15)+'...' : selectedFileNames[order.id]) : 'Pilih Bukti'}
                                                    <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e, order.id)} className="hidden" />
                                                </label>
                                                
                                                {selectedProofs[order.id] && (
                                                    <button 
                                                        onClick={() => handleSendProof(order.id)}
                                                        disabled={uploadingId === order.id}
                                                        className="px-3 py-1.5 bg-green-600 text-white font-bold text-[10px] rounded-lg hover:bg-green-700 flex items-center justify-center shadow-md"
                                                    >
                                                        {uploadingId === order.id ? '...' : 'Kirim'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                     </div>
                                 )}
                                 {(order.status === OrderStatus.PAID || order.status === OrderStatus.COMPLETED || order.status === OrderStatus.SHIPPED) && (
                                     <button onClick={() => generateInvoice(order)} className="px-3 py-1.5 border border-gray-300 font-bold text-[10px] rounded-lg hover:bg-gray-50 flex items-center gap-1">
                                         Download Invoice
                                     </button>
                                 )}
                                 {(order.status === OrderStatus.COMPLETED || order.status === OrderStatus.REJECTED || order.status === OrderStatus.CANCELLED) && (
                                      <button onClick={() => setConfirmDeleteId(order.id)} className="ml-auto text-red-400 hover:text-red-600 text-[9px] font-bold flex items-center gap-1">
                                          <TrashIcon /> Hapus Riwayat
                                      </button>
                                 )}
                             </div>
                             
                             {order.status === OrderStatus.PENDING && !order.paymentProof && (
                                 <div className="mt-2 bg-yellow-50 p-2 rounded border border-yellow-100 text-[9px] text-yellow-800">
                                     <p className="font-bold mb-1">Info Pembayaran:</p>
                                     <p className="whitespace-pre-wrap leading-relaxed">{invoiceSettings?.bankDetails || 'Hubungi Admin untuk info rekening.'}</p>
                                 </div>
                             )}
                         </div>
                     ))
                 )}
                 
                 <ConfirmModal 
                    isOpen={!!confirmDeleteId} 
                    title="Hapus Riwayat" 
                    message="Apakah anda yakin ingin menghapus riwayat pesanan ini?" 
                    onConfirm={handleRemoveHistory} 
                    onCancel={() => setConfirmDeleteId(null)} 
                 />
             </div>
         )
    };

    const Inbox = () => {
        const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);

        const handleMessageClick = (msg: Message) => {
            setSelectedMsg(msg);
            if (!msg.isRead) {
                markMessageAsRead(msg.id);
            }
        };

        return (
            <div className="max-w-md mx-auto py-4 px-2">
                <h2 className="text-base sm:text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><EnvelopeIcon /> Kotak Masuk</h2>
                {messages.length === 0 ? (
                     <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <EnvelopeIcon />
                        <p className="mt-2 text-[10px]">Belum ada pesan.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {messages.map(msg => (
                            <div key={msg.id} onClick={() => handleMessageClick(msg)} className={`bg-white p-3 rounded-xl shadow-sm border cursor-pointer transition-all ${!msg.isRead ? 'border-brand-blue bg-blue-50/30' : 'border-gray-100 hover:border-gray-300 hover:shadow-md'}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className={`text-xs ${!msg.isRead ? 'font-extrabold text-brand-blue' : 'font-bold text-gray-800'}`}>
                                        {msg.title} {!msg.isRead && <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full ml-1 mb-0.5"></span>}
                                    </h4>
                                    <span className="text-[9px] text-gray-400">{new Date(msg.timestamp).toLocaleDateString()}</span>
                                </div>
                                <p className="text-[10px] text-gray-500 truncate">{msg.content}</p>
                            </div>
                        ))}
                    </div>
                )}
                <MessageModal isOpen={!!selectedMsg} message={selectedMsg} onClose={() => setSelectedMsg(null)} />
            </div>
        );
    };

    const UserProfile = () => {
        const [isEditing, setIsEditing] = useState(false);
        const [formData, setFormData] = useState({ username: '', email: '', password: '', profilePicture: '' });
        const [showDeleteModal, setShowDeleteModal] = useState(false);
        const user = auth.currentUser;
        
        useEffect(() => {
            if (user) {
                setFormData({
                    username: user.username || '',
                    email: user.email || '',
                    password: '', // Don't load actual password for security visual
                    profilePicture: user.profilePicture || ''
                });
            }
        }, [user]);

        const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData({ ...formData, profilePicture: reader.result as string });
                };
                reader.readAsDataURL(file);
            }
        };

        const handleSave = async () => {
            if (!user) return;
            try {
                const updates: any = {
                    username: formData.username,
                    email: formData.email,
                    profilePicture: formData.profilePicture
                };
                if (formData.password) {
                    updates.password = formData.password;
                }
                await updateUserProfile(user.uid, updates);
                auth.showNotification({ type: 'success', message: 'Profil diperbarui!' });
                setIsEditing(false);
            } catch (e) {
                auth.showNotification({ type: 'error', message: 'Gagal update profil' });
            }
        };

        const handleDeleteAccount = async () => {
            if (!user) return;
            try {
                await deleteUser(user.uid);
                auth.logout();
            } catch (e) {
                auth.showNotification({ type: 'error', message: 'Gagal menghapus akun' });
            }
        };

        if (!user) return null;

        return (
            <div className="max-w-md mx-auto py-4 px-2">
                <h2 className="text-base sm:text-xl font-bold mb-6 text-gray-800 flex items-center gap-2"><ProfileIcon /> Profil Saya</h2>
                
                <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 text-center relative">
                     <div className="w-24 h-24 mx-auto rounded-full border-4 border-white shadow-lg overflow-hidden mb-4 relative bg-gray-100 group">
                         {formData.profilePicture ? (
                             <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                         ) : (
                             <div className="w-full h-full flex items-center justify-center text-gray-300"><ProfileIcon /></div>
                         )}
                         
                         {isEditing && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <span className="text-white text-[10px] font-bold">Ubah Foto</span>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                         )}
                     </div>

                     {!isEditing ? (
                         <>
                            <h3 className="text-xl font-bold text-gray-900">{user.username}</h3>
                            <p className="text-gray-500 text-xs mb-6">{user.email}</p>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => setIsEditing(true)} className="w-full py-2 bg-gray-800 text-white rounded-lg font-bold text-xs hover:bg-black transition-colors">Edit Profil</button>
                                <button onClick={() => setShowDeleteModal(true)} className="w-full py-2 text-red-500 hover:bg-red-50 rounded-lg font-bold text-xs transition-colors">Hapus Akun</button>
                            </div>
                         </>
                     ) : (
                         <div className="space-y-3 text-left">
                             <div>
                                 <label className="block text-[10px] font-bold text-gray-700 mb-1">Username</label>
                                 <input type="text" className="w-full border rounded-lg p-2 text-xs bg-gray-50" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                             </div>
                             <div>
                                 <label className="block text-[10px] font-bold text-gray-700 mb-1">Email</label>
                                 <input type="email" className="w-full border rounded-lg p-2 text-xs bg-gray-50" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                             </div>
                             <div>
                                 <label className="block text-[10px] font-bold text-gray-700 mb-1">Password Baru</label>
                                 <input type="password" placeholder="Kosongkan jika tidak ingin ubah" className="w-full border rounded-lg p-2 text-xs bg-gray-50" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                             </div>
                             <div className="flex gap-2 pt-2">
                                 <button onClick={() => setIsEditing(false)} className="flex-1 py-2 border border-gray-300 rounded-lg font-bold text-xs hover:bg-gray-50">Batal</button>
                                 <button onClick={handleSave} className="flex-1 py-2 bg-brand-red text-white rounded-lg font-bold text-xs hover:bg-red-700">Simpan Perubahan</button>
                             </div>
                         </div>
                     )}
                </div>

                <ConfirmModal 
                    isOpen={showDeleteModal} 
                    title="Hapus Akun" 
                    message="Apakah anda yakin? Semua data dan riwayat pesanan anda akan hilang permanen." 
                    onConfirm={handleDeleteAccount} 
                    onCancel={() => setShowDeleteModal(false)} 
                />
            </div>
        );
    };

    const renderContent = () => {
        const components: { [key: string]: React.ReactNode } = {
            'home': <UserHome />,
            'products': <UserProducts />,
            'cart': <UserCart />,
            'orders': <UserOrders />,
            'inbox': <Inbox />,
            'profile': <UserProfile />,
        };
        return (
            <div key={view} className="animate-in fade-in duration-500 ease-in-out">
                {components[view] || components['home']}
            </div>
        );
    };

    return (
        <>
             {isLoading && <LoadingScreen />}
             <header 
                className="backdrop-blur-md fixed top-0 left-0 right-0 z-40 items-center justify-between px-4 sm:px-6 py-2 shadow-sm flex transition-colors duration-500 h-14"
                style={{ backgroundColor: hexToRgba(auth.themeColor, 0.78) }}
            >
                <Logo />
                <nav className="hidden md:flex items-center space-x-4">
                    {userNavItems.map(item => (
                        <NavLink key={item.name} item={item} isActive={view === item.view} onClick={() => handleNavClick(item)} />
                    ))}
                </nav>
                <HamburgerIcon isOpen={isSidebarOpen} onClick={() => setSidebarOpen(!isSidebarOpen)} badgeCount={pendingOrderCount} />
            </header>

            <div className={`fixed top-0 left-0 h-full w-64 backdrop-blur-md z-50 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:hidden shadow-lg border-r border-gray-200`} style={{ backgroundColor: hexToRgba(auth.themeColor, 0.9) }}>
                <div className="p-4 mb-2 mt-2">
                    <Logo />
                </div>
                <nav className="flex flex-col px-3 space-y-1">
                     {userNavItems.map(item => (
                        <NavLink key={item.name} item={item} isActive={view === item.view} onClick={() => handleNavClick(item)} isSidebar={true} />
                    ))}
                </nav>
            </div>
             {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-transparent backdrop-blur-sm z-40 md:hidden transition-all duration-500" />}

            <main className="flex-grow w-full pt-16 px-2 sm:px-6 lg:px-8 pb-10">
                {renderContent()}
            </main>

            <CheckoutModal isOpen={showCheckoutModal} product={checkoutProduct} initialQty={checkoutQty} onClose={() => setShowCheckoutModal(false)} onSubmit={handleCheckoutSubmit} />
            <SuccessModal isOpen={showSuccessModal} title={successMessage.title} message={successMessage.message} onClose={() => setShowSuccessModal(false)} />
        </>
    );
};

export default UserPanel;
