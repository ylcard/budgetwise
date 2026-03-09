import React, { createContext, useContext, useState, useCallback } from "react";

// CREATED 04-Feb-2026: Context for managing GlobalFAB buttons across pages
// Pages use setFabButtons to control what buttons appear in the FAB

const FABContext = createContext();

export const FABProvider = ({ children }) => {
    const [registry, setRegistry] = useState({});

    const registerButton = useCallback((id, config) => {
        setRegistry((prev) => ({ ...prev, [id]: config }));
    }, []);

    const unregisterButton = useCallback((id) => {
        setRegistry((prev) => {
            const newRegistry = { ...prev };
            delete newRegistry[id];
            return newRegistry;
        });
    }, []);

    // Convert registry object to sorted array for the FAB UI
    const buttons = React.useMemo(() => {
        return Object.values(registry).sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [registry]);

    return (
        <FABContext.Provider value={{ buttons, registerButton, unregisterButton }}>
            {children}
        </FABContext.Provider>
    );
};

export const useFAB = () => {
    const context = useContext(FABContext);
    if (!context) throw new Error("useFAB must be used within a FABProvider");
    return context;
};