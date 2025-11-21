import { 
  Circle, Home, ShoppingCart, Coffee, Car, Plane, Utensils, Shirt, Heart, Zap, 
  Gift, Music, Dumbbell, Book, Briefcase, DollarSign, CreditCard, Wallet, 
  PiggyBank, Laptop, Smartphone, Tv, Pizza, Fuel, Bus, HandCoins, Beer, 
  Popcorn, Gamepad2, Wifi, Droplets, Podcast, Hotel, Banknote, Cross, Pill, Guitar,
  Drama, Cat 
} from "lucide-react";

// Central icon map - single source of truth for all category icons
export const iconMap = {
  Circle, Home, ShoppingCart, Coffee, Car, Plane, Utensils, Shirt, Heart, Zap, Gift, Music, 
  Dumbbell, Book, Briefcase, DollarSign, CreditCard, Wallet, PiggyBank, Laptop, Smartphone, 
  Tv, Pizza, Fuel, Bus, HandCoins, Beer, Popcorn, Gamepad2, Wifi, Droplets, Podcast, Hotel, Banknote
};

// Popular icons list for category creation
export const POPULAR_ICONS = [
  'Home', 'ShoppingCart', 'Coffee', 'Car', 'Plane', 'Utensils',
  'Shirt', 'Heart', 'Zap', 'Gift', 'Music', 'Dumbbell',
  'Book', 'Briefcase', 'DollarSign', 'CreditCard', 'Wallet', 'PiggyBank',
  'Laptop', 'Smartphone', 'Tv', 'Pizza', 'Fuel', 'Bus',
  'HandCoins', 'Beer', 'Popcorn', 'Gamepad2', 'Wifi', 'Droplets', 
  'Podcast', 'Hotel'
];

/**
 * Safely retrieves an icon component from the map.
 * Returns 'Circle' as a default fallback if the key is missing or invalid.
 * @param {string} iconName - The string key stored in the DB
 * @returns {React.Component} - The Lucide Icon Component
 */
export const getCategoryIcon = (iconName) => {
  if (iconName && iconMap[iconName]) {
    return iconMap[iconName];
  }
  return Circle;
};
