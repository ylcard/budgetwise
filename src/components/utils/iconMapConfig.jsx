import {
    Circle, Home, ShoppingCart, Coffee, Car, Plane, Utensils, Shirt, Heart, Zap,
    Gift, Music, Dumbbell, Book, Briefcase, DollarSign, CreditCard, Wallet,
    PiggyBank, Laptop, Smartphone, Tv, Pizza, Fuel, Bus, HandCoins, Beer,
    Popcorn, Gamepad2, Wifi, Droplets, Podcast, Hotel, Banknote
} from "lucide-react";

// Central icon map - single source of truth for all category icons
export const iconMap = {
    Circle, Home, ShoppingCart, Coffee, Car, Plane, Utensils, Shirt, Heart, Zap, Gift, Music,
    Dumbbell, Book, Briefcase, DollarSign, CreditCard, Wallet, PiggyBank, Laptop, Smartphone,
    Tv, Pizza, Fuel, Bus, HandCoins, Beer, Popcorn, Gamepad2, Wifi, Droplets, Podcast, Hotel, Banknote
};

// Legacy support if needed, but we prefer ICON_OPTIONS now
export const POPULAR_ICONS = [
    'Home', 'ShoppingCart', 'Coffee', 'Car', 'Plane', 'Utensils',
    'Shirt', 'Heart', 'Zap', 'Gift', 'Music', 'Dumbbell',
    'Book', 'Briefcase', 'DollarSign', 'CreditCard', 'Wallet', 'PiggyBank',
    'Laptop', 'Smartphone', 'Tv', 'Pizza', 'Fuel', 'Bus',
    'HandCoins', 'Beer', 'Popcorn', 'Gamepad2', 'Wifi', 'Droplets',
    'Podcast', 'Hotel', 'Banknote'
];

// Rich metadata for the searchable dropdown
export const ICON_OPTIONS = [
    { value: 'Home', label: 'Housing', tags: ['rent', 'mortgage', 'home', 'apartment'] },
    { value: 'ShoppingCart', label: 'Groceries', tags: ['food', 'supermarket', 'shop'] },
    { value: 'Coffee', label: 'Coffee', tags: ['cafe', 'drink', 'morning', 'breakfast'] },
    { value: 'Car', label: 'Car', tags: ['auto', 'drive', 'transport'] },
    { value: 'Fuel', label: 'Fuel', tags: ['gas', 'petrol', 'station'] },
    { value: 'Bus', label: 'Public Transport', tags: ['metro', 'train', 'commute'] },
    { value: 'Plane', label: 'Travel', tags: ['flight', 'vacation', 'trip'] },
    { value: 'Utensils', label: 'Dining Out', tags: ['restaurant', 'eat', 'dinner', 'lunch'] },
    { value: 'Beer', label: 'Alcohol', tags: ['drink', 'bar', 'party', 'wine'] },
    { value: 'Pizza', label: 'Fast Food', tags: ['delivery', 'eat', 'snack'] },
    { value: 'Shirt', label: 'Clothing', tags: ['shopping', 'apparel', 'fashion'] },
    { value: 'Heart', label: 'Health', tags: ['medical', 'doctor', 'care'] },
    { value: 'Pill', label: 'Pharmacy', tags: ['medicine', 'drug', 'prescription'] },
    { value: 'Zap', label: 'Utilities', tags: ['electricity', 'power', 'bill'] },
    { value: 'Wifi', label: 'Internet', tags: ['connection', 'web', 'phone'] },
    { value: 'Droplets', label: 'Water', tags: ['bill', 'utilities'] },
    { value: 'Gift', label: 'Gifts', tags: ['present', 'donation', 'charity'] },
    { value: 'Music', label: 'Music', tags: ['spotify', 'concert', 'audio'] },
    { value: 'Podcast', label: 'Podcast', tags: ['audio', 'subscription'] },
    { value: 'Tv', label: 'TV/Streaming', tags: ['netflix', 'movies', 'subscription'] },
    { value: 'Gamepad2', label: 'Gaming', tags: ['games', 'steam', 'xbox', 'playstation'] },
    { value: 'Dumbbell', label: 'Fitness', tags: ['gym', 'sports', 'workout'] },
    { value: 'Book', label: 'Education', tags: ['school', 'learning', 'course'] },
    { value: 'Briefcase', label: 'Work', tags: ['business', 'office', 'job'] },
    { value: 'DollarSign', label: 'Income', tags: ['salary', 'money'] },
    { value: 'PiggyBank', label: 'Savings', tags: ['invest', 'future'] },
    { value: 'Hotel', label: 'Hotel', tags: ['stay', 'airbnb', 'travel'] }
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
