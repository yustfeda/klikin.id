
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, update, push, child, onValue, remove, DataSnapshot } from "firebase/database";
import { Product, Order, User, OrderStatus, InvoiceSettings, Message } from "../types";

const firebaseConfig = {
    apiKey: "AIzaSyBiZbwWqLmQmPq7pRF3ZDmloAEV8OgPuH0",
    authDomain: "artstatis.firebaseapp.com",
    databaseURL: "https://artstatis-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "artstatis",
    storageBucket: "artstatis.firebasestorage.app",
    messagingSenderId: "351502028950",
    appId: "1:351502028950:web:9737cdd91d442e8042b2b7"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// --- Initial Data Seeding (Run once if DB is empty) ---
const seedData = async () => {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, "products"));
    if (!snapshot.exists()) {
        console.log("Seeding initial data...");
        const initialProducts: Product[] = [
            { id: 'p1', name: 'Abstract Canvas Art', imageUrl: 'https://picsum.photos/400/300?random=1', originalPrice: 25000, discountedPrice: 15000, discountPercent: 40, saleTag: 'pre sale 3', stock: 5, isSaleClosed: false, isComingSoon: false, totalSold: 5, extraInfo: [{label: 'Lokasi', value: 'Jakarta', iconType: 'location'}, {label: 'Waktu', value: '2025', iconType: 'time'}] },
            { id: 'p2', name: 'Modern Sculpture', imageUrl: 'https://picsum.photos/400/300?random=2', originalPrice: 50000, discountedPrice: 45000, discountPercent: 10, saleTag: 'sale', stock: 2, isSaleClosed: false, isComingSoon: false, totalSold: 3, extraInfo: [] },
            { id: 'p3', name: 'Vintage Poster Print', imageUrl: 'https://picsum.photos/400/300?random=3', originalPrice: 10000, discountedPrice: 10000, discountPercent: 0, saleTag: '', stock: 0, isSaleClosed: false, isComingSoon: false, totalSold: 20, extraInfo: [] },
            { id: 'p4', name: 'Handcrafted Pottery', imageUrl: 'https://picsum.photos/400/300?random=4', originalPrice: 30000, discountedPrice: 30000, discountPercent: 0, saleTag: '', stock: 8, isSaleClosed: true, isComingSoon: false, totalSold: 123, extraInfo: [] },
        ];
        
        const updates: any = {};
        initialProducts.forEach(p => {
            updates['/products/' + p.id] = p;
        });
        await update(ref(db), updates);
    }
};

seedData();

// --- ADMIN AUTH SIMULATION ---
export const checkAdminPassword = async (password: string): Promise<boolean> => {
    // Simulating backend check. In a real app, this would verify against a secure server function.
    return password === "Masuk22";
};

// --- Product Services ---

export const subscribeToProducts = (callback: (products: Product[]) => void) => {
    const productsRef = ref(db, 'products');
    return onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        const productsList: Product[] = data ? Object.values(data) : [];
        callback(productsList);
    });
};

export const addProduct = async (product: Omit<Product, 'id'>) => {
    const newKey = push(child(ref(db), 'products')).key;
    const newProduct = { ...product, id: newKey! };
    const updates: any = {};
    updates['/products/' + newKey] = newProduct;
    await update(ref(db), updates);
};

export const updateProduct = async (productId: string, data: Partial<Product>) => {
    const updates: any = {};
    Object.keys(data).forEach(key => {
        updates[`/products/${productId}/${key}`] = data[key as keyof Product];
    });
    await update(ref(db), updates);
};

export const deleteProduct = async (productId: string) => {
    await remove(ref(db, `products/${productId}`));
};

// --- Message Services ---

export const sendMessage = async (userId: string, title: string, content: string, fromAdmin: boolean = true) => {
    const newKey = push(child(ref(db), 'messages')).key;
    const message: Message = {
        id: newKey!,
        userId,
        title,
        content,
        timestamp: Date.now(),
        isRead: false,
        fromAdmin
    };
    await update(ref(db), { [`/messages/${newKey}`]: message });
};

export const subscribeToMessages = (callback: (messages: Message[]) => void) => {
    const msgRef = ref(db, 'messages');
    return onValue(msgRef, (snapshot) => {
        const data = snapshot.val();
        const list: Message[] = data ? Object.values(data) : [];
        // Sort by timestamp desc
        list.sort((a, b) => b.timestamp - a.timestamp);
        callback(list);
    });
};

export const markMessageAsRead = async (messageId: string) => {
    await update(ref(db, `messages/${messageId}`), { isRead: true });
};

export const deleteMessage = async (messageId: string) => {
    await remove(ref(db, `messages/${messageId}`));
};

// --- Order Services ---

export const createOrder = async (
    userId: string, 
    username: string, 
    product: Product, 
    quantity: number,
    shippingDetails?: { name: string; address: string; phone: string }
) => {
    const newOrderKey = push(child(ref(db), 'orders')).key;
    
    // Calculate Price based on Bulk Discount
    let finalUnitPrice = product.discountedPrice;
    if (product.enableWholesale && product.wholesaleMinQty && product.wholesalePercent) {
        if (quantity >= product.wholesaleMinQty) {
            finalUnitPrice = finalUnitPrice * (1 - product.wholesalePercent / 100);
        }
    }
    const totalPrice = finalUnitPrice * quantity;
    
    const order: Order = {
        id: newOrderKey!,
        userId,
        username,
        items: [{ product, quantity }], 
        totalPrice,
        status: OrderStatus.PENDING,
        timestamp: Date.now(),
        shippingDetails,
        hiddenForUser: false 
    };

    const updates: any = {};
    updates['/orders/' + newOrderKey] = order;
    
    await update(ref(db), updates);

    // NOTE: Automatic Voucher Message logic is NOT here. It's in updateOrderStatus (Status=Lunas).
    return newOrderKey;
};

export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
    const ordersRef = ref(db, 'orders');
    return onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        const ordersList: Order[] = data ? Object.values(data) : [];
        
        // --- Auto Cancel Logic ---
        const now = Date.now();
        const TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6 Hours
        let needsUpdate = false;
        const updates: any = {};

        ordersList.forEach(order => {
            // If pending and older than 6h, set to Cancelled
            if (order.status === OrderStatus.PENDING && (now - order.timestamp > TIMEOUT_MS)) {
                updates[`/orders/${order.id}/status`] = OrderStatus.CANCELLED;
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            // Perform the update silently in background
            update(ref(db), updates).catch(err => console.error("Auto-cancel error:", err));
        }

        // Sort by timestamp desc
        ordersList.sort((a, b) => b.timestamp - a.timestamp);
        callback(ordersList);
    });
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const updates: any = {};
    let finalStatus = status;
    const dbRef = ref(db);
    
    // Logic: Deduct stock when status becomes PAID or COMPLETED (e.g., manual complete)
    // AND Send Voucher Message if Product has Custom Message
    if (status === OrderStatus.PAID || status === OrderStatus.COMPLETED) {
        const orderSnapshot = await get(child(dbRef, 'orders/' + orderId));
        
        if (orderSnapshot.exists()) {
            const order = orderSnapshot.val() as Order;
            
            // Prevent double deduction if status was already PAID or later
            if (order.status === OrderStatus.PENDING || order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REJECTED) {
                const item = order.items[0]; // Assuming single item order for now
                
                // 1. Deduct Stock
                const productRef = child(dbRef, 'products/' + item.product.id);
                const productSnapshot = await get(productRef);
                
                if (productSnapshot.exists()) {
                    const currentProduct = productSnapshot.val() as Product;
                    // Deduct by Order Quantity
                    const newStock = Math.max(0, currentProduct.stock - item.quantity);
                    const newSold = currentProduct.totalSold + item.quantity;
                    
                    updates['/products/' + item.product.id + '/stock'] = newStock;
                    updates['/products/' + item.product.id + '/totalSold'] = newSold;
                }

                // 2. Digital Product Auto-Complete Logic
                // If product is digital and we are marking as PAID, auto jump to COMPLETED
                if (status === OrderStatus.PAID && item.product.category === 'digital') {
                    finalStatus = OrderStatus.COMPLETED;
                }

                // 3. AUTOMATIC VOUCHER MESSAGE LOGIC
                // Triggered only when Status becomes PAID (or COMPLETED via auto-jump)
                if (item.product.hasCustomMessage && item.product.customMessage) {
                     // Generate Vouchers based on Quantity
                    let voucherCodes = [];
                    for(let i=0; i < item.quantity; i++) {
                         // Generate a simple alphanumeric code: V-XXXX-XXXX
                         const code = 'V-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
                         voucherCodes.push(code);
                    }

                    const voucherListStr = voucherCodes.map((c, idx) => `Item ${idx + 1}: ${c}`).join('\n');
                    const finalMessage = `${item.product.customMessage}\n\n----------------\nKODE VOUCHER ANDA:\n${voucherListStr}\n----------------\n\nSimpan kode ini dan tunjukkan ke admin atau gunakan sesuai instruksi.`;

                    // Send automated message
                    await sendMessage(
                        order.userId,
                        `Voucher: ${item.product.name}`,
                        `Pembayaran Dikonfirmasi! Terima kasih telah membeli ${item.quantity}x ${item.product.name}.\n\n${finalMessage}`,
                        true
                    );
                }
            }
        }
    }

    updates['/orders/' + orderId + '/status'] = finalStatus;
    await update(ref(db), updates);
};

export const updateOrderProof = async (orderId: string, base64Image: string) => {
    const updates: any = {};
    updates[`/orders/${orderId}/paymentProof`] = base64Image;
    await update(ref(db), updates);
};

// Soft delete for User (hides from UI, keeps in DB for Admin)
export const hideOrderForUser = async (orderId: string) => {
    const updates: any = {};
    updates[`/orders/${orderId}/hiddenForUser`] = true;
    await update(ref(db), updates);
};

// Hard delete for Admin (removes from DB, affects Overview)
export const deleteOrder = async (orderId: string) => {
    await remove(ref(db, `orders/${orderId}`));
};

// NEW: Delete ALL orders for a specific user (Hard Delete)
export const deleteAllOrdersByUser = async (userId: string) => {
    const ordersRef = ref(db, 'orders');
    const snapshot = await get(ordersRef);
    if (snapshot.exists()) {
        const updates: any = {};
        snapshot.forEach((child) => {
            const order = child.val();
            if (order.userId === userId) {
                updates[child.key!] = null; // Remove this order
            }
        });
        // Perform batch update if there are items to remove
        if (Object.keys(updates).length > 0) {
            await update(ordersRef, updates);
        }
    }
};


// --- User Services ---

export const registerUser = async (email: string, username: string, password: string): Promise<User> => {
    // Simple insecure auth for demo
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val();
    
    if (users) {
        const existing = Object.values(users).find((u: any) => u.email === email);
        if (existing) throw new Error("Email already registered");
    }

    const newUserId = push(child(ref(db), 'users')).key;
    const newUser: User & { password: string } = { 
        uid: newUserId!,
        username,
        email,
        password,
        lastSeen: Date.now(),
        isActive: true
    };

    await set(ref(db, 'users/' + newUserId), newUser);
    const { password: _, ...safeUser } = newUser;
    return safeUser;
};

export const loginUser = async (email: string, password: string): Promise<User> => {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val();

    if (!users) throw new Error("User not found");

    const user: any = Object.values(users).find((u: any) => u.email === email && u.password === password);
    if (!user) throw new Error("Invalid credentials");

    if (!user.isActive) throw new Error("Akun dinonaktifkan oleh Admin");

    // Update last seen
    await update(ref(db, 'users/' + user.uid), { lastSeen: Date.now() });

    const { password: _, ...safeUser } = user;
    return safeUser;
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
    await update(ref(db, 'users/' + uid), data);
};

export const subscribeToUsers = (callback: (users: User[]) => void) => {
    const usersRef = ref(db, 'users');
    return onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        const usersList: User[] = data ? Object.values(data) : [];
        callback(usersList);
    });
};

export const deleteUser = async (uid: string) => {
    await remove(ref(db, `users/${uid}`));
};

export const toggleUserStatus = async (uid: string, currentStatus: boolean) => {
    await update(ref(db, `users/${uid}`), { isActive: !currentStatus });
};

// --- Banner Services ---
export const updateBanner = async (base64Image: string) => {
    await update(ref(db), { '/settings/banner': base64Image });
};

export const subscribeToBanner = (callback: (banner: string | null) => void) => {
    return onValue(ref(db, 'settings/banner'), (snapshot) => {
        callback(snapshot.val());
    });
};

// --- Invoice Settings Services ---
export const updateInvoiceSettings = async (settings: InvoiceSettings) => {
    await update(ref(db), { '/settings/invoice': settings });
};

export const subscribeToInvoiceSettings = (callback: (settings: InvoiceSettings | null) => void) => {
    return onValue(ref(db, 'settings/invoice'), (snapshot) => {
        callback(snapshot.val());
    });
};
