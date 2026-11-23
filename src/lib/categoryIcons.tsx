import React from 'react';
import {
  Apple,
  Award,
  Bean,
  Beef,
  Beer,
  Bird,
  BottleWine,
  Cake,
  CakeSlice,
  Candy,
  CandyCane,
  Carrot,
  ChefHat,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  Croissant,
  Crown,
  CupSoda,
  Donut,
  Drumstick,
  Egg,
  EggFried,
  Fish,
  Flame,
  FlameKindling,
  GlassWater,
  Grape,
  Ham,
  Hamburger,
  Heart,
  Hop,
  IceCreamBowl,
  IceCreamCone,
  Leaf,
  LeafyGreen,
  Lollipop,
  Martini,
  Milk,
  MoonStar,
  Nut,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Shrimp,
  Soup,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Tag,
  Utensils,
  UtensilsCrossed,
  Wheat,
  Wine,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CategoryIconOption {
  id: string;
  label: string;
  shortLabel?: string;
  group: 'indian' | 'global';
  Icon: LucideIcon;
}

export const DEFAULT_CUSTOM_ICON_ID = 'utensils';

export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  // Indian Cuisine & Cafe Favorites (24 icons)
  { id: 'indian-thali', label: 'Royal Thali Platter', shortLabel: 'Thali', group: 'indian', Icon: UtensilsCrossed },
  { id: 'tandoor-flame', label: 'Tandoor & Charcoal Grill', shortLabel: 'Tandoor', group: 'indian', Icon: Flame },
  { id: 'biryani-handi', label: 'Biryani & Handi Pot', shortLabel: 'Biryani', group: 'indian', Icon: Soup },
  { id: 'masala-chai', label: 'Masala Chai & Kulhad', shortLabel: 'Chai', group: 'indian', Icon: Coffee },
  { id: 'lassi-coolers', label: 'Lassi & Coolers', shortLabel: 'Lassi', group: 'indian', Icon: Milk },
  { id: 'chaat-street', label: 'Street Chaat & Snacks', shortLabel: 'Chaat', group: 'indian', Icon: Sparkles },
  { id: 'naan-roti', label: 'Naan, Roti & Breads', shortLabel: 'Breads', group: 'indian', Icon: Wheat },
  { id: 'curry-kadai', label: 'Kadai & Curries', shortLabel: 'Curry', group: 'indian', Icon: FlameKindling },
  { id: 'paneer-tikka', label: 'Paneer & Kebabs', shortLabel: 'Tikka', group: 'indian', Icon: ChefHat },
  { id: 'south-indian', label: 'Dosa & South Indian', shortLabel: 'Dosa', group: 'indian', Icon: Sun },
  { id: 'mithai-sweets', label: 'Mithai & Indian Sweets', shortLabel: 'Mithai', group: 'indian', Icon: Crown },
  { id: 'gulab-jamun', label: 'Warm Desserts & Halwa', shortLabel: 'Halwa', group: 'indian', Icon: Candy },
  { id: 'nimbu-pani', label: 'Nimbu Pani & Mocktails', shortLabel: 'Cooler', group: 'indian', Icon: Citrus },
  { id: 'dal-makhani', label: 'Dal & Lentil Specials', shortLabel: 'Dal', group: 'indian', Icon: Bean },
  { id: 'tandoori-chicken', label: 'Tandoori Chicken & Roast', shortLabel: 'Roast', group: 'indian', Icon: Drumstick },
  { id: 'coastal-seafood', label: 'Coastal Curry & Fish', shortLabel: 'Seafood', group: 'indian', Icon: Fish },
  { id: 'prawn-masala', label: 'Masala Prawns', shortLabel: 'Prawns', group: 'indian', Icon: Shrimp },
  { id: 'egg-bhurji', label: 'Egg Bhurji & Roll', shortLabel: 'Egg Roll', group: 'indian', Icon: EggFried },
  { id: 'kulfi-scoop', label: 'Malai Kulfi & Falooda', shortLabel: 'Kulfi', group: 'indian', Icon: IceCreamCone },
  { id: 'pure-veg-leaf', label: 'Pure Veg Kitchen', shortLabel: 'Pure Veg', group: 'indian', Icon: Leaf },
  { id: 'satvik-sprout', label: 'Fresh Sattvic Bowls', shortLabel: 'Sattvic', group: 'indian', Icon: Sprout },
  { id: 'dry-fruit-rich', label: 'Dry Fruit & Shahi', shortLabel: 'Shahi', group: 'indian', Icon: Nut },
  { id: 'iftar-feast', label: 'Evening Feast & Combos', shortLabel: 'Feast', group: 'indian', Icon: MoonStar },
  { id: 'chutney-pickle', label: 'Chutneys & Sides', shortLabel: 'Sides', group: 'indian', Icon: Carrot },

  // Global Cafe, Bakery & Bar Favorites (32 icons)
  { id: 'utensils', label: 'Classic Dining', shortLabel: 'Dining', group: 'global', Icon: Utensils },
  { id: 'burger', label: 'Gourmet Burgers', shortLabel: 'Burgers', group: 'global', Icon: Hamburger },
  { id: 'pizza', label: 'Artisan Pizza', shortLabel: 'Pizza', group: 'global', Icon: Pizza },
  { id: 'sandwich', label: 'Subs & Sandwiches', shortLabel: 'Sandwich', group: 'global', Icon: Sandwich },
  { id: 'salad', label: 'Fresh Salads', shortLabel: 'Salads', group: 'global', Icon: Salad },
  { id: 'greens', label: 'Vegan & Greens', shortLabel: 'Vegan', group: 'global', Icon: LeafyGreen },
  { id: 'steak', label: 'Steaks & Grills', shortLabel: 'Grills', group: 'global', Icon: Beef },
  { id: 'poultry', label: 'Poultry & Wings', shortLabel: 'Wings', group: 'global', Icon: Bird },
  { id: 'ham-deli', label: 'Deli & Cold Cuts', shortLabel: 'Deli', group: 'global', Icon: Ham },
  { id: 'breakfast-egg', label: 'All-Day Breakfast', shortLabel: 'Breakfast', group: 'global', Icon: Egg },
  { id: 'bakery-croissant', label: 'Croissants & Bakery', shortLabel: 'Bakery', group: 'global', Icon: Croissant },
  { id: 'cake-celebration', label: 'Whole Cakes', shortLabel: 'Cakes', group: 'global', Icon: Cake },
  { id: 'pastry-slice', label: 'Pastries & Tarts', shortLabel: 'Pastry', group: 'global', Icon: CakeSlice },
  { id: 'cookie-jar', label: 'Cookies & Biscuits', shortLabel: 'Cookies', group: 'global', Icon: Cookie },
  { id: 'donut-glaze', label: 'Donuts & Bagels', shortLabel: 'Donuts', group: 'global', Icon: Donut },
  { id: 'ice-cream-bowl', label: 'Gelato & Sundaes', shortLabel: 'Gelato', group: 'global', Icon: IceCreamBowl },
  { id: 'lollipop-treat', label: 'Kids Menu & Treats', shortLabel: 'Kids', group: 'global', Icon: Lollipop },
  { id: 'popcorn-snacks', label: 'Movie Bites & Fries', shortLabel: 'Bites', group: 'global', Icon: Popcorn },
  { id: 'iced-soda', label: 'Shakes & Sodas', shortLabel: 'Shakes', group: 'global', Icon: CupSoda },
  { id: 'sparkling-water', label: 'Artisan Infusions', shortLabel: 'Water', group: 'global', Icon: GlassWater },
  { id: 'mocktail-martini', label: 'Mocktails & Bar', shortLabel: 'Mocktail', group: 'global', Icon: Martini },
  { id: 'wine-glass', label: 'Wine & Cellar', shortLabel: 'Wine', group: 'global', Icon: Wine },
  { id: 'reserve-bottle', label: 'Reserve Bottles', shortLabel: 'Reserve', group: 'global', Icon: BottleWine },
  { id: 'craft-beer', label: 'Craft Brews', shortLabel: 'Brews', group: 'global', Icon: Beer },
  { id: 'hops-taps', label: 'Seasonal Taps', shortLabel: 'Taps', group: 'global', Icon: Hop },
  { id: 'fresh-apple', label: 'Fresh Fruits & Bowls', shortLabel: 'Fruits', group: 'global', Icon: Apple },
  { id: 'berry-cherry', label: 'Berry Smoothies', shortLabel: 'Berries', group: 'global', Icon: Cherry },
  { id: 'grape-vine', label: 'Fresh Juices', shortLabel: 'Juices', group: 'global', Icon: Grape },
  { id: 'seasonal-mint', label: 'Festive Specials', shortLabel: 'Festive', group: 'global', Icon: CandyCane },
  { id: 'chef-award', label: 'Chef Specials', shortLabel: 'Specials', group: 'global', Icon: Award },
  { id: 'top-rated-star', label: 'Top Picks', shortLabel: 'Top Picks', group: 'global', Icon: Star },
  { id: 'combo-deals', label: 'Value Combos', shortLabel: 'Combos', group: 'global', Icon: Tag },
];

const OPTION_BY_ID = new Map<string, CategoryIconOption>(
  CATEGORY_ICON_OPTIONS.map((opt) => [opt.id, opt])
);

const BUILT_IN_ICON_BY_CATEGORY: Record<string, { Icon: LucideIcon; label: string }> = {
  All: { Icon: UtensilsCrossed, label: 'All Dishes (Default)' },
  Starters: { Icon: Flame, label: 'Starters Flame (Default)' },
  Soups: { Icon: Soup, label: 'Hot Soup Bowl (Default)' },
  'Main Course': { Icon: Utensils, label: 'Main Course Platter (Default)' },
  Pizzas: { Icon: Pizza, label: 'Stone-Baked Pizza (Default)' },
  Burgers: { Icon: Hamburger, label: 'Gourmet Burger (Default)' },
};

export function isCategoryImageUrl(value?: string | null): value is string {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/')
  );
}

export function sanitizeCategoryImageUrlInput(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function getCategoryIconLabel(customIconId?: string, category?: string): string {
  if (isCategoryImageUrl(customIconId)) {
    return 'Custom Image Logo';
  }
  if (customIconId && OPTION_BY_ID.has(customIconId)) {
    return OPTION_BY_ID.get(customIconId)!.label;
  }
  if (category && BUILT_IN_ICON_BY_CATEGORY[category]) {
    return BUILT_IN_ICON_BY_CATEGORY[category].label;
  }
  return 'Default Dining Icon';
}

export interface RenderCategoryLogoOptions {
  color?: string;
  sizeClass?: string;
  imageClassName?: string;
  strokeWidth?: number;
  customIconId?: string;
}

export function renderCategoryLogo(
  category: string,
  options: RenderCategoryLogoOptions = {}
): React.ReactNode {
  const {
    color = 'currentColor',
    sizeClass = 'w-5 h-5',
    imageClassName = 'w-8 h-8 rounded-xl object-cover',
    strokeWidth = 1.85,
    customIconId,
  } = options;

  if (isCategoryImageUrl(customIconId)) {
    return React.createElement('img', {
      src: customIconId,
      alt: `${category} category logo`,
      className: imageClassName,
      loading: 'lazy',
      decoding: 'async',
    });
  }

  let IconComponent: LucideIcon = Utensils;
  if (customIconId && OPTION_BY_ID.has(customIconId)) {
    IconComponent = OPTION_BY_ID.get(customIconId)!.Icon;
  } else if (BUILT_IN_ICON_BY_CATEGORY[category]) {
    IconComponent = BUILT_IN_ICON_BY_CATEGORY[category].Icon;
  } else if (category.toLowerCase().includes('fav') || category.toLowerCase().includes('love')) {
    IconComponent = Heart;
  }

  return React.createElement(IconComponent, {
    className: sizeClass,
    color,
    strokeWidth,
    'aria-hidden': true,
  });
}
