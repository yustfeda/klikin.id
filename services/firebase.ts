
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
    appId: "1:351502028950:web:8749825e815e3914f10312"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export const loginUser = async (email: string, pass: string): Promise<User> => {
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `users`));
    if (snapshot.exists()) {
        const users = snapshot.val();
        const foundKey = Object.keys(users).find(key => users[key].email === email && users[key].password === pass);
        if (foundKey) {
            const userData = users[foundKey];
            if (!userData.isActive) throw new Error("Akun anda dinonaktifkan.");
            
            // Update last seen
            await update(ref(database, `users/${foundKey}`), { lastSeen: Date.now() });
            
            return {
                uid: foundKey,
                username: userData.username,
                email: userData.email,
                profilePicture: userData.profilePicture,
                lastSeen: Date.now(),
                isActive: true
            };
        }
    }
    throw new Error("Email atau password salah.");
};

export const registerUser = async (email: string, username: string, pass: string): Promise<User> => {
    const dbRef = ref(database);
    
    // Check duplicate email
    const snapshot = await get(child(dbRef, `users`));
    if (snapshot.exists()) {
        const users = snapshot.val();
        const existing = Object.values(users).find((u: any) => u.email === email);
        if (existing) throw new Error("Email sudah terdaftar.");
    }

    const newUserRef = push(child(dbRef, 'users'));
    const uid = newUserRef.key!;
    const newUser = {
        email,
        username,
        password: pass,
        profilePicture: '',
        lastSeen: Date.now(),
        isActive: true
    };
    
    await set(newUserRef, newUser);
    return { uid, ...newUser };
};

export const checkAdminPassword = async (pass: string): Promise<boolean> => {
    const snapshot = await get(child(ref(database), 'admin/password'));
    const correctPass = snapshot.exists() ? snapshot.val() : 'admin123'; // Default fallback
    return pass === correctPass;
};

export const subscribeToProducts = (callback: (products: Product[]) => void) => {
    const productsRef = ref(database, 'products');
    const unsubscribe = onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        const productsList: Product[] = [];
        if (data) {
            Object.keys(data).forEach(key => {
                productsList.push({ id: key, ...data[key] });
            });
        }
        callback(productsList);
    });
    return () => unsubscribe();
};

export const addProduct = async (product: Product) => {
    const newProductRef = push(child(ref(database), 'products'));
    await set(newProductRef, product);
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
    await update(ref(database, `products/${id}`), updates);
};

export const deleteProduct = async (id: string) => {
    await remove(ref(database, `products/${id}`));
};

export const createOrder = async (userId: string, username: string, product: Product, quantity: number, shipping: {name: string, address: string, phone: string}) => {
    const newOrderRef = push(child(ref(database), 'orders'));
    const orderId = newOrderRef.key!;
    
    let finalPrice = product.discountedPrice;
    if (product.enableWholesale && product.wholesaleMinQty && product.wholesalePercent) {
        if (quantity >= product.wholesaleMinQty) {
            finalPrice = finalPrice * (1 - product.wholesalePercent / 100);
        }
    }
    const totalPrice = finalPrice * quantity;

    const order: Order = {
        id: orderId,
        userId,
        username,
        items: [{ product, quantity }],
        totalPrice: totalPrice,
        status: OrderStatus.PENDING,
        timestamp: Date.now(),
        shippingDetails: shipping
    };
    await set(newOrderRef, order);
    return orderId;
};

export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
    const ordersRef = ref(database, 'orders');
    const unsubscribe = onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        const ordersList: Order[] = [];
        if (data) {
            Object.keys(data).forEach(key => {
                ordersList.push({ id: key, ...data[key] });
            });
        }
        // Sort by newest first
        ordersList.sort((a, b) => b.timestamp - a.timestamp);
        callback(ordersList);
    });
    return () => unsubscribe();
};

export const updateOrderProof = async (orderId: string, proofBase64: string) => {
    await update(ref(database, `orders/${orderId}`), { paymentProof: proofBase64 });
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const updates: any = { status };
    
    // If Paid, update product stats
    if (status === OrderStatus.PAID) {
        const orderSnap = await get(child(ref(database), `orders/${orderId}`));
        if (orderSnap.exists()) {
            const order = orderSnap.val() as Order;
            // Only deduct stock if not already deducted (simple check, ideally backend logic)
            // For this demo, we just decrement.
            const item = order.items[0];
            const productSnap = await get(child(ref(database), `products/${item.product.id}`));
            if (productSnap.exists()) {
                const currentProd = productSnap.val();
                const newSold = (currentProd.totalSold || 0) + item.quantity;
                const newStock = (currentProd.stock || 0) - item.quantity;
                await update(ref(database, `products/${item.product.id}`), {
                    totalSold: newSold,
                    stock: newStock >= 0 ? newStock : 0
                });
            }
        }
    }

    await update(ref(database, `orders/${orderId}`), updates);
};

export const deleteOrder = async (orderId: string) => {
    await remove(ref(database, `orders/${orderId}`));
};

export const hideOrderForUser = async (orderId: string) => {
    await update(ref(database, `orders/${orderId}`), { hiddenForUser: true });
};

export const deleteAllOrdersByUser = async (userId: string) => {
     const snapshot = await get(child(ref(database), 'orders'));
     if (snapshot.exists()) {
         const orders = snapshot.val();
         const updates: any = {};
         Object.keys(orders).forEach(key => {
             if (orders[key].userId === userId) {
                 updates[key] = null;
             }
         });
         await update(ref(database, 'orders'), updates);
     }
};

export const subscribeToUsers = (callback: (users: User[]) => void) => {
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        const userList: User[] = [];
        if (data) {
            Object.keys(data).forEach(key => {
                userList.push({ uid: key, ...data[key] });
            });
        }
        callback(userList);
    });
    return () => unsubscribe();
};

export const deleteUser = async (uid: string) => {
    await remove(ref(database, `users/${uid}`));
};

export const toggleUserStatus = async (uid: string, currentStatus: boolean) => {
    await update(ref(database, `users/${uid}`), { isActive: !currentStatus });
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
    await update(ref(database, `users/${uid}`), data);
};

export const updateBanner = async (base64: string) => {
    await set(ref(database, 'settings/banner'), base64);
};

export const subscribeToBanner = (callback: (banner: string | null) => void) => {
    const unsubscribe = onValue(ref(database, 'settings/banner'), (snapshot) => {
        callback(snapshot.val());
    });
    return () => unsubscribe();
};

export const updateMobileBanner = async (base64: string) => {
    await set(ref(database, 'settings/bannerMobile'), base64);
};

export const subscribeToMobileBanner = (callback: (banner: string | null) => void) => {
    const unsubscribe = onValue(ref(database, 'settings/bannerMobile'), (snapshot) => {
        callback(snapshot.val());
    });
    return () => unsubscribe();
};

export const updateBackgrounds = async (type: 'mobile' | 'desktop', base64: string | null) => {
    await set(ref(database, `settings/backgrounds/${type}`), base64);
};

export const subscribeToBackgrounds = (callback: (bg: { mobile: string | null, desktop: string | null }) => void) => {
    const unsubscribe = onValue(ref(database, 'settings/backgrounds'), (snapshot) => {
        const data = snapshot.val() || { mobile: null, desktop: null };
        callback(data);
    });
    return () => unsubscribe();
};

export const updateThemeColor = async (color: string) => {
    await set(ref(database, 'settings/themeColor'), color);
};

export const subscribeToThemeColor = (callback: (color: string) => void) => {
    const unsubscribe = onValue(ref(database, 'settings/themeColor'), (snapshot) => {
        callback(snapshot.val() || '#FFFDD0'); // Default to Cream
    });
    return () => unsubscribe();
};

export const updateInvoiceSettings = async (settings: InvoiceSettings) => {
    await update(ref(database, 'settings/invoice'), settings);
};

export const subscribeToInvoiceSettings = (callback: (settings: InvoiceSettings | null) => void) => {
    const unsubscribe = onValue(ref(database, 'settings/invoice'), (snapshot) => {
        callback(snapshot.val());
    });
    return () => unsubscribe();
};

export const sendMessage = async (userId: string, title: string, content: string) => {
    const newMsgRef = push(child(ref(database), 'messages'));
    const msg: Message = {
        id: newMsgRef.key!,
        userId,
        title,
        content,
        timestamp: Date.now(),
        isRead: false,
        fromAdmin: true
    };
    await set(newMsgRef, msg);
};

export const subscribeToMessages = (callback: (messages: Message[]) => void) => {
    const msgRef = ref(database, 'messages');
    const unsubscribe = onValue(msgRef, (snapshot) => {
        const data = snapshot.val();
        const msgs: Message[] = [];
        if (data) {
            Object.keys(data).forEach(key => {
                msgs.push({ ...data[key], id: key });
            });
        }
        msgs.sort((a, b) => b.timestamp - a.timestamp);
        callback(msgs);
    });
    return () => unsubscribe();
};

export const markMessageAsRead = async (msgId: string) => {
    await update(ref(database, `messages/${msgId}`), { isRead: true });
};

export const deleteMessage = async (msgId: string) => {
    await remove(ref(database, `messages/${msgId}`));
};
