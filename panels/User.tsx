
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { HomeIcon, ProductIcon, CartIcon, PaymentIcon, OrdersIcon, ProfileIcon, LogoutIcon, ClockIcon, LockIcon, SunIcon, GlobeAltIcon, MapPinIcon, CalendarIcon, InfoIcon, TrashIcon, CheckIcon, XMarkIcon, EditIcon, HeadsetIcon, EnvelopeIcon, WhatsappIcon, PlusIcon, MinusIcon, XCircleIcon, PaperAirplaneIcon } from '../components/Icons';
import { Product, Order, OrderStatus, InvoiceSettings, ProductCategory, Message } from '../types';
import { analyzePaymentProof } from '../services/geminiService';
import { subscribeToProducts, createOrder, subscribeToOrders, updateOrderProof, updateUserProfile, hideOrderForUser, subscribeToInvoiceSettings, updateOrderStatus, subscribeToMessages, markMessageAsRead } from '../services/firebase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Improved CachedImage using LocalStorage for Base64
const CachedImage = ({ src, alt, className }: { src: string, alt: string, className?: string }) => {
    const [imgSrc, setImgSrc] = useState<string>(src);

    useEffect(() => {
        if (!src) return;

        // Simple hash function to generate a key from the base64 content length + start/end chars
        // to avoid storing the whole base64 string as the key itself.
        const generateKey = (str: string) => {
            return `img_${str.length}_${str.slice(0, 20)}_${str.slice(-20)}`;
        };

        const cacheKey = generateKey(src);
        
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                // If found in local storage, use it
                setImgSrc(cached);
            } else {
                // If not found, save it to local storage then use it
                // We verify it's a valid base64 string (usually starts with data:image)
                if (src.startsWith('data:image')) {
                    try {
                        localStorage.setItem(cacheKey, src);
                    } catch (e) {
                        // Quota exceeded or error, just use the src directly without caching
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

const HamburgerIcon = ({ isOpen, onClick, badgeCount }: {isOpen: boolean, onClick: () => void, badgeCount?: number}) => (
    <button onClick={onClick} className="z-50 w-8 h-8 relative focus:outline-none transition-all duration-300">
        <span className={`block w-5 h-0.5 bg-gray-800 absolute transition-all duration-300 ease-in-out left-1/2 -translate-x-1/2 ${isOpen ? 'rotate-45 top-1/2 -translate-y-1/2' : 'top-[32%]'}`}></span>
        <span className={`block w-5 h-0.5 bg-gray-800 absolute transition-all duration-300 ease-in-out left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 ${isOpen ? 'opacity-0' : ''}`}></span>
        <span className={`block w-5 h-0.5 bg-gray-800 absolute transition-all duration-300 ease-in-out left-1/2 -translate-x-1/2 ${isOpen ? '-rotate-45 top-1/2 -translate-y-1/2' : 'top-[68%]'}`}></span>
        
        {!isOpen && badgeCount && badgeCount > 0 ? (
             <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white shadow-sm">
                {badgeCount}
            </span>
        ) : null}
    </button>
);

const OrderCountdown = ({ timestamp }: { timestamp: number }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const deadline = timestamp + (6 * 60 * 60 * 1000); // 6 hours from order time
        
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

        updateTimer(); // Run immediately
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
        <div className="bg-brand-yellow/20 px-2 py-0.5 rounded-md inline-block border border-brand-yellow/50 shadow-sm transform translate-y-1">
            <div className="text-center text-yellow-800 font-bold text-[10px] tracking-tight leading-none">
                {timeLeft}
            </div>
        </div>
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

    // Adjusted button: Large enough for mobile touch, clear text
    // Added mx-2 for consistent spacing with stock bar
    const buttonBaseClass = "group w-[calc(100%-16px)] mx-2 mb-2 h-9 rounded-lg font-metropolis font-bold tracking-wide text-[10px] sm:text-xs shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-1.5 mt-auto duration-300 ease-in-out";

    const getButton = () => {
        const isClosed = product.isSaleClosed || product.stock === 0;
        
        if (product.isComingSoon && !isClosed) {
             return (
                <div className="flex flex-col w-full px-2 mb-2 mt-auto">
                     <div className="flex justify-center mb-1">
                        {product.releaseDate && <ProductCountdown targetDate={product.releaseDate} />}
                    </div>
                    <div className={`w-full h-9 rounded-lg font-metropolis font-bold tracking-wide text-[10px] shadow-sm flex items-center justify-center gap-1.5 bg-yellow-100 text-yellow-800 border border-yellow-200 cursor-not-allowed`}>
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
             <button onClick={onBuy} className={`${buttonBaseClass} bg-green-600 text-white border-b-2 border-green-700 hover:bg-green-700 hover:shadow-green-600/50`}>
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
        <div className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 ease-out flex flex-col h-auto border border-gray-100 w-[95%] sm:w-full mx-auto transform hover:-translate-y-1 relative z-10">
             {/* Image Container: Compact on Desktop with md:h-36 */}
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

                {/* Category Badge */}
                <div className="absolute top-2 left-2 z-20">
                    <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold shadow-sm ${product.category === 'digital' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                        {product.category === 'digital' ? 'Web / Digital' : 'Fisik'}
                    </span>
                </div>

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
            </div>

            {/* Content Wrapper: p-0 for compact control */}
            <div className="flex flex-col flex-grow relative z-10 bg-white">
                {/* Title */}
                <div className="px-2 pt-2 mb-2">
                     <h3 className="font-bold text-xs sm:text-sm mb-0.5 text-gray-900 text-left leading-tight group-hover:text-brand-red transition-colors truncate">{product.name}</h3>
                </div>

                {/* Extra Info Section - Mentok Kiri Kanan (w-full) with Jarak 2 (px-2) */}
                {product.extraInfo && product.extraInfo.length > 0 && (
                    <div className="mb-2 space-y-1 bg-gray-50 py-1.5 px-2 w-full border-y border-gray-100">
                         {product.extraInfo.map((info, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-gray-700">
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
                    <div className="flex flex-col mb-2">
                        <div className="flex items-center justify-between min-h-[20px]">
                            {product.originalPrice > product.discountedPrice ? (
                                <span className="text-[10px] text-gray-400 line-through text-left">Rp{(product.originalPrice).toLocaleString('id-ID')}</span>
                            ) : (
                                <span></span>
                            )}
                            
                             {!product.isSaleClosed && !product.isComingSoon && product.stock > 0 && (
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
                                    className="w-7 h-7 p-1.5 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-brand-yellow text-gray-600 hover:text-brand-red transition-colors group/cart animate-ring-interval flex items-center justify-center"
                                    title="Tambah ke Keranjang"
                                >
                                    <div className="w-4 h-4 [&>svg]:w-full [&>svg]:h-full"><CartIcon /></div>
                                </button>
                             )}
                        </div>

                        <div className="flex items-center gap-1 mt-0.5">
                             <p className="text-sm sm:text-base md:text-lg font-bold text-brand-red text-left">Rp{product.discountedPrice.toLocaleString('id-ID')}</p>
                        </div>
                    </div>

                    {!product.isSaleClosed && !product.isComingSoon && product.stock > 0 && (
                         // Stock Bar: Aligned with Button (mx-2) by wrapping in same margin
                        <div className="relative mb-2">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden border border-gray-200">
                                    <div className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full transition-all duration-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" style={{ width: `${barWidth}%` }}></div>
                                </div>
                                <p className="text-[8px] text-gray-500 font-mono font-bold whitespace-nowrap">{stockText}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {getButton()}
        </div>
    );
};

// ... rest of the file (ConfirmModal, SuccessModal, CheckoutModal, UserPanel, UserInbox, UserHome, UserProducts, UserCart, UserPayment, UserOrders, UserProfile) remains identical, just ensuring UserProductCard is updated. 
// The rest of the components are kept exactly as they were.

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
                         <label className="block text-[10px] font-bold text-gray-700 mb-1">Nomor WhatsApp/HP</label>
                        <input required type="tel" placeholder="08xxxxxxxxxx" className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-brand-orange" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div>
                         <label className="block text-[10px] font-bold text-gray-700 mb-1">Alamat Lengkap</label>
                        <textarea required placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota, Kode Pos" className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-brand-orange h-16 resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    </div>
                    
                    <button type="submit" className="w-full bg-brand-red text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition-all shadow-lg mt-1 text-xs uppercase tracking-wide">
                        Lanjut Pembayaran &rarr;
                    </button>
                </form>
            </div>
        </div>
    );
};

const UserPanel: React.FC = () => {
    const [view, setView] = useState('home');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [processCount, setProcessCount] = useState(0); 
    const [cancelCount, setCancelCount] = useState(0); 

    const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [productToBuy, setProductToBuy] = useState<{product: Product, qty: number} | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [unreadMsgCount, setUnreadMsgCount] = useState(0);
    const [messages, setMessages] = useState<Message[]>([]);

    const hasNotifiedRef = useRef(false);
    const auth = useAuth();
    
    useEffect(() => {
        const unsubscribeProducts = subscribeToProducts((data) => {
            setProducts(data);
        });

        const unsubscribeOrders = subscribeToOrders((allOrders) => {
             const myOrders = allOrders.filter(o => o.userId === auth.currentUser?.uid && !o.hiddenForUser);
             
             const pending = myOrders.filter(o => o.status === OrderStatus.PENDING).length;
             const activeProcess = myOrders.filter(o => o.status === OrderStatus.PAID || o.status === OrderStatus.SHIPPED).length;
             const cancelled = myOrders.filter(o => o.status === OrderStatus.CANCELLED || o.status === OrderStatus.REJECTED).length;
             const shipped = myOrders.filter(o => o.status === OrderStatus.SHIPPED).length;
             const completed = myOrders.filter(o => o.status === OrderStatus.COMPLETED).length;

             setPendingCount(pending);
             setProcessCount(activeProcess); 
             setCancelCount(cancelled);
        });
        
        const unsubscribeMessages = subscribeToMessages((msgs) => {
            if (!auth.currentUser) return;
            const myMsgs = msgs.filter(m => m.userId === auth.currentUser?.uid || m.userId === 'ALL');
            setMessages(myMsgs);
            const unread = myMsgs.filter(m => !m.isRead && m.userId !== 'ALL').length; 
            setUnreadMsgCount(unread);
        });

        return () => {
            unsubscribeProducts();
            unsubscribeOrders();
            unsubscribeMessages();
        };
    }, [auth.currentUser]);

    if (!auth.currentUser) return null;

    const userNavItems = [
        { name: 'Beranda', icon: <HomeIcon />, view: 'home' },
        { name: 'Produk', icon: <ProductIcon />, view: 'products' },
        { name: 'Keranjang', icon: <CartIcon />, view: 'cart', badge: cart.length },
        { name: 'Pembayaran', icon: <PaymentIcon />, view: 'payment', badge: pendingCount }, 
        { name: 'Pesanan Saya', icon: <OrdersIcon />, view: 'orders', badge: processCount }, 
        { name: 'Kotak Masuk', icon: <EnvelopeIcon />, view: 'inbox', badge: unreadMsgCount },
        { name: 'Profil', icon: <ProfileIcon />, view: 'profile' },
        { name: 'Logout', icon: <LogoutIcon />, view: 'logout' },
    ];
    
    const handleNavClick = (item: any) => {
      if (item.view === 'logout') {
        auth.logout();
      } else if (item.action) {
          item.action();
      } else {
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

    const addToCart = (product: Product, qty: number = 1) => {
        if (product.isSaleClosed || product.isComingSoon || product.stock === 0) {
            auth.showNotification({ type: 'error', message: 'Produk tidak tersedia' });
            return;
        }
        if (qty > product.stock) {
            auth.showNotification({ type: 'error', message: 'Stok tidak mencukupi' });
            return;
        }

        const existing = cart.find(c => c.product.id === product.id);
        if (existing) {
            const newCart = cart.map(c => c.product.id === product.id ? {...c, quantity: c.quantity + qty} : c);
            const updatedItem = newCart.find(c => c.product.id === product.id);
            if (updatedItem && updatedItem.quantity > product.stock) {
                 auth.showNotification({ type: 'error', message: 'Melebihi batas stok' });
                 return;
            }
            setCart(newCart);
            auth.showNotification({ type: 'success', message: 'Jumlah diupdate di keranjang' });
        } else {
            setCart([...cart, { product, quantity: qty }]);
            auth.showNotification({ type: 'success', message: 'Masuk keranjang' });
        }
    };

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(c => c.product.id !== productId));
    };

    const handleBuyClick = (product: Product) => {
        setProductToBuy({ product, qty: 1 });
        setIsCheckoutModalOpen(true);
    };

    const handleCheckoutSubmit = async (finalQty: number, shippingData: {name: string, address: string, phone: string}) => {
        if(!auth.currentUser || !productToBuy) return;
        try {
             const orderId = await createOrder(auth.currentUser.uid, auth.currentUser.username, productToBuy.product, finalQty, shippingData);
             auth.showNotification({ type: 'info', message: 'Pesanan dibuat! Cek menu pembayaran.' });
             removeFromCart(productToBuy.product.id);
             setIsCheckoutModalOpen(false);

             if (productToBuy.product.buyLink) {
                 setTimeout(() => {
                     window.open(productToBuy.product.buyLink, '_blank');
                 }, 500);
            } else {
                // WHATSAPP FALLBACK
                const p = productToBuy.product;
                let unitPrice = p.discountedPrice;
                if (p.enableWholesale && p.wholesaleMinQty && p.wholesalePercent) {
                    if (finalQty >= p.wholesaleMinQty) {
                        unitPrice = unitPrice * (1 - p.wholesalePercent / 100);
                    }
                }
                const total = unitPrice * finalQty;

                const message = `*KONFIRMASI PESANAN BARU*
Order ID: #${orderId?.substring(1, 8).toUpperCase()}

*Detail Produk:*
• Nama: ${p.name}
• Kategori: ${p.category === 'digital' ? 'Web / Digital' : 'Fisik'}
• Jumlah: ${finalQty}
• Total: Rp${total.toLocaleString('id-ID')}

*Data Pengiriman:*
• Nama: ${shippingData.name}
• No HP: ${shippingData.phone}
• Alamat: ${shippingData.address}

Mohon diproses. Terima kasih!`;

                const url = `https://wa.me/6285817938860?text=${encodeURIComponent(message)}`;
                setTimeout(() => {
                     window.open(url, '_blank');
                }, 500);
            }
            setProductToBuy(null);
        } catch (e: any) {
             auth.showNotification({ type: 'error', message: e.message || 'Gagal membuat pesanan.' });
        }
    };
    
    const NavLink: React.FC<{ item: any; isActive: boolean; onClick: () => void; isSidebar?: boolean }> = ({ item, isActive, onClick, isSidebar }) => (
        <button
          onClick={onClick}
          className={`group relative flex items-center ${isSidebar ? 'justify-start w-full pl-4' : 'justify-center'} px-3 py-2 rounded-md text-[10px] md:text-sm font-medium transition-all duration-300 ease-in-out ${isActive ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30' : 'text-gray-600 hover:bg-gray-100 hover:text-brand-red'}`}
        >
          <span className={`transform transition-transform duration-300 ${!isSidebar && 'group-hover:scale-110'} ${isSidebar && 'group-hover:translate-x-2'} relative active:scale-95 ${isActive ? 'scale-110' : ''}`}>
              {item.icon}
              {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">
                      {item.badge}
                  </span>
              )}
          </span>
          {isSidebar ? (
              <span className={`ml-3 font-teko text-base pt-0.5 tracking-wide transition-transform duration-300 group-hover:translate-x-1`}>{item.name}</span>
          ) : (
             // Tooltip only for desktop header view
             <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-auto p-2 min-w-max bg-gray-800 text-white text-[10px] rounded-md scale-0 group-hover:scale-100 transition-all duration-300 origin-top z-10 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
              {item.name}
            </span>
          )}
        </button>
    );

    const renderContent = () => {
        const components: { [key: string]: React.ReactNode } = {
            'products': <UserProducts products={products} onAddToCart={(p) => addToCart(p, 1)} onBuy={handleBuyClick} />,
            'cart': <UserCart cart={cart} onRemove={removeFromCart} onBuy={(p, qty) => { setProductToBuy({product: p, qty}); setIsCheckoutModalOpen(true); }} />,
            'payment': <UserPayment />,
            'orders': <UserOrders />,
            'profile': <UserProfile />,
            'inbox': <UserInbox messages={messages} />,
            'home': <UserHome 
                        products={products} 
                        pendingCount={pendingCount} 
                        processCount={processCount}
                        cancelCount={cancelCount}
                        onGoToCatalog={() => handleNavClick({view: 'products'})} 
                        onGoToPayment={() => handleNavClick({view: 'payment'})} 
                        onGoToOrders={() => handleNavClick({view: 'orders'})}
                        onBuy={handleBuyClick} 
                        onAddToCart={(p) => addToCart(p, 1)} 
                      />,
        };
        
        return (
            <div key={view} className="animate-in fade-in duration-500 ease-in-out">
                {components[view] || components['home']}
            </div>
        );
    };

    return (
        <div className="flex-grow w-full bg-gray-50 font-sans flex flex-col min-h-screen">
             {isLoading && <LoadingScreen />}
             <header className="bg-white/90 backdrop-blur-md fixed top-0 left-0 right-0 z-40 items-center justify-between px-4 sm:px-6 py-2 shadow-sm flex transition-all duration-500 h-14">
                <Logo />
                <nav className="hidden md:flex items-center space-x-2">
                    {userNavItems.map(item => (
                        <NavLink key={item.name} item={item} isActive={view === item.view} onClick={() => handleNavClick(item)} />
                    ))}
                </nav>
                <div className="md:hidden">
                     <HamburgerIcon isOpen={isSidebarOpen} onClick={() => setSidebarOpen(!isSidebarOpen)} badgeCount={pendingCount + processCount + cart.length + unreadMsgCount} />
                </div>
            </header>

            <div className={`fixed top-0 left-0 h-full w-64 bg-white/90 backdrop-blur-md z-50 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:hidden shadow-2xl border-r border-gray-200`}>
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

            <main className="flex-grow pt-16 px-2 sm:px-6 lg:px-8 min-h-screen pb-10">
                {renderContent()}
            </main>

            <CheckoutModal 
                isOpen={isCheckoutModalOpen} 
                product={productToBuy?.product || null}
                initialQty={productToBuy?.qty || 1}
                onClose={() => setIsCheckoutModalOpen(false)} 
                onSubmit={handleCheckoutSubmit} 
            />
        </div>
    );
};

// ... rest of existing components (UserInbox, UserHome, UserProducts, UserCart, UserPayment, UserOrders, UserProfile)
const UserInbox: React.FC<{ messages: Message[] }> = ({ messages }) => {
    // ... UserInbox implementation remains same
    const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);

    const openWhatsapp = () => {
        window.open('https://wa.me/6285817938860', '_blank');
    };

    const handleOpenMessage = (msg: Message) => {
        setSelectedMsg(msg);
        if (!msg.isRead && msg.userId !== 'ALL') {
            markMessageAsRead(msg.id);
        }
    };

    return (
        <div className="py-2 max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-base sm:text-xl font-bold text-gray-800 flex items-center gap-2"><EnvelopeIcon /> Kotak Masuk</h2>
                <button onClick={openWhatsapp} className="bg-green-600 text-white px-3 py-1.5 rounded-full font-bold text-[10px] hover:bg-green-700 shadow-md flex items-center gap-1.5 transition-transform hover:scale-105">
                    <WhatsappIcon /> Hubungi Admin
                </button>
            </div>

            <div className="space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-500 text-[10px]">Tidak ada pesan.</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <div 
                            key={msg.id} 
                            onClick={() => handleOpenMessage(msg)}
                            className={`bg-white p-3 rounded-lg shadow-sm border ${msg.userId === 'ALL' ? 'border-red-100 bg-red-50/30' : 'border-gray-100'} relative transition-all duration-300 hover:shadow-md cursor-pointer hover:-translate-y-0.5`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-gray-800 text-xs flex items-center gap-1">
                                    {msg.title}
                                    {msg.userId === 'ALL' && <span className="bg-red-100 text-red-600 text-[8px] px-1.5 py-0 rounded-full">Info</span>}
                                    {!msg.isRead && msg.userId !== 'ALL' && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}
                                </h3>
                                <span className="text-[9px] text-gray-400">{new Date(msg.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-gray-600 text-[10px] leading-relaxed line-clamp-2">{msg.content}</p>
                        </div>
                    ))
                )}
            </div>

            {selectedMsg && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4" onClick={() => setSelectedMsg(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
                         <div className="p-5">
                             <button onClick={() => setSelectedMsg(null)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500"><XMarkIcon /></button>
                             <h3 className="text-base font-bold text-gray-800 mb-1">{selectedMsg.title}</h3>
                             <p className="text-[10px] text-gray-500 mb-4">{new Date(selectedMsg.timestamp).toLocaleString()}</p>
                             <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-3 rounded-lg border border-gray-100">
                                 {selectedMsg.content}
                             </div>
                         </div>
                         <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-end">
                             <button onClick={() => setSelectedMsg(null)} className="px-3 py-1.5 bg-gray-200 text-gray-700 font-bold text-[10px] rounded-lg hover:bg-gray-300">Tutup</button>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const UserHome: React.FC<{ 
    products: Product[], 
    pendingCount: number, 
    processCount: number, 
    cancelCount: number, 
    onGoToCatalog: () => void, 
    onGoToPayment: () => void, 
    onGoToOrders: () => void, 
    onBuy: (p: Product) => void, 
    onAddToCart: (p: Product) => void 
}> = ({ products, pendingCount, processCount, cancelCount, onGoToCatalog, onGoToPayment, onGoToOrders, onBuy, onAddToCart }) => {
    const auth = useAuth();
    const [showTempStatus, setShowTempStatus] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setShowTempStatus(false), 5000);
        return () => clearTimeout(timer);
    }, []);
    
    return (
        <div className="text-center py-4 sm:py-8">
            <div className="max-w-3xl mx-auto mb-6">
                 <h2 className="text-2xl md:text-5xl font-oswald lowercase mb-4 text-gray-900 tracking-wide leading-tight">
                    hi, <span className="text-brand-red font-bold">{auth.currentUser?.username}</span>
                </h2>
                
                <div className="flex flex-row flex-wrap justify-center gap-2 mb-6">
                    {pendingCount > 0 && (
                        <div onClick={onGoToPayment} className="bg-yellow-50 border border-yellow-200 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-yellow-100 transition-all flex items-center gap-2 shadow-sm group min-w-[120px]">
                            <div className="w-5 h-5 bg-yellow-200 text-yellow-700 rounded-full flex items-center justify-center animate-pulse shadow-inner">
                                <PaymentIcon />
                            </div>
                            <div className="text-left flex flex-col">
                                <span className="text-yellow-800 font-bold text-[8px] uppercase tracking-wide">Menunggu Bayar</span>
                                <span className="text-yellow-700 text-xs font-bold leading-none">{pendingCount}</span>
                            </div>
                        </div>
                    )}

                    {processCount > 0 && showTempStatus && (
                        <div onClick={onGoToOrders} className="bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-blue-100 transition-all flex items-center gap-2 shadow-sm group min-w-[120px] animate-fade-out">
                            <div className="w-5 h-5 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center animate-pulse shadow-inner">
                                <ClockIcon />
                            </div>
                            <div className="text-left flex flex-col">
                                <span className="text-blue-800 font-bold text-[8px] uppercase tracking-wide">Sedang Diproses</span>
                                <span className="text-blue-700 text-xs font-bold leading-none">{processCount}</span>
                            </div>
                        </div>
                    )}

                    {cancelCount > 0 && showTempStatus && (
                         <div className="bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 flex items-center gap-2 shadow-sm opacity-80 min-w-[120px] animate-fade-out">
                            <div className="w-5 h-5 bg-red-200 text-red-700 rounded-full flex items-center justify-center shadow-inner">
                                <XCircleIcon />
                            </div>
                            <div className="text-left flex flex-col">
                                <span className="text-red-800 font-bold text-[8px] uppercase tracking-wide">Dibatalkan</span>
                                <span className="text-red-700 text-xs font-bold leading-none">{cancelCount}</span>
                            </div>
                        </div>
                    )}
                </div>

                {pendingCount === 0 && (processCount === 0 || !showTempStatus) && (
                    <p className="text-gray-600 mb-6 max-w-xl mx-auto text-xs leading-relaxed">
                        Koleksi terbaru menunggu untuk Anda jelajahi. Temukan karya yang sempurna untuk koleksi Anda hari ini.
                    </p>
                )}

                <button onClick={onGoToCatalog} className="bg-brand-red text-white font-metropolis font-bold tracking-wide text-xs py-2.5 px-6 rounded-full hover:bg-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-brand-red/30 uppercase">
                    Jelajahi Katalog
                </button>
            </div>
             <h3 className="text-sm font-bold mb-4 text-gray-800 text-left pl-2 border-l-4 border-brand-orange">Rekomendasi Untuk Anda</h3>
             {/* Updated Grid: 5 columns on XL screens */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 xl:gap-2 items-start">
                {products.slice(0, 5).map(p => (
                    <UserProductCard key={p.id} product={p} onBuy={() => onBuy(p)} onAddToCart={() => onAddToCart(p)} />
                ))}
            </div>
        </div>
    );
};

const UserProducts: React.FC<{ products: Product[], onAddToCart: (p: Product) => void, onBuy: (p: Product) => void }> = ({ products, onAddToCart, onBuy }) => (
    <div className="py-2 max-w-7xl mx-auto">
        <h2 className="text-base sm:text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><ProductIcon /> Katalog Lengkap</h2>
        {/* Updated Grid: 5 columns on XL screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 xl:gap-2 items-start">
            {products.map(p => (
                 <UserProductCard key={p.id} product={p} onBuy={() => onBuy(p)} onAddToCart={() => onAddToCart(p)} />
            ))}
        </div>
    </div>
);

const UserCart: React.FC<{ cart: {product: Product, quantity: number}[], onRemove: (id: string) => void, onBuy: (p: Product, qty: number) => void }> = ({ cart, onRemove, onBuy }) => (
    // ... UserCart implementation remains same
    <div className="py-2 max-w-2xl mx-auto">
        <h2 className="text-base sm:text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><CartIcon /> Keranjang Belanja</h2>
        {cart.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500 text-xs">Keranjang masih kosong.</p>
            </div>
        ) : (
            <div className="space-y-1.5">
                {cart.map(item => (
                     // @ts-ignore
                     <SwipeableCartItem key={item.product.id} item={item} onRemove={() => onRemove(item.product.id)} onBuy={() => onBuy(item.product, item.quantity)} />
                ))}
            </div>
        )}
    </div>
);
// ... (UserPayment, UserOrders, UserProfile, and other component implementations remain unchanged)
const UserPayment = () => {
    // ... UserPayment implementation remains same
    const [orders, setOrders] = useState<Order[]>([]);
    const [cancelId, setCancelId] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [stagedFiles, setStagedFiles] = useState<{ [key: string]: File }>({});
    
    const auth = useAuth();
    
    useEffect(() => {
        const unsub = subscribeToOrders((allOrders) => {
             const myPending = allOrders.filter(o => o.userId === auth.currentUser?.uid && o.status === OrderStatus.PENDING && !o.hiddenForUser);
             setOrders(myPending);
        });
        return () => unsub();
    }, [auth.currentUser]);

    const handleFileSelect = (orderId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setStagedFiles(prev => ({ ...prev, [orderId]: file }));
    };

    const handleSendProof = async (orderId: string) => {
        const file = stagedFiles[orderId];
        if (!file) return;

        auth.showNotification({ type: 'info', message: 'Mengirim bukti pembayaran...' });
        
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            await updateOrderProof(orderId, base64);
            const newStaged = { ...stagedFiles };
            delete newStaged[orderId];
            setStagedFiles(newStaged);
            setShowSuccessModal(true);
        };
        reader.readAsDataURL(file);
    };
    
    const handleConfirmCancel = async () => {
        if (cancelId) {
            await updateOrderStatus(cancelId, OrderStatus.CANCELLED);
            await hideOrderForUser(cancelId);
            auth.showNotification({ type: 'info', message: 'Pesanan dibatalkan.' });
            setCancelId(null);
        }
    };

    return (
        <div className="py-2 max-w-3xl mx-auto">
            <h2 className="text-base sm:text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><PaymentIcon /> Menunggu Pembayaran</h2>
            {orders.length === 0 ? (
                 <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500 text-xs">Tidak ada tagihan yang belum dibayar.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map(order => (
                        <div key={order.id} className="bg-white p-3 rounded-xl shadow-md border border-gray-100 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-2">
                                 <OrderCountdown timestamp={order.timestamp} />
                             </div>
                             <div className="mb-3">
                                 <p className="text-[9px] text-gray-500">Order ID: #{order.id.substring(1, 8)}</p>
                                 <h3 className="font-bold text-gray-800 text-xs">{order.items[0].product.name} (x{order.items[0].quantity})</h3>
                                 <p className="text-brand-red font-bold text-base">Rp{order.totalPrice.toLocaleString('id-ID')}</p>
                             </div>
                             
                             <div className="bg-gray-50 p-2.5 rounded-lg mb-3 text-[10px] text-gray-600 border border-gray-200">
                                 <p className="font-bold mb-0.5">Transfer ke:</p>
                                 <p>BCA: 1234567890 (A.N PT KELIK DULU)</p>
                                 <p>Mandiri: 0987654321 (A.N PT KELIK DULU)</p>
                             </div>

                             <div className="flex gap-2 items-center">
                                 {order.paymentProof ? (
                                     <button disabled className="flex-1 py-1.5 rounded-lg text-center font-bold text-[10px] shadow-md flex items-center justify-center gap-1 bg-amber-500 text-white cursor-not-allowed opacity-90 border border-amber-600">
                                        <LockIcon /> Menunggu Konfirmasi
                                     </button>
                                 ) : (
                                     <div className="flex-1 flex gap-2">
                                         <label className={`flex-1 py-1.5 rounded-lg text-center font-bold text-[10px] shadow-md transition-colors flex items-center justify-center gap-1 cursor-pointer ${stagedFiles[order.id] ? 'bg-gray-100 text-gray-700 border border-gray-300' : 'bg-brand-red text-white hover:bg-red-700'}`}>
                                             {stagedFiles[order.id] ? <span className="truncate max-w-[100px]">{stagedFiles[order.id].name}</span> : <>Upload Bukti Transfer</>}
                                             <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(order.id, e)} />
                                         </label>
                                         {stagedFiles[order.id] && (
                                            <button onClick={() => handleSendProof(order.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg font-bold text-[10px] hover:bg-green-700 shadow-md flex items-center gap-1">
                                                <PaperAirplaneIcon /> Kirim
                                            </button>
                                         )}
                                     </div>
                                 )}
                                 <button onClick={() => setCancelId(order.id)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 text-[10px] font-bold">
                                     Batal
                                 </button>
                             </div>
                        </div>
                    ))}
                </div>
            )}
            <ConfirmModal isOpen={!!cancelId} title="Batalkan Pesanan" message="Apakah anda yakin ingin membatalkan pesanan ini?" onConfirm={handleConfirmCancel} onCancel={() => setCancelId(null)} />
             <SuccessModal isOpen={showSuccessModal} title="Bukti Terkirim" message="Bukti pembayaran anda sudah dikirim ke admin. Silahkan tunggu konfirmasi selanjutnya." onClose={() => setShowSuccessModal(false)} />
        </div>
    );
};

const UserOrders = () => {
    // ... UserOrders implementation remains same
    const [orders, setOrders] = useState<Order[]>([]);
    const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const auth = useAuth();
    const invoiceRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubOrders = subscribeToOrders((allOrders) => {
            const myOrders = allOrders.filter(o => o.userId === auth.currentUser?.uid && o.status !== OrderStatus.PENDING && !o.hiddenForUser);
            setOrders(myOrders);
        });
        const unsubSettings = subscribeToInvoiceSettings(setInvoiceSettings);
        return () => { unsubOrders(); unsubSettings(); };
    }, [auth.currentUser]);

    const handleDownloadInvoice = async (order: Order) => {
        if (!invoiceRef.current || !invoiceSettings) {
            auth.showNotification({type: 'error', message: 'Data invoice belum lengkap dari admin.'});
            return;
        }
        const element = invoiceRef.current;
        const dateStr = new Date(order.timestamp).toLocaleDateString('id-ID');
        (document.getElementById('inv-no') as HTMLSpanElement).innerText = order.id.substring(1, 8).toUpperCase();
        (document.getElementById('inv-date') as HTMLSpanElement).innerText = dateStr;
        (document.getElementById('bill-name') as HTMLElement).innerText = order.shippingDetails?.name || order.username;
        (document.getElementById('bill-email') as HTMLElement).innerText = auth.currentUser?.email || 'N/A';
        (document.getElementById('item-name') as HTMLElement).innerText = order.items[0].product.name;
        (document.getElementById('item-qty') as HTMLElement).innerText = order.items[0].quantity.toString();
        const effectiveUnitPrice = order.totalPrice / order.items[0].quantity;
        (document.getElementById('item-price') as HTMLElement).innerText = `Rp${effectiveUnitPrice.toLocaleString('id-ID')}`;
        (document.getElementById('item-total') as HTMLElement).innerText = `Rp${order.totalPrice.toLocaleString('id-ID')}`;
        (document.getElementById('inv-subtotal') as HTMLElement).innerText = `Rp${order.totalPrice.toLocaleString('id-ID')}`;
        (document.getElementById('inv-total') as HTMLElement).innerText = `Rp${order.totalPrice.toLocaleString('id-ID')}`;
        element.style.display = 'block';
        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Invoice-${order.id.substring(1,8)}.pdf`);
            auth.showNotification({type: 'success', message: 'Invoice berhasil diunduh'});
        } catch (err) {
            console.error(err);
            auth.showNotification({type: 'error', message: 'Gagal generate PDF'});
        } finally {
            element.style.display = 'none';
        }
    };

    const handleConfirmDelete = async () => {
        if (deleteId) {
            await hideOrderForUser(deleteId);
            auth.showNotification({ type: 'info', message: 'Riwayat pesanan dihapus.' });
            setDeleteId(null);
        }
    };

    const handleMarkReceived = async (orderId: string) => {
        if(window.confirm("Pastikan barang sudah diterima dengan baik. Konfirmasi?")) {
             await updateOrderStatus(orderId, OrderStatus.COMPLETED);
             auth.showNotification({ type: 'success', message: 'Terima kasih! Pesanan selesai.' });
        }
    };

    const getStatusMessage = (order: Order) => {
        if (order.status === OrderStatus.PAID) {
             return (
                <div className="mt-2 bg-orange-50 border border-orange-100 p-2 rounded text-[9px] text-orange-800 leading-relaxed">
                    <strong>Informasi:</strong> Pesanan akan segera disiapkan. Admin akan hubungi anda melalui pesan chat aplikasi untuk memberikan barang.
                </div>
             );
        }
        if (order.status === OrderStatus.SHIPPED) {
             return (
                <div className="mt-2 bg-blue-100 border border-blue-200 p-2 rounded flex items-center justify-between gap-2 animate-pulse">
                    <div className="flex items-center gap-1.5">
                        <div className="bg-blue-500 text-white p-0.5 rounded-full"><CheckIcon /></div>
                        <span className="text-blue-800 font-bold text-[10px]">Pesanan Sedang Diantar</span>
                    </div>
                    <button onClick={() => handleMarkReceived(order.id)} className="bg-blue-600 text-white px-2 py-1 rounded-full text-[9px] font-bold hover:bg-blue-700 shadow-sm whitespace-nowrap">
                        Konfirmasi Terima
                    </button>
                </div>
             );
        }
        if (order.status === OrderStatus.COMPLETED) {
             const isDigital = order.items[0].product.category === 'digital';
             if (isDigital) {
                 return (
                    <div className="mt-2 bg-blue-50 border border-blue-100 p-2 rounded flex items-start gap-2">
                        <div className="bg-blue-500 text-white p-0.5 rounded-full mt-0.5"><CheckIcon /></div>
                        <div className="text-[9px] text-blue-800 leading-relaxed">
                            <strong>Pesanan Selesai.</strong> Produk terkirim ke email. Cek email/spam anda dan jika belum ada silahkan tunggu 1 hari jam kerja dan kemudian hubungi admin jika masih belum ada.
                        </div>
                    </div>
                 );
             } else {
                 return (
                    <div className="mt-2 bg-green-100 border border-green-200 p-2 rounded flex items-center gap-2">
                        <div className="bg-green-500 text-white p-0.5 rounded-full"><CheckIcon /></div>
                        <span className="text-green-800 font-bold text-[10px]">Pesanan Diterima</span>
                    </div>
                 );
             }
        }
        return null;
    };

    return (
        <div className="py-2 max-w-3xl mx-auto">
            <h2 className="text-base sm:text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><OrdersIcon /> Riwayat Pesanan</h2>
             {orders.length === 0 ? (
                 <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500 text-xs">Belum ada riwayat pesanan.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {orders.map(order => (
                        <div key={order.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 relative">
                             <div className="absolute top-2 right-2 flex gap-2">
                                <button onClick={() => setDeleteId(order.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                    <TrashIcon />
                                </button>
                             </div>

                            <div className="flex justify-between items-start mb-1 pr-6">
                                <div>
                                    <p className="text-[9px] text-gray-500">#{order.id.substring(1, 8)} • {new Date(order.timestamp).toLocaleDateString()}</p>
                                    <h3 className="font-bold text-xs text-gray-800">{order.items[0].product.name} (x{order.items[0].quantity})</h3>
                                    <p className="text-[10px] text-gray-600">Total: Rp{order.totalPrice.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                                        order.status === OrderStatus.PAID ? 'bg-green-100 text-green-700' : 
                                        order.status === OrderStatus.SHIPPED ? 'bg-blue-100 text-blue-700' :
                                        order.status === OrderStatus.COMPLETED ? 'bg-purple-100 text-purple-700' :
                                        order.status === OrderStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                        order.status === OrderStatus.CANCELLED ? 'bg-gray-100 text-gray-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {order.status}
                                    </span>
                                    {(order.status === OrderStatus.PAID || order.status === OrderStatus.COMPLETED) && (
                                        <button 
                                            onClick={() => handleDownloadInvoice(order)}
                                            className="flex items-center gap-1 bg-gray-800 text-white px-1.5 py-0.5 rounded text-[8px] hover:bg-black transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-2.5 h-2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                            </svg>
                                            Invoice
                                        </button>
                                    )}
                                </div>
                            </div>
                            {getStatusMessage(order)}
                        </div>
                    ))}
                </div>
            )}
            
            <ConfirmModal isOpen={!!deleteId} title="Hapus Riwayat" message="Apakah anda yakin ingin menghapus riwayat pesanan ini?" onConfirm={handleConfirmDelete} onCancel={() => setDeleteId(null)} />
            <div ref={invoiceRef} style={{ display: 'none', width: '794px', minHeight: '1123px', backgroundColor: 'white', padding: '40px', position: 'absolute', top: 0, left: '-9999px' }}>
               {/* Invoice Template Code (unchanged structure, hidden from UI) */}
               <div className="flex justify-between items-start mb-12 relative">
                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-brand-red rounded-full opacity-90 z-0"></div>
                    <div className="relative z-10 pt-4">
                         {invoiceSettings?.logoUrl ? (
                             <img src={invoiceSettings.logoUrl} alt="Logo" className="h-16 object-contain mb-2" />
                         ) : <h2 className="text-2xl font-bold mb-2">{invoiceSettings?.companyName || 'LOGO APLIKASI'}</h2>}
                    </div>
                    
                    <div className="text-right relative z-10">
                        <div className="absolute -top-10 -right-10 w-[400px] h-40 bg-black rounded-bl-full flex items-center justify-center pr-10 pt-10">
                            <h1 className="text-6xl font-bold text-white tracking-widest">INVOICE</h1>
                        </div>
                    </div>
                </div>
                <div className="mt-32 mb-8 px-4">
                    <h3 className="text-sm font-bold text-gray-600 mb-1">BILL TO:</h3>
                    <h2 id="bill-name" className="text-2xl font-bold text-brand-red mb-1">NAMA PEMBELI</h2>
                    <p id="bill-email" className="text-gray-600">email@example.com</p>
                    <div className="flex justify-end -mt-10">
                        <div className="text-right">
                             <div className="flex justify-between w-64 mb-1">
                                 <span className="font-bold">Invoice No :</span>
                                 <span id="inv-no" className="text-gray-600">#12345</span>
                             </div>
                             <div className="flex justify-between w-64">
                                 <span className="font-bold">Invoice Date :</span>
                                 <span id="inv-date" className="text-gray-600">DD/MM/YYYY</span>
                             </div>
                        </div>
                    </div>
                </div>
                <div className="px-4 mb-12">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-black text-white rounded-full overflow-hidden">
                                <th className="py-3 px-6 text-left rounded-l-full font-bold text-sm uppercase">Item Description</th>
                                <th className="py-3 px-4 text-center font-bold text-sm uppercase">Qty</th>
                                <th className="py-3 px-4 text-right font-bold text-sm uppercase">Price</th>
                                <th className="py-3 px-6 text-right rounded-r-full bg-brand-red font-bold text-sm uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-600">
                            <tr className="bg-gray-50">
                                <td id="item-name" className="py-4 px-6 font-medium">Product Name</td>
                                <td id="item-qty" className="py-4 px-4 text-center">1</td>
                                <td id="item-price" className="py-4 px-4 text-right">Rp0</td>
                                <td id="item-total" className="py-4 px-6 text-right font-bold text-gray-800">Rp0</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-between px-4 items-end">
                    <div className="w-1/2">
                        <h3 className="font-bold text-lg mb-2">Payment Information:</h3>
                        <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                            {invoiceSettings?.bankDetails || 'Bank Info Not Set'}
                        </div>
                         <div className="mt-8 space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2"><span>{invoiceSettings?.footerNote?.split('\n')[0] || 'Contact Info'}</span></div>
                            <div className="flex items-center gap-2"><span>{invoiceSettings?.companyAddress || 'Address Info'}</span></div>
                        </div>
                    </div>
                    <div className="w-1/2 pl-10">
                         <div className="bg-black text-white rounded-l-full py-6 px-8 mb-8">
                             <div className="flex justify-between mb-2"><span>Subtotal</span><span id="inv-subtotal">Rp0</span></div>
                             <div className="flex justify-between mb-2"><span>Tax</span><span>0%</span></div>
                             <div className="flex justify-between font-bold text-xl text-brand-red mt-4"><span>TOTAL</span><span id="inv-total">Rp0</span></div>
                         </div>
                         <div className="text-center pr-10">
                             {invoiceSettings?.signatureUrl && <img src={invoiceSettings.signatureUrl} alt="Sig" className="h-16 mx-auto mb-2" />}
                             <div className="border-t border-gray-400 w-48 mx-auto"></div>
                             <p className="font-bold mt-2">{invoiceSettings?.ownerName || 'Owner'}</p>
                         </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-brand-red rounded-tr-full z-0"></div>
                <div className="absolute bottom-0 left-20 w-20 h-20 bg-brand-orange rounded-full z-10"></div>
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-brand-orange rounded-tl-full z-0"></div>
            </div>
        </div>
    );
};

const UserProfile = () => {
    // ... UserProfile implementation remains same
    const auth = useAuth();
    const [formData, setFormData] = useState({ username: auth.currentUser?.username || '', email: auth.currentUser?.email || '' });

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        try {
            await updateUserProfile(auth.currentUser.uid, formData);
            auth.showNotification({ type: 'success', message: 'Profil diperbarui' });
        } catch (e) {
            auth.showNotification({ type: 'error', message: 'Gagal update profil' });
        }
    };

    return (
        <div className="py-2 max-w-md mx-auto">
            <h2 className="text-base sm:text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><ProfileIcon /> Profil Saya</h2>
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
                <div className="flex flex-col items-center mb-4">
                    <div className="w-16 h-16 bg-brand-orange/10 rounded-full flex items-center justify-center text-brand-orange mb-2">
                        <ProfileIcon /> 
                    </div>
                    <p className="font-bold text-gray-800">{auth.currentUser?.username}</p>
                    <p className="text-xs text-gray-500">{auth.currentUser?.email}</p>
                </div>
                <form onSubmit={handleUpdate} className="space-y-3">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-1">Username</label>
                        <input type="text" className="w-full bg-white text-gray-900 border rounded p-2 border-gray-300 text-xs" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                    </div>
                     <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-1">Email</label>
                        <input type="email" disabled className="w-full border rounded p-2 bg-gray-100 text-gray-500 border-gray-300 text-xs cursor-not-allowed" value={formData.email} />
                    </div>
                    <button type="submit" className="w-full bg-brand-red text-white font-bold py-2 rounded-lg hover:bg-red-700 transition-colors text-[10px] sm:text-xs shadow-lg uppercase tracking-wide">
                        Simpan Perubahan
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UserPanel;
