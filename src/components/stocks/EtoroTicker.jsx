import { useEtoroSocket } from '../hooks/useEtoroSocket';

export default function EtoroTicker() {
  // Use the hook here!
  const { price, status } = useEtoroSocket();

  return (
    <div className="stock-card">
      <h3>eToro Live Feed</h3>
      
      {/* Show Status Color */}
      <div style={{ color: status === 'Live' ? 'green' : 'red' }}>
        ● {status}
      </div>

      {/* Show Price */}
      <div className="price-display">
        {price ? `$${price}` : "Waiting for updates..."}
      </div>
    </div>
  );
}
