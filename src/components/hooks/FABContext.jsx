import React, { createContext, useContext, useState, useCallback } from 'react';

// CREATED 04-Feb-2026: Context for managing GlobalFAB buttons across pages
// Pages use setFabButtons to control what buttons appear in the FAB

const FABContext = createContext();

export const FABProvider = ({ children }) => {
    const [buttons, setButtons] = useState([]);

    // Pages will use this to "plug in" their buttons
    const setFabButtons = useCallback((newButtons) => {
        setButtons(newButtons);
    }, []);

    // Clear buttons when unmounting
    const clearFabButtons = useCallback(() => {
        setButtons([]);
    }, []);

    return (
        <FABContext.Provider value={{ buttons, setFabButtons, clearFabButtons }}>
            {children}
        </FABContext.Provider>
    );
};

export const useFAB = () => {
    const context = useContext(FABContext);
    if (!context) throw new Error("useFAB must be used within a FABProvider");
    return context;
};