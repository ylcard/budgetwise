import { useState, useEffect } from 'react';

export const useEtoroData = () => {
  const [price, setPrice] = useState(null);
  const [status, setStatus] = useState("Disconnected");

  useEffect(() => {
    const connect = async () => {
      setStatus("Connecting...");
      try {
        // Call your Base44 backend function to get the token
        const res = await fetch('/api/etoro-auth');
        const { access_token } = await res.json();

        // Connect to eToro
        const ws = new WebSocket(`wss://api-portal.etoro.com/feed?access_token=${access_token}`);
        
        ws.onopen = () => setStatus("Live");
        ws.onmessage = (e) => {
          const data = JSON.parse(e.data);
          // eToro data structure varies, adjust 'price' access as needed
          if (data.price) setPrice(data.price); 
        };
      } catch (e) {
        setStatus("Error");
      }
    };
    connect();
  }, []);

  return { price, status };
};
