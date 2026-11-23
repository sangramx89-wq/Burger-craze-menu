export type DefaultCategory = 'Starters' | 'Soups' | 'Main Course' | 'Pizzas' | 'Burgers';
export type Category = 'All' | DefaultCategory | (string & {});

export type PortionSizeKey = 'small' | 'medium' | 'large';
export type PricingMode = 'tiered' | 'fixed';

export interface PortionTier {
  label: string;       // "Small", "Medium", "Large"
  portion: string;     // e.g. "200g", "1 Bowl (250ml)", "8-inch (4 slices)"
  price: number;       // e.g. 120, 160, 210
  calories?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  category: Category;
  price: number; // Default/reference price (or fixed price when pricingMode === 'fixed')
  pricingMode?: PricingMode; // 'tiered' (S/M/L) by default, or 'fixed' for single-price items
  fixedPortion?: string;     // Optional serving size label for fixed-price items (e.g. "250 ml", "1 Cup")
  description: string;
  image: string;
  rating: number;
  reviewCount: number;
  prepTime: string;
  calories: number;
  tags: string[];
  isVeg: boolean;
  spiceLevel?: 'Mild' | 'Medium' | 'Spicy';
  isPopular?: boolean;
  isChefSpecial?: boolean;
  ingredients: string[];
  allergens?: string[];
  isAvailable?: boolean;
  sizes?: Record<PortionSizeKey, PortionTier>;
}

export interface CartItem {
  cartId: string;
  foodItem: FoodItem;
  quantity: number;
  selectedOptions: Record<string, string>;
  specialNotes?: string;
  unitPrice: number;
  totalPrice: number;
}

export type OrderStatus = 'received' | 'preparing' | 'on_the_way' | 'delivered';

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  orderType: 'delivery' | 'dine_in';
  tableNumber?: string;
  deliveryAddress?: string;
  customerName: string;
  customerPhone: string;
  estimatedMinutes: number;
  paymentMethod: 'card' | 'apple_pay' | 'cash';
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  tier: 'Silver' | 'Gold' | 'Platinum';
  savedAddresses: { label: string; address: string }[];
  dietaryPreferences: string[];
}

export interface CafeInfo {
  cafeName?: string;
  tagline?: string;
  openingHours: string;
  location: string;
  contactNumber: string;
  wifiPassword: string;
}

export type PortalTarget = 'customer' | 'admin' | 'superadmin';

export type StorefrontTheme = 'classic' | 'warm-amber-neumorphism';

export interface SuperAdminLogEntry {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface ServiceControlState {
  isPaused: boolean;
  pauseTitle: string;
  pauseMessage: string;
  isAdminLocked: boolean;
  suppressPopups: boolean;
  updatedAt: string | null;
  actionLog: SuperAdminLogEntry[];
}

export interface SavedDefaultMenuSnapshot {
  menuItems: FoodItem[];
  customCategories: string[];
  categoryIcons: Record<string, string>;
  savedAt: string;
}
