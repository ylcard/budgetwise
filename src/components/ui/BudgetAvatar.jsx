import { useEffect, useRef } from "react";

export const BudgetAvatar = ({ health = 0.8 }) => { // 0.0 to 1.0 (1.0 = healthy)
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let t = 0;

    const render = () => {
      t += 0.02; // Speed
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 60;
      
      // Dynamic Color: Green (healthy) -> Red (unhealthy)
      const r = Math.floor(255 * (1 - health));
      const g = Math.floor(255 * health);
      ctx.fillStyle = `rgba(${r}, ${g}, 100, 0.6)`;
      
      ctx.beginPath();
      for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
        // Blob Logic: Noise based on health. Lower health = Spikier
        const noise = Math.sin(angle * 5 + t) * Math.cos(angle * 3 + t);
        const turbulence = (1.1 - health) * 20; 
        const radius = baseRadius + (noise * turbulence) + (Math.sin(t) * 5); // Breathing

        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        if (angle === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      
      // Glow
      ctx.shadowBlur = 20;
      ctx.shadowColor = `rgba(${r}, ${g}, 100, 0.8)`;
      
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [health]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-xl">
       <canvas ref={canvasRef} width={200} height={200} />
       <p className="text-slate-400 text-sm mt-2">Budget Health</p>
    </div>
  );
};
