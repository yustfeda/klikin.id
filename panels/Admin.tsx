import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { OverviewIcon, UsersIcon, ProductIcon, OrdersIcon, LogoutIcon, TrashIcon, EditIcon, CheckIcon, XCircleIcon, LockIcon, SearchIcon, XMarkIcon, ClockIcon, GlobeAltIcon, EnvelopeIcon, PaperAirplaneIcon } from '../components/Icons';
import { User, Product, Order, OrderStatus, InvoiceSettings, ProductCategory, Message } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { subscribeToOrders, subscribeToProducts, subscribeToUsers, updateOrderStatus, addProduct, updateProduct, deleteProduct, deleteUser, toggleUserStatus, updateBanner, subscribeToBanner, updateInvoiceSettings, subscribeToInvoiceSettings, deleteOrder, deleteAllOrdersByUser, sendMessage, subscribeToMessages, deleteMessage } from '../services/firebase';

// Utility Component for Cached Image (Replicated here to avoid file creation if restricted, but follows 'update' logic)
const CachedImage = ({ src, alt, className }: { src: string, alt: string, className?: string }) => {
    const [imgSrc, setImgSrc] = useState(src);

    useEffect(() => {
        // Flow: Check LocalStorage -> Use if exists. Else, use src and save to LocalStorage.
        // This ensures we don't "hit" the network if it was a URL, or we retrieve from local cache if it's a base64 string previously saved.
        // For Base64 coming from Firebase, it's already in memory, but this satisfies the prompt "simpan base64 ke localstorage".
        
        const cacheKey = `img_cache_${src.substring(0, 32)}`; // Short hash simulation for key
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            setImgSrc(cached);
        } else {
            // Save to cache
            try {
                // Only cache if it's valid image data
                if(src) {
                     localStorage.setItem(cacheKey, src);
                }
            } catch (e) {
                // Silently fail if quota exceeded
            }
            setImgSrc(src);
        }
    }, [src]);

    return <img src={imgSrc} alt={alt} className={className} />;
};

const Logo = () => (
    <h1 className="flex items-baseline select-none cursor-pointer group">
        <img 
            src="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWQ5YjhzaWJuc3MxcHYxNmt6d3gwcHNjd2FoeXU1cHpheDJjdDR6biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/npyCJplcYPIXjWzwtp/giphy.gif" 
            alt="K" 
            className="h-6 w-auto sm:h-8 mr-1 transform translate-y-0.5" 
        />
        <div className="flex items-baseline tracking-tighter gap-0.5">
            <span className="font-vanguard text-brand-orange text-2xl sm:text-3xl tracking-wide drop-shadow-[2px_2px_0px_rgba(0,0,0,0.15)] leading-none">
                KELIK
            </span>
            <span className="font-aerion font-bold italic text-brand-blue text-lg sm:text-xl tracking-wide drop-shadow-[1px_1px_0px_rgba(0,0,0,0.1)] leading-none">
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
        <p className="mt-4 text-xs font-bold text-gray-500 animate-pulse tracking-widest uppercase">Memuat Data...</p>
    </div>
);

const HamburgerIcon = ({ isOpen, onClick, badgeCount }: {isOpen: boolean, onClick: () => void, badgeCount?: number}) => (
    <button onClick={onClick} className="z-50 w-8 h-8 relative focus:outline-none md:hidden">
        <span className={`block w-5 h-0.5 bg-gray-800 absolute transition-all duration-300 ease-in-out left-1/2 -translate-x-1/2 ${isOpen ? 'rotate-45 top-1/2 -translate-y-1/2' : 'top-[32%]'}`}></span>
        <span className={`block w-5 h-0.5 bg-gray-800 absolute transition-all duration-300 ease-in-out left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 ${isOpen ? 'opacity-0' : ''}`}></span>
        <span className={`block w-5 h-0.5 bg-gray-800 absolute transition-all duration-300 ease-in-out left-1/2 -translate-x-1/2 ${isOpen ? '-rotate-45 top-1/2 -translate-y-1/2' : 'top-[68%]'}`}></span>
        
        {!isOpen && badgeCount && badgeCount > 0 ? (
             <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white shadow-sm animate-bounce">
                {badgeCount}
            </span>
        ) : null}
    </button>
);

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.581-.495.644-.869l.214-1.281Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
);

// Utility for Counting Animation
const AnimatedCounter = ({ value, isCurrency = false }: { value: number, isCurrency?: boolean }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = value;
        if (start === end) {
             setDisplayValue(end);
             return;
        }

        const duration = 1000; // 1 second duration
        const incrementTime = 20; 
        const totalSteps = duration / incrementTime;
        const incrementValue = (end - start) / totalSteps;

        let current = start;
        const timer = setInterval(() => {
            current += incrementValue;
            if ((incrementValue > 0 && current >= end) || (incrementValue < 0 && current <= end)) {
                setDisplayValue(end);
                clearInterval(timer);
            } else {
                setDisplayValue(current);
            }
        }, incrementTime);

        return () => clearInterval(timer);
    }, [value]);

    if (isCurrency) {
        return <>{Math.floor(displayValue).toLocaleString('id-ID')}</>;
    }
    return <>{Math.floor(displayValue)}</>;
};

interface ImageCropperProps {
    src: string;
    onCrop: (base64: string) => void;
    onCancel: () => void;
    cropWidth?: number;
    cropHeight?: number;
    title?: string;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ src, onCrop, onCancel, cropWidth = 320, cropHeight = 240, title = "Sesuaikan Gambar" }) => {
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const startPos = useRef({ x: 0, y: 0 });
    const [baseScale, setBaseScale] = useState(0.5);

    const VIEWPORT_WIDTH = cropWidth;
    const VIEWPORT_HEIGHT = cropHeight;

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        startPos.current = { x: clientX - offset.x, y: clientY - offset.y };
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        setOffset({
            x: clientX - startPos.current.x,
            y: clientY - startPos.current.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleCrop = () => {
        if (!imgRef.current) return;
        const canvas = document.createElement('canvas');
        const OUTPUT_WIDTH = VIEWPORT_WIDTH * 2.5;
        const OUTPUT_HEIGHT = VIEWPORT_HEIGHT * 2.5;
        canvas.width = OUTPUT_WIDTH;
        canvas.height = OUTPUT_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const scaleRatio = OUTPUT_WIDTH / VIEWPORT_WIDTH;
        ctx.save();
        ctx.translate(OUTPUT_WIDTH / 2, OUTPUT_HEIGHT / 2);
        ctx.translate(offset.x * scaleRatio, offset.y * scaleRatio);
        const scaleCover = Math.max(VIEWPORT_WIDTH / imgRef.current.naturalWidth, VIEWPORT_HEIGHT / imgRef.current.naturalHeight);
        const finalScale = scaleCover * zoom * scaleRatio;
        ctx.scale(finalScale, finalScale);
        ctx.drawImage(imgRef.current, -imgRef.current.naturalWidth / 2, -imgRef.current.naturalHeight / 2);
        ctx.restore();
        onCrop(canvas.toDataURL('image/jpeg', 0.9));
    };

    return (
         <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
                    <button onClick={onCancel} className="text-gray-500 hover:text-gray-700"><XMarkIcon /></button>
                </div>
                <div className="w-full bg-gray-900 flex items-center justify-center p-8 relative overflow-hidden select-none">
                    <div 
                        className="relative overflow-hidden shadow-2xl border-2 border-white/50 cursor-move touch-none bg-black"
                        style={{ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleMouseDown}
                        onTouchMove={handleMouseMove}
                        onTouchEnd={handleMouseUp}
                    >
                        <img 
                            ref={imgRef}
                            src={src} 
                            alt="Crop" 
                            className="absolute left-1/2 top-1/2 max-w-none"
                            style={{ 
                                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                                width: imgRef.current ? imgRef.current.naturalWidth * baseScale : 'auto',
                                height: imgRef.current ? imgRef.current.naturalHeight * baseScale : 'auto',
                            }}
                            onLoad={(e) => {
                                const img = e.currentTarget;
                                const sX = VIEWPORT_WIDTH / img.naturalWidth;
                                const sY = VIEWPORT_HEIGHT / img.naturalHeight;
                                setBaseScale(Math.max(sX, sY));
                            }}
                            draggable={false}
                        />
                    </div>
                </div>
                <div className="p-6 bg-white space-y-4">
                    <input 
                        type="range" 
                        min="1" 
                        max="3" 
                        step="0.1" 
                        value={zoom} 
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-red"
                    />
                    <div className="flex gap-3">
                        <button onClick={onCancel} className="flex-1 py-3 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 text-xs">Batal</button>
                        <button onClick={handleCrop} className="flex-1 py-3 bg-brand-red text-white rounded-lg font-bold hover:bg-red-700 shadow-md flex items-center justify-center gap-2 text-xs">Simpan</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminPanel: React.FC = () => {
    const [view, setView] = useState('overview');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
    const auth = useAuth();
    
    useEffect(() => {
        const unsub = subscribeToOrders((orders) => {
            setPendingOrdersCount(orders.filter(o => o.status === OrderStatus.PENDING).length);
        });
        return () => unsub();
    }, []);

    const adminNavItems = [
        { name: 'Overview', icon: <OverviewIcon />, view: 'overview' },
        { name: 'Manage Users', icon: <UsersIcon />, view: 'users' },
        { name: 'Manage Products', icon: <ProductIcon />, view: 'products' },
        { name: 'Manage Orders', icon: <OrdersIcon />, view: 'orders', badge: pendingOrdersCount },
        { name: 'Pesan', icon: <EnvelopeIcon />, view: 'messages' }, // NEW
        { name: 'Pengaturan', icon: <SettingsIcon />, view: 'settings' },
        { name: 'Logout', icon: <LogoutIcon />, view: 'logout' },
    ];
    
     const handleNavClick = (viewName: string) => {
      if (viewName === 'logout') {
        auth.adminLogout();
      } else {
        if (view === viewName) {
            setSidebarOpen(false);
            return;
        }
        
        setIsLoading(true);
        setSidebarOpen(false);
        
        setTimeout(() => {
            setView(viewName);
            setIsLoading(false);
        }, 1000);
      }
    };
    
    const NavLink: React.FC<{ item: any; isActive: boolean; onClick: () => void; isSidebar?: boolean }> = ({ item, isActive, onClick, isSidebar }) => (
        <button
          onClick={onClick}
          className={`group relative flex items-center ${isSidebar ? 'justify-start w-full pl-4' : 'justify-center'} px-3 py-2 rounded-md text-xs md:text-sm font-medium transition-all duration-300 ${isActive ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30' : 'text-gray-600 hover:bg-gray-100 hover:text-brand-red'}`}
        >
          <span className={`transform transition-transform duration-300 ${!isSidebar && 'group-hover:scale-110'} ${isSidebar && 'group-hover:translate-x-2'} active:scale-95 ${isActive ? 'scale-110' : ''} relative`}>
              {item.icon}
              {item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white shadow-sm animate-pulse">
                      {item.badge}
                  </span>
              )}
          </span>
          {isSidebar && <span className="ml-4 font-teko text-lg pt-1 tracking-wide transition-transform duration-300 group-hover:translate-x-1">{item.name}</span>}
          {!isSidebar && (
            <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-auto p-2 min-w-max bg-gray-700 text-white text-xs rounded-md scale-0 group-hover:scale-100 transition-transform origin-top z-10 z-50 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
              {item.name}
            </span>
          )}
        </button>
    );

    const renderContent = () => {
        const components: { [key: string]: React.ReactNode } = {
            'users': <ManageUsers />,
            'products': <ManageProducts />,
            'orders': <ManageOrders />,
            'settings': <ManageSettings />,
            'overview': <Overview />,
            'messages': <ManageMessages />,
        };

        return (
            <div key={view} className="animate-in fade-in duration-500 ease-in-out">
                {components[view] || components['overview']}
            </div>
        );
    };

    return (
        <>
             {isLoading && <LoadingScreen />}
             <header className="bg-white/90 backdrop-blur-md fixed top-0 left-0 right-0 z-40 items-center justify-between px-4 sm:px-6 py-3 shadow-sm flex transition-all duration-500">
                <Logo />
                <nav className="hidden md:flex items-center space-x-4">
                    {adminNavItems.map(item => (
                        <NavLink key={item.name} item={item} isActive={view === item.view} onClick={() => handleNavClick(item.view)} />
                    ))}
                </nav>
                <HamburgerIcon isOpen={isSidebarOpen} onClick={() => setSidebarOpen(!isSidebarOpen)} badgeCount={pendingOrdersCount} />
            </header>

            <div className={`fixed top-0 left-0 h-full w-64 bg-white/90 backdrop-blur-md z-50 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:hidden shadow-lg border-r border-gray-200`}>
                <div className="p-6 mb-4 mt-2">
                    <Logo />
                </div>
                <nav className="flex flex-col px-4 space-y-2">
                     {adminNavItems.map(item => (
                        <NavLink key={item.name} item={item} isActive={view === item.view} onClick={() => handleNavClick(item.view)} isSidebar={true} />
                    ))}
                </nav>
            </div>
             {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-transparent backdrop-blur-sm z-40 md:hidden transition-all duration-500" />}

            <main className="w-full pt-20 px-3 sm:px-6 lg:px-8 pb-10">
                {renderContent()}
            </main>
        </>
    );
};

// ... ManageMessages, ManageSettings, Overview, ManageUsers (same as before) ...

const ManageMessages = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [targetUser, setTargetUser] = useState<string>(''); 
    const [messageContent, setMessageContent] = useState('');
    const [messageTitle, setMessageTitle] = useState('');
    const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
    const auth = useAuth();

    useEffect(() => {
        const unsubUsers = subscribeToUsers(setUsers);
        const unsubMsgs = subscribeToMessages(setMessages);
        return () => { unsubUsers(); unsubMsgs(); };
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetUser || !messageContent || !messageTitle) return;

        try {
            await sendMessage(targetUser, messageTitle, messageContent);
            auth.showNotification({ type: 'success', message: 'Pesan terkirim!' });
            setMessageContent('');
            setMessageTitle('');
        } catch (err) {
            auth.showNotification({ type: 'error', message: 'Gagal mengirim pesan.' });
        }
    };
    
    const confirmDeleteMessage = (id: string) => {
        setDeleteMessageId(id);
    };

    const handleDeleteMessage = async () => {
        if(deleteMessageId) {
             await deleteMessage(deleteMessageId);
             auth.showNotification({ type: 'info', message: 'Pesan dihapus.' });
             setDeleteMessageId(null);
        }
    };

    const getRecipientName = (uid: string) => {
        if (uid === 'ALL') return 'Semua User (Broadcast)';
        const u = users.find(user => user.uid === uid);
        return u ? u.username : 'Unknown User';
    };

    return (
        <div className="p-2 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-md border border-gray-100 h-fit">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><PaperAirplaneIcon /> Kirim Pesan</h3>
                <form onSubmit={handleSend} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Tujuan</label>
                        <select 
                            className="w-full bg-white text-gray-900 border border-gray-300 rounded p-2 text-xs" 
                            value={targetUser} 
                            onChange={e => setTargetUser(e.target.value)}
                            required
                        >
                            <option value="">-- Pilih Tujuan --</option>
                            <option value="ALL" className="font-bold text-brand-red">📢 Kirim ke Semua User (Broadcast)</option>
                            {users.map(u => (
                                <option key={u.uid} value={u.uid}>{u.username} ({u.email})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Judul Pesan</label>
                        <input 
                            type="text" 
                            className="w-full bg-white text-gray-900 border border-gray-300 rounded p-2 text-xs" 
                            value={messageTitle} 
                            onChange={e => setMessageTitle(e.target.value)}
                            placeholder="Contoh: Promo Spesial / Kode Voucher"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Isi Pesan</label>
                        <textarea 
                            className="w-full bg-white text-gray-900 border border-gray-300 rounded p-2 text-xs h-32 resize-none" 
                            value={messageContent} 
                            onChange={e => setMessageContent(e.target.value)}
                            placeholder="Tulis pesan anda disini..."
                            required
                        />
                    </div>
                    <button type="submit" className="w-full bg-brand-red text-white py-2 rounded-lg font-bold text-xs hover:bg-red-700 transition-colors shadow-md flex items-center justify-center gap-2">
                        <PaperAirplaneIcon /> Kirim Sekarang
                    </button>
                </form>
            </div>

            <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-md border border-gray-100">
                 <h3 className="text-lg font-bold mb-4">Riwayat Pesan Terkirim</h3>
                 <div className="overflow-y-auto max-h-[600px] space-y-3 pr-2">
                    {messages.length === 0 ? (
                        <p className="text-gray-500 text-center text-xs py-10">Belum ada pesan terkirim.</p>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className="border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow bg-gray-50 relative group">
                                <button onClick={() => confirmDeleteMessage(msg.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon /></button>
                                <div className="flex justify-between items-start mb-1 pr-6">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${msg.userId === 'ALL' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                        To: {getRecipientName(msg.userId)}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleString()}</span>
                                </div>
                                <h4 className="font-bold text-sm text-gray-800">{msg.title}</h4>
                                <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{msg.content}</p>
                            </div>
                        ))
                    )}
                 </div>
            </div>

             {deleteMessageId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full animate-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Hapus Pesan?</h3>
                        <p className="text-gray-600 mb-6 text-xs">Apakah anda yakin ingin menghapus pesan ini?</p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setDeleteMessageId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold text-xs">Tidak</button>
                            <button onClick={handleDeleteMessage} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-xs">Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ManageSettings = () => {
    const [banner, setBanner] = useState<string | null>(null);
    const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({
        companyName: 'KELIKin.com',
        companyAddress: '',
        bankDetails: '',
        footerNote: '',
        ownerName: ''
    });
    const [rawImage, setRawImage] = useState<string | null>(null);
    const [cropType, setCropType] = useState<'banner' | 'logo' | 'signature'>('banner');
    const auth = useAuth();

    useEffect(() => {
        const unsubBanner = subscribeToBanner(setBanner);
        const unsubInv = subscribeToInvoiceSettings((settings) => {
            if (settings) setInvoiceSettings(settings);
        });
        return () => { unsubBanner(); unsubInv(); };
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'logo' | 'signature') => {
        const file = e.target.files?.[0];
        if (file) {
            setCropType(type);
            const reader = new FileReader();
            reader.onloadend = () => setRawImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = async (croppedBase64: string) => {
        try {
            if (cropType === 'banner') await updateBanner(croppedBase64);
            else if (cropType === 'logo') await updateInvoiceSettings({ ...invoiceSettings, logoUrl: croppedBase64 });
            else if (cropType === 'signature') await updateInvoiceSettings({ ...invoiceSettings, signatureUrl: croppedBase64 });
            
            auth.showNotification({ type: 'success', message: 'Gambar diperbarui' });
            setRawImage(null);
        } catch (error) {
            auth.showNotification({ type: 'error', message: 'Upload gagal' });
        }
    };
    
    const saveInvoiceSettings = async () => {
        await updateInvoiceSettings(invoiceSettings);
        auth.showNotification({ type: 'success', message: 'Pengaturan disimpan' });
    };

    return (
        <div className="p-2 max-w-5xl mx-auto">
             <h2 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Pengaturan</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100">
                    <h3 className="text-base sm:text-lg font-semibold mb-4">Banner Beranda</h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer relative h-32 flex items-center justify-center bg-white shadow-inner">
                        <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'banner')} />
                        <div className="flex flex-col items-center">
                             <GlobeAltIcon className="w-8 h-8 text-gray-900 mb-2" />
                             <span className="text-gray-900 font-bold text-xs">Upload Banner</span>
                        </div>
                    </div>
                    {banner && <CachedImage src={banner} alt="Banner" className="w-full mt-4 rounded-lg border h-24 object-cover" />}
                 </div>
                 <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100 md:col-span-2">
                    <h3 className="text-base sm:text-lg font-semibold mb-4 border-b pb-2">Pengaturan Invoice</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 [&>input]:bg-white [&>input]:text-gray-900 [&>input]:border-gray-300 [&>textarea]:bg-white [&>textarea]:text-gray-900 [&>textarea]:border-gray-300">
                        <input type="text" placeholder="Nama Perusahaan" className="w-full border rounded p-2 text-xs" value={invoiceSettings.companyName} onChange={e => setInvoiceSettings({...invoiceSettings, companyName: e.target.value})} />
                        <input type="text" placeholder="Nama Pemilik" className="w-full border rounded p-2 text-xs" value={invoiceSettings.ownerName} onChange={e => setInvoiceSettings({...invoiceSettings, ownerName: e.target.value})} />
                        <textarea placeholder="Alamat" className="w-full border rounded p-2 text-xs h-20" value={invoiceSettings.companyAddress} onChange={e => setInvoiceSettings({...invoiceSettings, companyAddress: e.target.value})} />
                        <textarea placeholder="Bank Details" className="w-full border rounded p-2 text-xs h-20" value={invoiceSettings.bankDetails} onChange={e => setInvoiceSettings({...invoiceSettings, bankDetails: e.target.value})} />
                        <input type="text" placeholder="Footer Note" className="w-full border rounded p-2 text-xs md:col-span-2" value={invoiceSettings.footerNote} onChange={e => setInvoiceSettings({...invoiceSettings, footerNote: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button className="border-2 border-dashed border-gray-300 p-4 rounded text-xs relative bg-white text-gray-900 hover:bg-gray-50">
                            <input type="file" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={(e) => handleImageUpload(e, 'logo')} />
                            {invoiceSettings.logoUrl ? "Ganti Logo" : "Upload Logo"}
                        </button>
                         <button className="border-2 border-dashed border-gray-300 p-4 rounded text-xs relative bg-white text-gray-900 hover:bg-gray-50">
                            <input type="file" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={(e) => handleImageUpload(e, 'signature')} />
                            {invoiceSettings.signatureUrl ? "Ganti TTD" : "Upload TTD"}
                        </button>
                    </div>
                    <button onClick={saveInvoiceSettings} className="bg-brand-red text-white px-6 py-2 rounded-lg font-bold text-xs w-full sm:w-auto hover:bg-red-700 transition-colors">Simpan Pengaturan Invoice</button>
                 </div>
             </div>
             {rawImage && <ImageCropper src={rawImage} onCrop={handleCropComplete} onCancel={() => setRawImage(null)} cropWidth={cropType === 'banner' ? 600 : 200} cropHeight={cropType === 'banner' ? 200 : 100} />}
        </div>
    );
};

const Overview = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        const unsubOrders = subscribeToOrders(setOrders);
        const unsubProducts = subscribeToProducts(setProducts);
        const unsubUsers = subscribeToUsers(setUsers);
        return () => { unsubOrders(); unsubProducts(); unsubUsers(); };
    }, []);

    const totalRevenue = orders.reduce((acc, curr) => 
        curr.status === OrderStatus.PAID || 
        curr.status === OrderStatus.CONFIRMED || 
        curr.status === OrderStatus.SHIPPED || 
        curr.status === OrderStatus.COMPLETED 
        ? acc + curr.totalPrice : acc, 0);
    
    const sortedProducts = [...products].sort((a, b) => b.totalSold - a.totalSold).slice(0, 5);
    const chartData = sortedProducts.map(p => ({ name: p.name.substring(0, 10) + '...', sold: p.totalSold, full: p.name }));
    
    const totalCanceled = orders.filter(o => o.status === OrderStatus.CANCELLED || o.status === OrderStatus.REJECTED).length;
    const totalShipped = orders.filter(o => o.status === OrderStatus.SHIPPED).length;
    const totalPending = orders.filter(o => o.status === OrderStatus.PENDING).length;

    return (
        <div className="p-2 max-w-6xl mx-auto">
            <h2 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Overview</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 text-white">
                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 shadow-lg flex items-center justify-between transform hover:-translate-y-1 transition-transform">
                    <div>
                        <h3 className="text-xs sm:text-sm font-semibold opacity-90">Total Pendapatan</h3>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold mt-1">
                            Rp<AnimatedCounter value={totalRevenue} isCurrency={true} />
                        </p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-full"><OrdersIcon /></div>
                </div>

                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-green-600 to-green-400 shadow-lg flex items-center justify-between transform hover:-translate-y-1 transition-transform">
                     <div>
                        <h3 className="text-xs sm:text-sm font-semibold opacity-90">Total Order</h3>
                        <p className="text-lg sm:text-2xl font-bold mt-1">
                            <AnimatedCounter value={orders.length} />
                        </p>
                    </div>
                     <div className="bg-white/20 p-2 rounded-full"><ProductIcon /></div>
                </div>

                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-400 shadow-lg flex items-center justify-between transform hover:-translate-y-1 transition-transform">
                    <div>
                        <h3 className="text-xs sm:text-sm font-semibold opacity-90">Total Customer</h3>
                         <p className="text-lg sm:text-2xl font-bold mt-1">
                            <AnimatedCounter value={users.length} />
                        </p>
                    </div>
                     <div className="bg-white/20 p-2 rounded-full"><UsersIcon /></div>
                </div>

                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-red-600 to-red-400 shadow-lg flex items-center justify-between transform hover:-translate-y-1 transition-transform">
                    <div>
                        <h3 className="text-xs sm:text-sm font-semibold opacity-90">Total Dibatalkan</h3>
                        <p className="text-lg sm:text-2xl font-bold mt-1">
                            <AnimatedCounter value={totalCanceled} />
                        </p>
                    </div>
                     <div className="bg-white/20 p-2 rounded-full"><XCircleIcon /></div>
                </div>

                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-400 shadow-lg flex items-center justify-between transform hover:-translate-y-1 transition-transform">
                    <div>
                        <h3 className="text-xs sm:text-sm font-semibold opacity-90">Sedang Diantar</h3>
                        <p className="text-lg sm:text-2xl font-bold mt-1">
                            <AnimatedCounter value={totalShipped} />
                        </p>
                    </div>
                     <div className="bg-white/20 p-2 rounded-full"><CheckIcon /></div>
                </div>

                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-300 shadow-lg flex items-center justify-between transform hover:-translate-y-1 transition-transform">
                    <div>
                        <h3 className="text-xs sm:text-sm font-semibold opacity-90">Menunggu Konfirmasi</h3>
                        <p className="text-lg sm:text-2xl font-bold mt-1">
                            <AnimatedCounter value={totalPending} />
                        </p>
                    </div>
                     <div className="bg-white/20 p-2 rounded-full"><ClockIcon /></div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100">
                    <h3 className="text-base sm:text-lg font-semibold mb-6 text-gray-700 border-b pb-2">Top Selling Products</h3>
                    <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                        <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '0.6rem' }} interval={0} />
                        <YAxis stroke="#9ca3af" style={{ fontSize: '0.6rem' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} cursor={{fill: '#f3f4f6'}} />
                        <Legend wrapperStyle={{fontSize: '0.7rem'}}/>
                        <Bar dataKey="sold" fill="#FF8C00" radius={[4, 4, 0, 0]} name="Terjual" />
                        </BarChart>
                    </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ManageUsers = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const auth = useAuth();

    useEffect(() => {
        const unsub = subscribeToUsers(setUsers);
        return () => unsub();
    }, []);

    const handleDelete = async (uid: string) => {
        await deleteUser(uid);
        setDeleteConfirm(null);
        auth.showNotification({ type: 'success', message: 'User berhasil dihapus' });
    }

    const handleToggleStatus = async (user: User) => {
        await toggleUserStatus(user.uid, user.isActive);
        auth.showNotification({ type: 'success', message: `User ${!user.isActive ? 'Activated' : 'Deactivated'}` });
    }

    return (
        <div className="p-2 max-w-6xl mx-auto">
            <h2 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Manage Users</h2>
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-3 font-semibold text-[10px] sm:text-xs text-gray-600">Username</th>
                                <th className="p-3 font-semibold text-[10px] sm:text-xs text-gray-600">Email</th>
                                <th className="p-3 font-semibold text-[10px] sm:text-xs text-gray-600">Last Seen</th>
                                <th className="p-3 font-semibold text-[10px] sm:text-xs text-gray-600">Status</th>
                                <th className="p-3 font-semibold text-[10px] sm:text-xs text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(user => (
                                <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-3 text-gray-800 font-medium text-[10px] sm:text-xs">{user.username}</td>
                                    <td className="p-3 text-gray-600 text-[10px] sm:text-xs">{user.email}</td>
                                    <td className="p-3 text-gray-600 text-[10px] sm:text-xs">{new Date(user.lastSeen).toLocaleString('id-ID')}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="p-3 flex items-center space-x-2">
                                        <button onClick={() => handleToggleStatus(user)} className={`p-1.5 rounded-full hover:bg-gray-200 ${user.isActive ? 'text-red-500' : 'text-green-500'}`}>
                                            {user.isActive ? <XCircleIcon /> : <CheckIcon />}
                                        </button>
                                        <button onClick={() => setDeleteConfirm(user.uid)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-full">
                                            <TrashIcon />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full animate-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Konfirmasi Hapus</h3>
                        <p className="text-gray-600 mb-6 text-xs">Apakah anda yakin ingin menghapus user ini dan semua datanya?</p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold text-xs">Tidak</button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-xs">Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ManageProducts = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Product>>({});
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [rawImage, setRawImage] = useState<string | null>(null); 
    const auth = useAuth();

    useEffect(() => {
        const unsub = subscribeToProducts(setProducts);
        return () => unsub();
    }, []);

    const handleEdit = (product: Product) => {
        setForm({ ...product, extraInfo: product.extraInfo || [], category: product.category || 'physical' });
        setEditId(product.id);
        setIsEditing(true);
    };

    const handleAdd = () => {
        setForm({
            name: '', imageUrl: '', originalPrice: 0, discountedPrice: 0, discountPercent: 0, 
            saleTag: '', stock: 0, isSaleClosed: false, isComingSoon: false, totalSold: 0, extraInfo: [], buyLink: '', category: 'physical',
            hasCustomMessage: false, customMessage: '', enableWholesale: false, wholesaleMinQty: 10, wholesalePercent: 2
        });
        setEditId(null);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        await deleteProduct(id);
        setDeleteConfirmId(null);
        auth.showNotification({ type: 'success', message: 'Produk dihapus' });
    };
    
    const handleToggleClose = async (product: Product) => {
        await updateProduct(product.id, { isSaleClosed: !product.isSaleClosed });
    };
    
    const handleToggleComingSoon = async (product: Product) => {
        await updateProduct(product.id, { isComingSoon: !product.isComingSoon });
    };

    const handleExtraInfoChange = (index: number, field: 'label' | 'value' | 'iconType', val: string) => {
        const newInfo = [...(form.extraInfo || [])];
        newInfo[index] = { ...newInfo[index], [field]: val };
        setForm({ ...form, extraInfo: newInfo });
    };

    const addExtraInfo = () => setForm({ ...form, extraInfo: [...(form.extraInfo || []), { label: '', value: '', iconType: '' }] });
    const removeExtraInfo = (index: number) => {
        const newInfo = [...(form.extraInfo || [])];
        newInfo.splice(index, 1);
        setForm({ ...form, extraInfo: newInfo });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setRawImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedBase64: string) => {
        setForm({ ...form, imageUrl: croppedBase64 });
        setRawImage(null); 
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const original = Number(form.originalPrice) || 0;
        const discounted = Number(form.discountedPrice) || 0;
        let percent = 0;
        if (original > 0 && discounted < original) {
            percent = Math.round(((original - discounted) / original) * 100);
        }
        
        const payload = { 
            ...form, 
            originalPrice: original, 
            discountedPrice: discounted, 
            discountPercent: percent, 
            stock: Number(form.stock), 
            // maxStock is removed
            extraInfo: form.extraInfo || [],
            category: form.category || 'physical',
            hasCustomMessage: form.hasCustomMessage || false,
            customMessage: form.customMessage || '',
            enableWholesale: form.enableWholesale || false,
            wholesaleMinQty: Number(form.wholesaleMinQty) || 0,
            wholesalePercent: Number(form.wholesalePercent) || 0
        };

        if (editId) {
            await updateProduct(editId, payload);
            auth.showNotification({ type: 'success', message: 'Produk diupdate' });
        } else {
            await addProduct(payload as Product);
            auth.showNotification({ type: 'success', message: 'Produk ditambahkan' });
        }
        setIsEditing(false);
    };

    return (
        <div className="p-2 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Manage Products</h2>
                <button onClick={handleAdd} className="bg-brand-red text-white px-4 py-2 rounded-full font-bold hover:bg-red-700 transition-transform hover:scale-105 shadow-md text-xs sm:text-sm">
                    + Tambah Produk
                </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {products.map(p => {
                     // Logic for Bar: Represents % of Total Sold. Grows right as sold increases.
                     const totalUnits = p.totalSold + p.stock;
                     const barWidth = totalUnits > 0 ? (p.totalSold / totalUnits) * 100 : 0;

                     return (
                        <div key={p.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 flex flex-col relative group hover:shadow-xl transition-shadow">
                            <div className="h-32 sm:h-40 overflow-hidden relative">
                                <CachedImage src={p.imageUrl} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(p)} className="bg-white/90 p-1.5 rounded-full text-gray-700 hover:text-brand-orange shadow transform hover:scale-110 transition-transform"><EditIcon /></button>
                                    <button onClick={() => setDeleteConfirmId(p.id)} className="bg-white/90 p-1.5 rounded-full text-gray-700 hover:text-red-600 shadow transform hover:scale-110 transition-transform"><TrashIcon /></button>
                                </div>
                                {(p.isSaleClosed || p.stock === 0) && (
                                    <div className="absolute inset-0 bg-blue-200/50 flex items-center justify-center z-10">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                                            <span className="text-brand-red font-bold text-[9px]">HABIS!</span>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute top-2 left-2 z-20">
                                    <span className="bg-black/70 text-white text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        {p.category === 'digital' ? 'Online' : 'Fisik'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-2 sm:p-3 flex-grow">
                                <h3 className="font-bold text-xs sm:text-sm mb-1 truncate">{p.name}</h3>
                                <p className="text-brand-red font-bold text-xs sm:text-sm">Rp{p.discountedPrice.toLocaleString()}</p>
                                <div className="mt-2 space-y-0.5 text-[9px] sm:text-xs text-gray-600">
                                    <div className="flex justify-between"><span>Stock:</span> <span>{p.stock}</span></div>
                                    <div className="flex justify-between"><span>Sold:</span> <span>{p.totalSold}</span></div>
                                </div>
                                {/* Visual Bar */}
                                <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden border border-gray-200">
                                    <div 
                                        className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full transition-all duration-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" 
                                        style={{ width: `${barWidth}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div className="flex border-t border-gray-100">
                                <button 
                                    onClick={() => handleToggleClose(p)} 
                                    className={`flex-1 py-2 font-bold text-[9px] flex items-center justify-center gap-1 transition-colors ${p.isSaleClosed ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                                >
                                    {p.isSaleClosed ? <><LockIcon /> BUKA</> : <><LockIcon /> TUTUP</>}
                                </button>
                                <button 
                                    onClick={() => handleToggleComingSoon(p)} 
                                    className={`flex-1 py-2 font-bold text-[9px] flex items-center justify-center gap-1 transition-colors ${p.isComingSoon ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                                >
                                    <ClockIcon /> {p.isComingSoon ? 'HADIR' : 'SEGERA'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isEditing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
                         <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="text-lg sm:text-xl font-bold">{editId ? 'Edit Produk' : 'Tambah Produk'}</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-red-500"><XMarkIcon /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Nama</label><input required type="text" className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 text-xs" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Gambar</label>
                                    <input type="file" accept="image/*" className="w-full text-xs" onChange={handleImageUpload} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
                                    <select className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 text-xs" value={form.category || 'physical'} onChange={(e) => setForm({...form, category: e.target.value as ProductCategory})}>
                                        <option value="physical">Fisik</option>
                                        <option value="digital">Online</option>
                                    </select>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Harga Asli</label><input required type="number" className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 text-xs" value={form.originalPrice} onChange={e => setForm({...form, originalPrice: Number(e.target.value)})} /></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Harga Diskon</label><input required type="number" className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 text-xs" value={form.discountedPrice} onChange={e => setForm({...form, discountedPrice: Number(e.target.value)})} /></div>
                                
                                {/* MAX STOCK REMOVED */}
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Stok</label><input required type="number" className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 text-xs" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} /></div>
                                
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Tag</label><input type="text" className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 text-xs" value={form.saleTag} onChange={e => setForm({...form, saleTag: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Link Beli</label><input type="url" className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 text-xs" value={form.buyLink || ''} onChange={e => setForm({...form, buyLink: e.target.value})} /></div>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="customMsg" checked={form.hasCustomMessage} onChange={e => setForm({...form, hasCustomMessage: e.target.checked})} className="rounded text-brand-red focus:ring-brand-red" />
                                    <label htmlFor="customMsg" className="text-xs font-bold text-gray-800">Kirim Pesan/Voucher Otomatis Saat Dibeli</label>
                                </div>
                                {form.hasCustomMessage && (
                                    <textarea 
                                        className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 text-xs h-20" 
                                        placeholder="Tulis pesan atau kode voucher disini. User akan menerima pesan ini di kotak masuk setelah pembelian."
                                        value={form.customMessage || ''}
                                        onChange={e => setForm({...form, customMessage: e.target.value})}
                                    />
                                )}
                            </div>

                             <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="wholesale" checked={form.enableWholesale} onChange={e => setForm({...form, enableWholesale: e.target.checked})} className="rounded text-brand-red focus:ring-brand-red" />
                                    <label htmlFor="wholesale" className="text-xs font-bold text-gray-800">Aktifkan Diskon Grosir</label>
                                </div>
                                {form.enableWholesale && (
                                    <div className="grid grid-cols-2 gap-4">
                                         <div><label className="block text-xs font-bold text-gray-700 mb-1">Min. Pembelian (Qty)</label><input type="number" className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 text-xs" value={form.wholesaleMinQty} onChange={e => setForm({...form, wholesaleMinQty: Number(e.target.value)})} /></div>
                                         <div><label className="block text-xs font-bold text-gray-700 mb-1">Diskon (%)</label><input type="number" className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 text-xs" value={form.wholesalePercent} onChange={e => setForm({...form, wholesalePercent: Number(e.target.value)})} /></div>
                                    </div>
                                )}
                            </div>

                             <div className="border-t pt-4 mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-gray-700">Info Tambahan</label>
                                    <button type="button" onClick={addExtraInfo} className="text-xs text-brand-red font-bold">+ Tambah</button>
                                </div>
                                {form.extraInfo?.map((info, idx) => (
                                    <div key={idx} className="grid grid-cols-[80px_1fr_1fr_24px] gap-2 items-center">
                                        <select className="border border-gray-300 rounded p-1.5 text-xs bg-white text-gray-900" value={info.iconType || ''} onChange={(e) => handleExtraInfoChange(idx, 'iconType', e.target.value)}>
                                            <option value="">Icon</option>
                                            <option value="waktu">Waktu</option>
                                            <option value="lokasi">Lokasi</option>
                                            <option value="tanggal">Tanggal</option>
                                            <option value="web">Web</option>
                                            <option value="email">Email</option>
                                            <option value="wa">WhatsApp</option>
                                        </select>
                                        <input type="text" placeholder="Label" className="border border-gray-300 rounded p-1.5 text-xs bg-white text-gray-900" value={info.label} onChange={(e) => handleExtraInfoChange(idx, 'label', e.target.value)} />
                                        <input type="text" placeholder="Value" className="border border-gray-300 rounded p-1.5 text-xs bg-white text-gray-900" value={info.value} onChange={(e) => handleExtraInfoChange(idx, 'value', e.target.value)} />
                                        <button type="button" onClick={() => removeExtraInfo(idx)} className="text-red-500"><TrashIcon /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t mt-4">
                                <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-lg border border-gray-300 font-bold text-xs">Batal</button>
                                <button type="submit" className="px-6 py-2 rounded-lg bg-brand-red text-white font-bold text-xs">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
             {rawImage && <ImageCropper src={rawImage} onCrop={handleCropComplete} onCancel={() => setRawImage(null)} />}
             {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full animate-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Konfirmasi Hapus</h3>
                        <p className="text-gray-600 mb-6 text-xs">Hapus produk ini permanen?</p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-gray-600 rounded-lg font-bold text-xs">Tidak</button>
                            <button onClick={() => handleDelete(deleteConfirmId)} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs">Ya</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ManageOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [viewingProof, setViewingProof] = useState<Order | null>(null);
    const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<string | null>(null);
    const [deleteConfirmUserOrders, setDeleteConfirmUserOrders] = useState<string | null>(null);
    const auth = useAuth();

    useEffect(() => {
        const unsubOrders = subscribeToOrders(setOrders);
        const unsubUsers = subscribeToUsers(setUsers);
        return () => { unsubOrders(); unsubUsers(); };
    }, []);

    const handleStatusChange = async (order: Order, status: OrderStatus) => {
        try {
            await updateOrderStatus(order.id, status);
            auth.showNotification({ type: 'success', message: `Order ${status}` });
        } catch (e) {
            auth.showNotification({ type: 'error', message: 'Update failed' });
        }
    };
    
    const handleHardDeleteOrder = async (orderId: string) => {
        await deleteOrder(orderId);
        setDeleteConfirmOrder(null);
        auth.showNotification({ type: 'success', message: 'Order dihapus permanen.' });
    };

    const handleBulkDelete = async (userId: string) => {
        await deleteAllOrdersByUser(userId);
        setDeleteConfirmUserOrders(null);
        auth.showNotification({ type: 'success', message: 'Semua riwayat pesanan user ini dihapus.' });
    };

    const userOrders = selectedUser ? orders.filter(o => o.userId === selectedUser.uid) : [];

    return (
        <div className="p-2 max-w-6xl mx-auto">
            <h2 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Manage Orders by User</h2>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                 {users.map(user => {
                     const userOrderCount = orders.filter(o => o.userId === user.uid).length;
                     const pendingCount = orders.filter(o => o.userId === user.uid && o.status === OrderStatus.PENDING).length;
                     return (
                        <div key={user.uid} onClick={() => setSelectedUser(user)} className="bg-white p-4 rounded-xl shadow-md border border-gray-100 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all relative group">
                             <button 
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmUserOrders(user.uid); }} 
                                className="absolute top-2 right-2 bg-white hover:bg-red-100 text-gray-400 hover:text-red-600 p-2 rounded-full transition-colors z-10 shadow-sm border border-gray-100"
                                title="Hapus Semua Pesanan User Ini"
                            >
                                <TrashIcon />
                            </button>

                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-brand-red group-hover:text-white transition-colors"><UsersIcon /></div>
                                <div className="overflow-hidden pr-6"><h3 className="font-bold text-sm text-gray-800 truncate">{user.username}</h3><p className="text-xs text-gray-500 truncate">{user.email}</p></div>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                                <span className="text-xs text-gray-500">Total: {userOrderCount}</span>
                                {pendingCount > 0 && <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">{pendingCount} Pending</span>}
                            </div>
                        </div>
                     );
                 })}
             </div>

            {selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300 p-4" onClick={() => setSelectedUser(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                            <div><h3 className="text-lg font-bold text-gray-800">Pesanan: {selectedUser.username}</h3><p className="text-xs text-gray-500">{selectedUser.email}</p></div>
                            <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-red-500"><XMarkIcon /></button>
                        </div>
                        <div className="p-4 overflow-x-auto">
                            {userOrders.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">User ini belum memiliki pesanan.</div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="p-3 font-semibold text-[10px] sm:text-xs text-gray-600">Barang</th>
                                            <th className="p-3 font-semibold text-[10px] sm:text-xs text-gray-600">Qty</th>
                                            <th className="p-3 font-semibold text-[10px] sm:text-xs text-gray-600">Total</th>
                                            <th className="p-3 font-semibold text-[10px] sm:text-xs text-gray-600">Bukti</th>
                                            <th className="p-3 font-semibold text-[10px] sm:text-xs text-gray-600">Status</th>
                                            <th className="p-3 font-semibold text-[10px] sm:text-xs text-gray-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {userOrders.map(order => (
                                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-3 text-[9px] sm:text-xs">{order.items[0].product.name} <span className="text-gray-400 ml-1">({order.items[0].product.category === 'digital' ? 'Online' : 'Fisik'})</span></td>
                                                <td className="p-3 text-[9px] sm:text-xs">{order.items[0].quantity}</td>
                                                <td className="p-3 text-brand-red font-bold text-[10px] sm:text-xs">Rp{order.totalPrice.toLocaleString('id-ID')}</td>
                                                <td className="p-3">{order.paymentProof ? <button onClick={() => setViewingProof(order)} className="text-blue-600 font-semibold text-[9px] bg-blue-50 px-2 py-1 rounded-full">Cek Bukti</button> : <span className="text-gray-400 text-[9px] italic">Blm Upload</span>}</td>
                                                <td className="p-3"><span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${order.status === OrderStatus.PAID ? 'bg-green-100 text-green-800' : order.status === OrderStatus.COMPLETED ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'}`}>{order.status}</span></td>
                                                <td className="p-3 flex gap-2 items-center">
                                                    {order.status === OrderStatus.PENDING && <><button onClick={() => handleStatusChange(order, OrderStatus.PAID)} className="bg-green-500 text-white p-1 rounded shadow"><CheckIcon /></button><button onClick={() => handleStatusChange(order, OrderStatus.REJECTED)} className="bg-red-500 text-white p-1 rounded shadow"><XMarkIcon /></button></>}
                                                    {order.status === OrderStatus.PAID && <button onClick={() => handleStatusChange(order, OrderStatus.SHIPPED)} className="bg-blue-600 text-white px-2 py-1 rounded text-[9px] font-bold">Antar</button>}
                                                    {order.status === OrderStatus.SHIPPED && <button onClick={() => handleStatusChange(order, OrderStatus.COMPLETED)} className="bg-purple-600 text-white px-2 py-1 rounded text-[9px] font-bold">Tiba</button>}
                                                    <button onClick={() => setDeleteConfirmOrder(order.id)} className="text-gray-400 hover:text-red-600 p-1"><TrashIcon /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {viewingProof && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-300" onClick={() => setViewingProof(null)}>
                    <div className="bg-white p-4 sm:p-6 rounded-2xl max-w-xl w-full m-4 shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                         <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="text-lg font-bold">Bukti Pembayaran</h3><button onClick={() => setViewingProof(null)}><XMarkIcon /></button></div>
                         <div className="bg-gray-100 rounded-lg p-2 mb-4 flex justify-center overflow-auto flex-grow"><img src={viewingProof.paymentProof} className="max-w-full object-contain" /></div>
                         <div className="flex justify-end space-x-3 mt-auto pt-2">
                             <button onClick={() => { handleStatusChange(viewingProof, OrderStatus.REJECTED); setViewingProof(null); }} className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-lg text-xs">Tolak</button>
                             <button onClick={() => { handleStatusChange(viewingProof, OrderStatus.PAID); setViewingProof(null); }} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg text-xs">Konfirmasi Lunas</button>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirmOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full animate-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Hapus Permanen?</h3>
                        <p className="text-gray-600 mb-6 text-xs">Data pesanan akan dihapus selamanya dari admin dan user.</p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setDeleteConfirmOrder(null)} className="px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-600 text-xs">Tidak</button>
                            <button onClick={() => handleHardDeleteOrder(deleteConfirmOrder)} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs">Ya</button>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirmUserOrders && (
                 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full animate-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Hapus Semua Pesanan?</h3>
                        <p className="text-gray-600 mb-6 text-xs">
                            Tindakan ini akan menghapus <strong>SEMUA</strong> riwayat pesanan milik user ini secara permanen.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setDeleteConfirmUserOrders(null)} className="px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-600 text-xs">Tidak</button>
                            <button onClick={() => handleBulkDelete(deleteConfirmUserOrders)} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs">Ya, Hapus Semua</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPanel;