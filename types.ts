
export enum PanelType {
    GUEST = 'guest',
    USER = 'user',
    ADMIN = 'admin',
}

export interface User {
    uid: string;
    username: string;
    email: string;
    profilePicture?: string; // base64 string
    lastSeen: number;
    isActive: boolean;
}

export type ProductCategory = 'physical' | 'digital';

export interface Product {
    id: string;
    name: string;
    imageUrl: string;
    originalPrice: number;
    discountedPrice: number;
    discountPercent: number;
    saleTag: string; // e.g., 'pre sale 3'
    stock: number;
    maxStock?: number; // Optional/Deprecated
    isSaleClosed: boolean;
    isComingSoon: boolean;
    releaseDate?: number; // Timestamp for countdown
    totalSold: number;
    buyLink?: string; // URL for the buy button action
    extraInfo?: { label: string; value: string; iconType?: string }[]; // Added iconType
    category?: ProductCategory; // New field for product category
    
    // New Features
    hasCustomMessage?: boolean; // Trigger automatic message on buy
    customMessage?: string; // The message content (e.g., Voucher Code)
    enableWholesale?: boolean; // Enable bulk discount
    wholesaleMinQty?: number; // Min qty to apply discount
    wholesalePercent?: number; // Discount percentage
}

export interface CartItem {
    productId: string;
    quantity: number;
}

export enum OrderStatus {
    PENDING = 'Pending',
    PAID = 'Lunas',
    SHIPPED = 'Sedang Diantar', // New Status
    COMPLETED = 'Diterima', // New Status
    REJECTED = 'Ditolak',
    CONFIRMED = 'Confirmed',
    CANCELLED = 'Dibatalkan',
}

export interface Order {
    id: string;
    userId: string;
    username: string;
    items: { product: Product; quantity: number }[];
    totalPrice: number;
    status: OrderStatus;
    paymentProof?: string; // base64 string
    timestamp: number;
    shippingDetails?: {
        name: string;
        address: string;
        phone: string;
    };
    hiddenForUser?: boolean; // New field for user-side soft delete
}

export interface AppNotification {
    type: 'success' | 'error' | 'info';
    message: string;
}

export interface InvoiceSettings {
    logoUrl?: string; // Base64
    signatureUrl?: string; // Base64
    companyName: string;
    companyAddress: string;
    bankDetails: string; // e.g. "Bank A\nBank B"
    footerNote: string;
    ownerName: string;
}

export interface Message {
    id: string;
    userId: string; // specific User UID or 'ALL' for broadcast
    title: string;
    content: string;
    timestamp: number;
    isRead: boolean;
    fromAdmin: boolean;
}