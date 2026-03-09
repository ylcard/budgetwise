import { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Context for managing GlobalFAB buttons via a Registry pattern.
// Components use <FABAction /> to register themselves automatically.

const FABContext = createContext();

export const FABProvider = ({ children }) => {
    const [registry, setRegistry] = useState({});

    // Register a button configuration (upsert)
    const registerButton = useCallback((id, config) => {
        setRegistry((prev) => ({ ...prev, [id]: { ...config, id } }));
    }, []);

    // Remove a button by ID
    const unregisterButton = useCallback((id) => {
        setRegistry((prev) => {
            const newRegistry = { ...prev };
            delete newRegistry[id];
            return newRegistry;
        });
    }, []);

    // Flatten registry to array and sort by order
    const buttons = useMemo(() => {
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