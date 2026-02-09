import { useState, useEffect, useRef } from "react";

export function useAutoHeight() {
    const [height, setHeight] = useState("auto");
    const ref = useRef(null);

    useEffect(() => {
        if (!ref.current) return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                // We set the height to the scrollHeight to capture 
                // the full internal height of the component
                setHeight(entry.target.scrollHeight);
            }
        });

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return { ref, style: { height, transition: "height 0.5s ease-in-out" } };
}
