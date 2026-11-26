import React from 'react';
import {
  Utensils,
  UtensilsCrossed,
  ChefHat,
  HandPlatter,
  CookingPot,
  Flame,
  Coffee,
  CupSoda,
  GlassWater,
  Martini,
  Wine,
  Beer,
  Milk,
  Cake,
  CakeSlice,
  IceCreamBowl,
  IceCreamCone,
  Cookie,
  Croissant,
  Donut,
  Dessert,
  Candy,
  Popcorn,
  Salad,
  LeafyGreen,
  Sprout,
  EggFried,
  Drumstick,
  Beef,
  Fish,
  Shrimp,
  Carrot,
  Wheat,
  Citrus,
  Apple,
  Cherry,
  Pizza,
  Sandwich,
} from 'lucide-react';

export type CategoryIconGroup = 'indian' | 'global';

export interface CategoryIconProps {
  className?: string;
  strokeWidth?: number;
  color?: string;
}

export interface CategoryIconOption {
  id: string;
  label: string;
  shortLabel?: string;
  group: CategoryIconGroup;
  Icon: React.ComponentType<CategoryIconProps>;
}

export const DEFAULT_CUSTOM_ICON_ID = 'utensils';

// ─── 20 Bespoke Indian Culinary Line-Art SVG Icons ───────────────────────────

const IndianThaliIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="9.5" />
    <circle cx="8" cy="9" r="1.6" />
    <circle cx="12" cy="7.5" r="1.5" />
    <circle cx="16" cy="9" r="1.6" />
    <path d="M7 14.2a5 4.2 0 0 0 10 0Z" />
  </svg>
);

const IndianBiryaniIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4.5 11.5h15" />
    <path d="M5.5 11.5c0 4.8 2.8 8 6.5 8s6.5-3.2 6.5-8" />
    <path d="M7 11.5a5 4.5 0 0 1 10 0" />
    <path d="M12 5v2" />
    <path d="M8.5 3.5c0 1 .7 1.3.7 2.2" />
    <path d="M15.5 3.5c0 1-.7 1.3-.7 2.2" />
  </svg>
);

const IndianDosaIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3.5 15.5 19.5 6.8a1.7 1.7 0 0 1 2.2 2.2L9.5 18a3.2 3.2 0 0 1-6-2.5Z" />
    <path d="M5 13.5a2 2 0 0 0 2.8 2.8" />
    <circle cx="15.2" cy="18.2" r="1.8" />
    <circle cx="19.8" cy="17.2" r="1.5" />
  </svg>
);

const IndianIdliIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <ellipse cx="8" cy="10.2" rx="3.4" ry="2.5" />
    <ellipse cx="14.5" cy="8.5" rx="3.2" ry="2.3" />
    <circle cx="15.2" cy="15" r="2.8" />
    <circle cx="15.2" cy="15" r="0.8" />
    <path d="M3.5 18.8c4.5 1.8 12.5 1.8 17 0" />
  </svg>
);

const IndianSamosaIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 4.5 4.2 17.6a1.4 1.4 0 0 0 1.2 2.1h13.2a1.4 1.4 0 0 0 1.2-2.1L12 4.5Z" />
    <path d="M5.4 16.5h13.2" />
    <path d="M10.5 11l2.5 2.2" />
  </svg>
);

const IndianTandoorIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 20 20 4" />
    <rect x="7.5" y="11.5" width="3.4" height="3.4" rx="0.6" />
    <rect x="12" y="7" width="3.4" height="3.4" rx="0.6" />
    <path d="M16.5 20.5c1.5 0 2.5-1.1 2.5-2.5 0-1-.7-1.9-1.4-2.4-.2.9-.8 1.3-1.2 1.4-.3-1.1-1.1-1.9-1.6-2.4-.5 1-.8 1.9-.8 2.9 0 1.6 1.1 3 2.5 3Z" />
  </svg>
);

const IndianNaanIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 3.5c3.8 3.2 6.5 6.8 6.5 10.5a6.5 6.5 0 1 1-13 0c0-3.7 2.7-7.3 6.5-10.5Z" />
    <path d="M9.8 12.2c.8-.5 1.8-.3 2.2.3" />
    <path d="M13 15.8c.8-.4 1.5-.1 1.8.4" />
    <path d="M9.5 16.2h.2" />
  </svg>
);

const IndianChaiIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6.5 10.5h11l-1.5 8.5a2 2 0 0 1-2 1.7h-4a2 2 0 0 1-2-1.7l-1.5-8.5Z" />
    <path d="M7.2 13.8h9.6" />
    <path d="M9 4c0 1.4.8 1.9.8 3" />
    <path d="M12 3c0 1.6.8 2.1.8 3.4" />
    <path d="M15 4c0 1.4.8 1.9.8 3" />
  </svg>
);

const IndianLassiIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M7 7.5h10l-1.4 12a1.5 1.5 0 0 1-1.5 1.3H9.9a1.5 1.5 0 0 1-1.5-1.3L7 7.5Z" />
    <path d="M7.5 7.5a4.5 3 0 0 1 9 0" />
    <path d="M14 9.5 16.5 3.5h2.5" />
    <path d="M9 12.5h6" />
  </svg>
);

const IndianPaniPuriIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="7.5" cy="11" r="2.7" />
    <circle cx="13" cy="8.5" r="2.7" />
    <circle cx="9.8" cy="16.2" r="2.5" />
    <path d="M14 15.2h6.8a3.4 3.4 0 0 1-6.8 0Z" />
  </svg>
);

const IndianChaatIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 13h16a8 7 0 0 1-16 0Z" />
    <path d="M9 20h6" />
    <path d="M6.8 13c1-2.5 3-4 5.2-4s4.2 1.5 5.2 4" />
    <path d="M9 10.5 11 9" />
    <path d="M13 9l2 1.5" />
    <path d="M12 6.8h.2" />
  </svg>
);

const IndianKadaiIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12h14a7 7 0 0 1-14 0Z" />
    <path d="M5 12a2 2 0 1 1-1.5-3.2" />
    <path d="M19 12a2 2 0 1 0 1.5-3.2" />
    <path d="M14.5 5.5 12 12" />
    <path d="M8.5 8.5c0-1 .7-1.6.7-2.4" />
    <path d="M11.2 7.5c0-1 .7-1.6.7-2.4" />
  </svg>
);

const IndianPaneerIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 13.5h16a8 6.2 0 0 1-16 0Z" />
    <rect x="6.5" y="8.5" width="4" height="4" rx="0.6" />
    <rect x="11.5" y="7" width="4" height="4" rx="0.6" />
    <path d="M16 11.5c1-.7 1.8-.3 2 .6" />
  </svg>
);

const IndianCholeIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <ellipse cx="8.5" cy="11.8" rx="4.5" ry="6" transform="rotate(-18 8.5 11.8)" />
    <path d="M13 15.2h7.8a3.9 3.9 0 0 1-7.8 0Z" />
    <path d="M15.5 13.2h.2" />
    <path d="M18.2 13.2h.2" />
  </svg>
);

const IndianPavBhajiIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="4.5" y="5.5" width="6.5" height="5.5" rx="1.5" />
    <rect x="13" y="5.5" width="6.5" height="5.5" rx="1.5" />
    <path d="M4 14.5h16a8 5 0 0 1-16 0Z" />
    <rect x="10.2" y="12.5" width="3.6" height="2" rx="0.4" />
  </svg>
);

const IndianMomosIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5.5 14c0-3 1.8-5 3.3-5s3.2 2 3.2 5H5.5Z" />
    <path d="M12 14c0-3 1.8-5 3.3-5s3.2 2 3.2 5H12Z" />
    <path d="M8.8 9v2" />
    <path d="M15.3 9v2" />
    <rect x="3.5" y="14" width="17" height="4.5" rx="1.5" />
  </svg>
);

const IndianGulabJamunIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="8.5" cy="11.5" r="2.2" />
    <circle cx="15.5" cy="11.5" r="2.2" />
    <circle cx="12" cy="8.5" r="2.2" />
    <path d="M4.5 13.8h15a7.5 5.5 0 0 1-15 0Z" />
    <path d="M9 19.5h6" />
  </svg>
);

const IndianJalebiIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12.2 12c1 0 1.8-.8 1.8-1.8s-.8-1.8-1.8-1.8a2.8 2.8 0 0 0-2.8 2.8c0 2.1 1.7 3.8 3.8 3.8a4.8 4.8 0 0 0 4.8-4.8c0-3.3-2.7-5.8-6-5.8A7.2 7.2 0 0 0 4.8 11.6c0 4.3 3.4 7.7 7.7 7.7 3.4 0 6.2-2.1 7.2-5" />
  </svg>
);

const IndianKulfiIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M8.8 4.5h6.4l-1.4 10.3a1.8 1.8 0 0 1-3.6 0L8.8 4.5Z" />
    <path d="M12 16.5V21" />
    <path d="M9.6 8.5 14.3 7" />
    <path d="M10.1 11.8 13.9 10.6" />
  </svg>
);

const IndianPaanIcon: React.FC<CategoryIconProps> = ({
  className = 'w-6 h-6',
  strokeWidth = 1.8,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 20.5 5 9c2-2.8 4.8-3.8 7-3.8s5 1 7 3.8l-7 11.5Z" />
    <path d="M12 5.2v15.3" />
    <path d="M8.5 9.8 12 12.5l3.5-2.7" />
    <circle cx="12" cy="5.2" r="1.2" />
  </svg>
);

// ─── Full Culinary Category Logo Catalog (20 Indian + 36 Global = 56) ────────

export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  // 20 Indian Culinary Category Logos
  { id: 'indian-thali', label: 'Indian Thali', shortLabel: 'Thali', group: 'indian', Icon: IndianThaliIcon },
  { id: 'indian-biryani', label: 'Biryani Handi', shortLabel: 'Biryani', group: 'indian', Icon: IndianBiryaniIcon },
  { id: 'indian-dosa', label: 'Masala Dosa', shortLabel: 'Dosa', group: 'indian', Icon: IndianDosaIcon },
  { id: 'indian-idli', label: 'Idli & Vada', shortLabel: 'Idli Vada', group: 'indian', Icon: IndianIdliIcon },
  { id: 'indian-samosa', label: 'Samosa', shortLabel: 'Samosa', group: 'indian', Icon: IndianSamosaIcon },
  { id: 'indian-tandoor', label: 'Tandoor & Kebabs', shortLabel: 'Tandoor', group: 'indian', Icon: IndianTandoorIcon },
  { id: 'indian-naan', label: 'Naan & Roti', shortLabel: 'Naan Roti', group: 'indian', Icon: IndianNaanIcon },
  { id: 'indian-chai', label: 'Masala Chai', shortLabel: 'Chai', group: 'indian', Icon: IndianChaiIcon },
  { id: 'indian-lassi', label: 'Lassi & Chaas', shortLabel: 'Lassi', group: 'indian', Icon: IndianLassiIcon },
  { id: 'indian-panipuri', label: 'Pani Puri', shortLabel: 'Pani Puri', group: 'indian', Icon: IndianPaniPuriIcon },
  { id: 'indian-chaat', label: 'Chaat Bowl', shortLabel: 'Chaat', group: 'indian', Icon: IndianChaatIcon },
  { id: 'indian-kadai', label: 'Kadai & Dal', shortLabel: 'Kadai Dal', group: 'indian', Icon: IndianKadaiIcon },
  { id: 'indian-paneer', label: 'Paneer Specials', shortLabel: 'Paneer', group: 'indian', Icon: IndianPaneerIcon },
  { id: 'indian-chole', label: 'Chole Bhature', shortLabel: 'Chole', group: 'indian', Icon: IndianCholeIcon },
  { id: 'indian-pavbhaji', label: 'Pav Bhaji', shortLabel: 'Pav Bhaji', group: 'indian', Icon: IndianPavBhajiIcon },
  { id: 'indian-momos', label: 'Steamed Momos', shortLabel: 'Momos', group: 'indian', Icon: IndianMomosIcon },
  { id: 'indian-gulab-jamun', label: 'Gulab Jamun', shortLabel: 'Jamun', group: 'indian', Icon: IndianGulabJamunIcon },
  { id: 'indian-jalebi', label: 'Jalebi', shortLabel: 'Jalebi', group: 'indian', Icon: IndianJalebiIcon },
  { id: 'indian-kulfi', label: 'Kulfi & Falooda', shortLabel: 'Kulfi', group: 'indian', Icon: IndianKulfiIcon },
  { id: 'indian-paan', label: 'Paan & Mukhwas', shortLabel: 'Paan', group: 'indian', Icon: IndianPaanIcon },

  // 36 Global Culinary Category Logos
  { id: 'utensils', label: 'House Special', shortLabel: 'Special', group: 'global', Icon: Utensils },
  { id: 'coffee', label: 'Coffee & Espresso', shortLabel: 'Coffee', group: 'global', Icon: Coffee },
  { id: 'cup-soda', label: 'Cold Drinks & Shakes', shortLabel: 'Drinks', group: 'global', Icon: CupSoda },
  { id: 'glass-water', label: 'Juices & Refreshers', shortLabel: 'Juices', group: 'global', Icon: GlassWater },
  { id: 'martini', label: 'Mocktails & Cocktails', shortLabel: 'Mocktails', group: 'global', Icon: Martini },
  { id: 'wine', label: 'Wine & Aperitifs', shortLabel: 'Wine', group: 'global', Icon: Wine },
  { id: 'beer', label: 'Craft Brews', shortLabel: 'Brews', group: 'global', Icon: Beer },
  { id: 'milk', label: 'Milkshakes & Dairy', shortLabel: 'Shakes', group: 'global', Icon: Milk },
  { id: 'cake', label: 'Celebration Cakes', shortLabel: 'Cakes', group: 'global', Icon: Cake },
  { id: 'cake-slice', label: 'Pastries & Pies', shortLabel: 'Pastries', group: 'global', Icon: CakeSlice },
  { id: 'ice-cream-bowl', label: 'Sundaes & Gelato', shortLabel: 'Sundaes', group: 'global', Icon: IceCreamBowl },
  { id: 'ice-cream-cone', label: 'Ice Cream Cones', shortLabel: 'Cones', group: 'global', Icon: IceCreamCone },
  { id: 'cookie', label: 'Cookies & Biscuits', shortLabel: 'Cookies', group: 'global', Icon: Cookie },
  { id: 'croissant', label: 'Bakery & Croissants', shortLabel: 'Bakery', group: 'global', Icon: Croissant },
  { id: 'donut', label: 'Donuts & Glazed', shortLabel: 'Donuts', group: 'global', Icon: Donut },
  { id: 'dessert', label: 'Puddings & Desserts', shortLabel: 'Desserts', group: 'global', Icon: Dessert },
  { id: 'candy', label: 'Sweets & Confection', shortLabel: 'Sweets', group: 'global', Icon: Candy },
  { id: 'popcorn', label: 'Snacks & Popcorn', shortLabel: 'Snacks', group: 'global', Icon: Popcorn },
  { id: 'salad', label: 'Salads & Bowls', shortLabel: 'Salads', group: 'global', Icon: Salad },
  { id: 'leafy-green', label: 'Healthy & Vegan', shortLabel: 'Vegan', group: 'global', Icon: LeafyGreen },
  { id: 'sprout', label: 'Organic Greens', shortLabel: 'Organic', group: 'global', Icon: Sprout },
  { id: 'egg-fried', label: 'Breakfast & Brunch', shortLabel: 'Breakfast', group: 'global', Icon: EggFried },
  { id: 'cooking-pot', label: 'Curries & Hot Pots', shortLabel: 'Hot Pots', group: 'global', Icon: CookingPot },
  { id: 'flame', label: 'Sizzlers & Flame', shortLabel: 'Sizzlers', group: 'global', Icon: Flame },
  { id: 'chef-hat', label: 'Chef Specials', shortLabel: 'Chef', group: 'global', Icon: ChefHat },
  { id: 'hand-platter', label: 'Platters & Combos', shortLabel: 'Platters', group: 'global', Icon: HandPlatter },
  { id: 'drumstick', label: 'Chicken & Grills', shortLabel: 'Grills', group: 'global', Icon: Drumstick },
  { id: 'beef', label: 'Steaks & Roasts', shortLabel: 'Steaks', group: 'global', Icon: Beef },
  { id: 'fish', label: 'Seafood & Fish', shortLabel: 'Seafood', group: 'global', Icon: Fish },
  { id: 'shrimp', label: 'Prawns & Coastal', shortLabel: 'Prawns', group: 'global', Icon: Shrimp },
  { id: 'carrot', label: 'Sides & Veggies', shortLabel: 'Veggies', group: 'global', Icon: Carrot },
  { id: 'wheat', label: 'Breads & Grains', shortLabel: 'Breads', group: 'global', Icon: Wheat },
  { id: 'citrus', label: 'Citrus & Smoothies', shortLabel: 'Citrus', group: 'global', Icon: Citrus },
  { id: 'apple', label: 'Fresh Fruits', shortLabel: 'Fruits', group: 'global', Icon: Apple },
  { id: 'cherry', label: 'Fruit Tarts', shortLabel: 'Tarts', group: 'global', Icon: Cherry },
  { id: 'utensils-crossed', label: 'Meals & Combos', shortLabel: 'Combos', group: 'global', Icon: UtensilsCrossed },
];

const ICON_MAP = new Map<string, CategoryIconOption>(
  CATEGORY_ICON_OPTIONS.map((opt) => [opt.id, opt])
);

const BUILT_IN_LOGO_CATEGORIES = new Set([
  'All',
  'Starters',
  'Soups',
  'Main Course',
  'Pizzas',
  'Burgers',
]);

export function isCategoryImageUrl(value?: string | null): value is string {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(trimmed)) {
    return true;
  }
  if (/^https?:\/\//i.test(trimmed) || /^blob:/i.test(trimmed)) {
    return true;
  }
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }
  return false;
}

export function sanitizeCategoryImageUrlInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (isCategoryImageUrl(trimmed)) {
    return trimmed;
  }
  return null;
}

export const getCategoryIconLabel = (iconId?: string, category?: string): string => {
  if (iconId && isCategoryImageUrl(iconId)) {
    return 'Custom Image';
  }
  if (iconId && ICON_MAP.has(iconId)) {
    return ICON_MAP.get(iconId)!.label;
  }
  if (category && BUILT_IN_LOGO_CATEGORIES.has(category)) {
    return 'Default Logo';
  }
  return 'House Special';
};

export interface RenderCategoryLogoOptions {
  color?: string;
  sizeClass?: string;
  imageClassName?: string;
  strokeWidth?: number;
  customIconId?: string;
}

const renderBuiltInOrDefaultIcon = (
  category: string,
  color: string,
  sizeClass: string,
  strokeWidth: number
): React.ReactNode => {
  switch (category) {
    case 'All':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={sizeClass}
        >
          <path d="M12 4v2" />
          <path d="M4 18h16" />
          <path d="M4 18a8 8 0 0 1 16 0" />
          <circle cx="12" cy="4" r="1" fill={color} />
        </svg>
      );
    case 'Starters':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={sizeClass}
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      );
    case 'Soups':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={sizeClass}
        >
          <path d="M4 11h16a1 1 0 0 1 1 1 8 8 0 0 1-8 8 8 8 0 0 1-8-8 1 1 0 0 1 1-1Z" />
          <path d="M6 19v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" />
          <path d="M8 4c0 1.5 1 2 1 3" />
          <path d="M12 3c0 1.5 1 2 1 3" />
          <path d="M16 4c0 1.5 1 2 1 3" />
        </svg>
      );
    case 'Main Course':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={sizeClass}
        >
          <circle cx="12" cy="12" r="5" />
          <path d="M4 6v5a2 2 0 0 0 2 2v6" />
          <path d="M6 6v7" />
          <path d="M20 6c-1.5 0-2 1.5-2 3.5v3.5a1 1 0 0 0 1 1v5" />
        </svg>
      );
    case 'Pizzas':
      return <Pizza className={sizeClass} strokeWidth={strokeWidth} color={color} />;
    case 'Burgers':
      return <Sandwich className={sizeClass} strokeWidth={strokeWidth} color={color} />;
    default:
      return <Utensils className={sizeClass} strokeWidth={strokeWidth} color={color} />;
  }
};

const CategoryCustomImage: React.FC<{
  src: string;
  alt: string;
  className: string;
  fallback: React.ReactNode;
}> = ({ src, alt, className, fallback }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};

export const renderCategoryLogo = (
  category: string,
  options: RenderCategoryLogoOptions = {}
): React.ReactNode => {
  const {
    color = 'currentColor',
    sizeClass = 'w-6 h-6',
    imageClassName,
    strokeWidth = 1.8,
    customIconId,
  } = options;

  const trimmedOverride = customIconId?.trim();
  const fallbackNode = renderBuiltInOrDefaultIcon(category, color, sizeClass, strokeWidth);

  if (trimmedOverride) {
    if (isCategoryImageUrl(trimmedOverride)) {
      const labelPrefix = category === 'All' ? 'All Dishes' : category;
      return (
        <CategoryCustomImage
          src={trimmedOverride}
          alt={`${labelPrefix} category logo`}
          className={imageClassName || `${sizeClass} rounded-lg object-cover shrink-0`}
          fallback={fallbackNode}
        />
      );
    }

    const matched = ICON_MAP.get(trimmedOverride);
    if (matched) {
      const IconComp = matched.Icon;
      return <IconComp className={sizeClass} strokeWidth={strokeWidth} color={color} />;
    }
  }

  return fallbackNode;
};
