import { useState, useEffect } from 'react';

export const useEtoroData = () => {
    const [positions, setPositions] = useState([]);
    const [status, setStatus] = useState("Disconnected");
    const [totalValue, setTotalValue] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            setStatus("Syncing...");
            try {
                // 1. Fetch Portfolio Snapshot
                const res = await fetch('/functions/etoro/portfolio');
                
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`Server responded with ${res.status}: ${text.substring(0, 50)}`);
                }

                const data = await res.json();

                // 2. Parse Data (Adjust based on actual JSON response from eToro)
                // Assuming data structure: { positions: [{ InstrumentDisplayName: 'Tesla', Amount: 100, Profit: 5 }] }
                if (data && data.positions) {
                    setPositions(data.positions);

                    // Calculate total if not provided
                    const total = data.positions.reduce((acc, pos) => acc + (pos.Amount || 0), 0);
                    setTotalValue(total);
                    setStatus("Live");
                } else {
                    // Fallback for demo/empty
                    console.warn("eToro data format unexpected:", data);
                    setStatus("Empty");
                }

            } catch (e) {
                console.error("eToro Fetch Error:", e);
                setStatus("Error");
            }
        };

        fetchData();
        // Poll every 30 seconds for updates (WebSockets are complex for full portfolio)
        const interval = setInterval(fetchData, 30000);

        return () => clearInterval(interval);
    }, []);

    return { positions, status, totalValue };
};