import {
    Circle, Home, ShoppingCart, Coffee, Car, Plane, Utensils, Shirt, Heart, Zap,
    Gift, Music, Dumbbell, Book, Briefcase, DollarSign, CreditCard, Wallet,
    PiggyBank, Laptop, Smartphone, Tv, Pizza, Fuel, Bus, HandCoins, Beer,
    Popcorn, Gamepad2, Wifi, Droplets, Podcast, Hotel, Banknote, Cross, Pill, Guitar,
    Drama, Cat, ShoppingBasket, Store, CarTaxiFront, House, CircleQuestionMark, Landmark,
    Sandwich, Hamburger, BicepsFlexed, Scissors, SmartphoneNfc, GraduationCap
} from "lucide-react";

// Central icon map - single source of truth for all category icons
export const iconMap = {
    Circle, Home, ShoppingCart, Coffee, Car, Plane, Utensils, Shirt, Heart, Zap, Gift, Music,
    Dumbbell, Book, Briefcase, DollarSign, CreditCard, Wallet, PiggyBank, Laptop, Smartphone,
    Tv, Pizza, Fuel, Bus, HandCoins, Beer, Popcorn, Gamepad2, Wifi, Droplets, Podcast, Hotel, Banknote,
    Cross, Pill, Guitar, Drama, Cat, ShoppingBasket, Store, CarTaxiFront, House, CircleQuestionMark, Landmark,
    Sandwich, Hamburger, BicepsFlexed, Scissors, SmartphoneNfc, GraduationCap
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
    { value: 'House', label: 'Home Maintenance', tags: ['repair', 'renovation', 'garden'] },
    { value: 'ShoppingCart', label: 'Groceries', tags: ['food', 'supermarket', 'shop'] },
    { value: 'ShoppingBasket', label: 'Errands', tags: ['small', 'shop', 'convenience'] },
    { value: 'Coffee', label: 'Coffee', tags: ['cafe', 'drink', 'morning', 'breakfast'] },
    { value: 'Car', label: 'Car', tags: ['auto', 'drive', 'transport'] },
    { value: 'CarTaxiFront', label: 'Taxi/Rideshare', tags: ['uber', 'cabify', 'lyft', 'cab'] },
    { value: 'Fuel', label: 'Fuel', tags: ['gas', 'petrol', 'station'] },
    { value: 'Bus', label: 'Public Transport', tags: ['metro', 'train', 'commute'] },
    { value: 'Plane', label: 'Travel', tags: ['flight', 'vacation', 'trip'] },
    { value: 'Utensils', label: 'Dining Out', tags: ['restaurant', 'eat', 'dinner', 'lunch'] },
    { value: 'Beer', label: 'Alcohol', tags: ['drink', 'bar', 'party', 'wine', 'beer'] },
    { value: 'Pizza', label: 'Fast Food', tags: ['delivery', 'eat', 'snack'] },
    { value: 'Shirt', label: 'Clothing', tags: ['shopping', 'apparel', 'fashion'] },
    { value: 'Store', label: 'Shopping', tags: ['retail', 'mall', 'buy', 'stuff'] },
    { value: 'Heart', label: 'Health', tags: ['medical', 'doctor', 'care'] },
    { value: 'Cross', label: 'Hospital', tags: ['emergency', 'medical', 'doctor'] },
    { value: 'Pill', label: 'Pharmacy', tags: ['medicine', 'drug', 'prescription'] },
    { value: 'Zap', label: 'Utilities', tags: ['electricity', 'power', 'bill'] },
    { value: 'Wifi', label: 'Internet', tags: ['connection', 'web', 'phone'] },
    { value: 'Droplets', label: 'Water', tags: ['bill', 'utilities'] },
    { value: 'Laptop', label: 'Tech', tags: ['computer', 'electronics', 'software'] },
    { value: 'Smartphone', label: 'Mobile', tags: ['phone', 'bill', 'app'] },
    { value: 'Gift', label: 'Gifts', tags: ['present', 'donation', 'charity'] },
    { value: 'Music', label: 'Music', tags: ['spotify', 'concert', 'audio'] },
    { value: 'Guitar', label: 'Hobbies', tags: ['instrument', 'class', 'art'] },
    { value: 'Podcast', label: 'Podcast', tags: ['audio', 'subscription'] },
    { value: 'Tv', label: 'TV/Streaming', tags: ['netflix', 'movies', 'subscription'] },
    { value: 'Gamepad2', label: 'Gaming', tags: ['games', 'steam', 'xbox', 'playstation'] },
    { value: 'Dumbbell', label: 'Fitness', tags: ['gym', 'sports', 'workout'] },
    { value: 'Briefcase', label: 'Work', tags: ['business', 'office', 'job'] },
    { value: 'DollarSign', label: 'Income', tags: ['salary', 'money'] },
    { value: 'HandCoins', label: 'Fees/Charges', tags: ['tax', 'bank', 'fine'] },
    { value: 'PiggyBank', label: 'Savings', tags: ['invest', 'future'] },
    { value: 'CreditCard', label: 'Debt/Payment', tags: ['loan', 'credit', 'pay'] },
    { value: 'Wallet', label: 'General', tags: ['cash', 'spending', 'misc'] },
    { value: 'Hotel', label: 'Hotel', tags: ['stay', 'airbnb', 'travel'] },
    { value: 'CircleQuestionMark', label: 'Uncategorized', tags: ['idk', 'uncategorized', '?'] },
    { value: 'Landmark', label: 'Cultural', tags: ['museum', 'culture', 'theater', 'art'] },
    { value: 'Hamburger', label: 'Takeaway', tags: ['takeaway', 'just', 'eat', 'justeat', 'glovo'] },
    { value: 'Sandwich', label: 'Work Lunch', tags: ['work', 'work lunch', 'lunch'] },
    { value: 'BicepsFlexed', label: 'Personal Care', tags: ['perfume', 'personal care', 'groom'] },
    { value: 'Scissors', label: 'Haircut', tags: ['hair', 'haircut'] },
    { value: 'SmartphoneNfc', label: 'Transfer', tags: ['bizum', 'transfer'] },
    { value: 'GraduationCap', label: 'Education', tags: ['education', 'study', 'student', 'school'] },
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

// Heuristic to guess icon based on name
export const suggestIconForCategory = (name) => {
    if (!name) return 'Circle';

    const normalize = (str) => str.toLowerCase().trim();
    const search = normalize(name);

    // 1. Exact Name Match (in options)
    const exact = ICON_OPTIONS.find(opt => normalize(opt.label) === search);
    if (exact) return exact.value;

    // 2. Tag Match (exact word in tag)
    const tagMatch = ICON_OPTIONS.find(opt =>
        opt.tags.some(tag => search.includes(normalize(tag)))
    );
    if (tagMatch) return tagMatch.value;

    // 3. Partial Name Match
    const partial = ICON_OPTIONS.find(opt => normalize(opt.label).includes(search));
    if (partial) return partial.value;

    return 'Circle'; // Default
};
