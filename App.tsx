
import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { User, PanelType, AppNotification } from './types';
import GuestPanel from './panels/Guest';
import UserPanel from './panels/User';
import AdminPanel from './panels/Admin';
import { FacebookIcon, InstagramIcon, WhatsappIcon, AdminIcon } from './components/Icons';
import { checkAdminPassword } from './services/firebase';

// Mock Auth Context
interface AuthContextType {
  currentUser: User | null;
  panel: PanelType;
  login: (user: User) => void;
  logout: () => void;
  adminLogin: () => void;
  adminLogout: () => void;
  showNotification: (notification: AppNotification) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

const Footer: React.FC = () => (
    <footer className="bg-white/80 backdrop-blur-md text-gray-600 py-3 border-t border-gray-200 mt-auto">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center">
            <div className="flex space-x-4 mb-2">
                {/* Icons standardized */}
                <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-blue-600 transition-all duration-300 transform hover:scale-125 hover:-translate-y-1">
                    <div className="w-4 h-4 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"><FacebookIcon /></div>
                </a>
                <a href="#" aria-label="Instagram" className="text-gray-400 hover:text-pink-600 transition-all duration-300 transform hover:scale-125 hover:-translate-y-1">
                     <div className="w-4 h-4 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"><InstagramIcon /></div>
                </a>
                <a href="#" aria-label="WhatsApp" className="text-gray-400 hover:text-green-600 transition-all duration-300 transform hover:scale-125 hover:-translate-y-1">
                     <div className="w-4 h-4 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"><WhatsappIcon /></div>
                </a>
            </div>
            <p className="text-[8px] text-gray-400 tracking-wider font-medium uppercase">© 2025 KELIKin.com reserved | versi.1.2.0</p>
        </div>
    </footer>
);

const SwipeableNotification: React.FC<{ notification: AppNotification, onClose: () => void }> = ({ notification, onClose }) => {
    const [offsetX, setOffsetX] = useState(0);
    const [opacity, setOpacity] = useState(1);
    const startX = useRef(0);
    const isDragging = useRef(false);

    const handleStart = (clientX: number) => {
        isDragging.current = true;
        startX.current = clientX;
    };

    const handleMove = (clientX: number) => {
        if (!isDragging.current) return;
        const diff = clientX - startX.current;
        if (diff > 0) { // Only swipe right to dismiss
            setOffsetX(diff);
            setOpacity(1 - diff / 200);
        }
    };

    const handleEnd = () => {
        isDragging.current = false;
        if (offsetX > 100) {
            onClose(); // Dismiss
        } else {
            setOffsetX(0); // Snap back
            setOpacity(1);
        }
    };

    const bgClass = notification.type === 'success' ? 'bg-green-600/90' : notification.type === 'error' ? 'bg-red-600/90' : 'bg-blue-600/90';

    return (
        <div 
            className="fixed top-6 right-6 z-[100] cursor-grab active:cursor-grabbing touch-none"
            style={{ transform: `translateX(${offsetX}px)`, opacity: opacity, transition: isDragging.current ? 'none' : 'all 0.3s ease-out' }}
            onTouchStart={(e) => handleStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
            onTouchEnd={handleEnd}
            onMouseDown={(e) => handleStart(e.clientX)}
            onMouseMove={(e) => handleMove(e.clientX)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
        >
            <div className={`px-4 py-2 rounded-lg shadow-2xl text-white text-[10px] font-bold tracking-wide backdrop-blur ${bgClass} flex items-center gap-2`}>
                {notification.message}
                <span className="text-[8px] opacity-60 ml-2 border-l border-white/30 pl-2">Geser &rarr;</span>
            </div>
        </div>
    );
};

const AdminLogin: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const [pass, setPass] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isValid = await checkAdminPassword(pass);
        if (isValid) {
            onSuccess();
        } else {
            setError('Password salah!');
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-100 p-4">
             <div className="bg-white p-6 rounded-xl shadow-2xl max-w-xs w-full text-center border border-gray-200">
                <div className="w-12 h-12 bg-gray-800 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <AdminIcon />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Admin Access</h3>
                <p className="text-[10px] text-gray-500 mb-4">Halaman Login Tersembunyi</p>
                
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input 
                        type="password" 
                        className="w-full bg-gray-50 text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 text-center text-xs tracking-widest focus:ring-2 focus:ring-gray-400 focus:outline-none" 
                        placeholder="Kode Akses"
                        value={pass}
                        onChange={e => setPass(e.target.value)}
                        autoFocus
                    />
                    {error && <p className="text-red-500 text-[10px] font-bold">{error}</p>}
                    <button type="submit" className="w-full bg-gray-800 text-white font-bold py-2 rounded-lg hover:bg-black transition-colors shadow-md text-xs">
                        Masuk
                    </button>
                    <a href="/" className="block text-[10px] text-gray-400 hover:text-gray-600 mt-2">Kembali ke Beranda</a>
                </form>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [panel, setPanel] = useState<PanelType>(PanelType.GUEST);
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  useEffect(() => {
    const disableContextMenu = (e: MouseEvent) => e.preventDefault();
    const disableInspect = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', disableContextMenu);
    document.addEventListener('keydown', disableInspect);

    if (window.location.pathname === '/tokoaingadminlog') {
        setShowAdminLogin(true);
    }

    return () => {
      document.removeEventListener('contextmenu', disableContextMenu);
      document.removeEventListener('keydown', disableInspect);
    };
  }, []);
  
  const showNotification = useCallback((notif: AppNotification) => {
      setNotification(notif);
      setTimeout(() => setNotification(null), 4000);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setPanel(PanelType.USER);
    showNotification({ type: 'success', message: `Welcome back, ${user.username}!` });
  };
  
  const handleAdminLogin = () => {
      setPanel(PanelType.ADMIN);
      setShowAdminLogin(false); 
      showNotification({ type: 'success', message: 'Admin access granted.' });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPanel(PanelType.GUEST);
    showNotification({ type: 'info', message: 'You have been logged out.' });
  };
  
  const handleAdminLogout = () => {
      setPanel(PanelType.GUEST);
      showNotification({ type: 'info', message: 'Admin logged out.' });
      window.history.pushState({}, '', '/');
      setShowAdminLogin(false);
  };
  
  const authContextValue = {
      currentUser,
      panel,
      login: handleLogin,
      logout: handleLogout,
      adminLogin: handleAdminLogin,
      adminLogout: handleAdminLogout,
      showNotification
  };

  const renderPanel = () => {
    switch (panel) {
      case PanelType.ADMIN:
        return <AdminPanel />;
      case PanelType.USER:
        return <UserPanel />;
      case PanelType.GUEST:
      default:
        return <GuestPanel />;
    }
  };

  return (
    <AuthContext.Provider value={authContextValue}>
        {/* Global Text Size Adjusted: text-[10px] for mobile, text-sm for md/desktop */}
        <div className="flex flex-col min-h-screen w-full bg-gray-50 text-[10px] md:text-sm">
          <div className="flex-grow w-full flex flex-col relative">
            {showAdminLogin && panel !== PanelType.ADMIN ? (
                <AdminLogin onSuccess={handleAdminLogin} />
            ) : (
                renderPanel()
            )}
          </div>
          {!showAdminLogin && <Footer />}
        </div>
        {notification && (
            <SwipeableNotification notification={notification} onClose={() => setNotification(null)} />
        )}
    </AuthContext.Provider>
  );
};

export default App;
