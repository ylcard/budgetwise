import { useEffect, useRef } from "react";

export const BudgetAvatar = ({ health = 0.5 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let frame = 0;

    const render = () => {
      frame++;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // --- STATE LOGIC ---
      const isDead = health < 0.2;
      const isCritical = health >= 0.2 && health < 0.5;
      
      // --- ANIMATION VARIABLES ---
      // Bounce speed depends on health (Hyper when healthy, sluggish when sick)
      const bounce = isDead ? 0 : Math.sin(frame * 0.05) * 5; 
      
      // Ghost float effect
      const ghostY = isDead ? (frame % 200) * -0.5 + 20 : 0; 
      
      // Shake effect for Critical state
      const shakeX = isCritical ? (Math.random() - 0.5) * 3 : 0;
      
      // Base Position
      const yPos = centerY + bounce + ghostY + (isDead ? 20 : 0);
      const xPos = centerX + shakeX;

      // --- COLOR ---
      let color = "#10b981"; // Green
      if (isCritical) color = "#f43f5e"; // Red
      if (isDead) color = "#94a3b8"; // Gray (Ghost)

      // --- BODY ---
      ctx.fillStyle = color;
      ctx.beginPath();
      // Draw a "blob" body
      if (isDead) {
        // Ghost shape (wavy bottom)
        ctx.arc(xPos, yPos, 40, Math.PI, 0);
        ctx.lineTo(xPos + 40, yPos + 60);
        ctx.lineTo(xPos + 20, yPos + 50);
        ctx.lineTo(xPos, yPos + 60);
        ctx.lineTo(xPos - 20, yPos + 50);
        ctx.lineTo(xPos - 40, yPos + 60);
        ctx.lineTo(xPos - 40, yPos);
      } else {
        // Normal Circle
        ctx.arc(xPos, yPos, 40, 0, Math.PI * 2);
      }
      ctx.fill();

      // --- SHADOW (Only if not dead/floating) ---
      if (!isDead) {
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath();
        // Shadow scales with bounce
        const shadowScale = 1 - (bounce / 20);
        ctx.ellipse(xPos, centerY + 50, 20 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- EYES ---
      ctx.fillStyle = "white";
      ctx.strokeStyle = "white";
      ctx.lineWidth = 3;

      if (isDead) {
        // X X Eyes
        const drawX = (ox, oy) => {
          ctx.beginPath();
          ctx.moveTo(ox - 5, oy - 5);
          ctx.lineTo(ox + 5, oy + 5);
          ctx.moveTo(ox + 5, oy - 5);
          ctx.lineTo(ox - 5, oy + 5);
          ctx.stroke();
        };
        drawX(xPos - 15, yPos - 5);
        drawX(xPos + 15, yPos - 5);
      } else {
        // Normal Eyes
        const eyeOffset = isCritical ? 0 : Math.sin(frame * 0.1) * 2; // Eyes look around if happy
        ctx.beginPath();
        ctx.arc(xPos - 15 + eyeOffset, yPos - 5, 8, 0, Math.PI * 2);
        ctx.arc(xPos + 15 + eyeOffset, yPos - 5, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(xPos - 15 + eyeOffset, yPos - 5, 3, 0, Math.PI * 2);
        ctx.arc(xPos + 15 + eyeOffset, yPos - 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- MOUTH ---
      ctx.strokeStyle = isDead ? "white" : "black";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (isDead) {
        // O mouth (Ghost moan)
        ctx.ellipse(xPos, yPos + 15, 3, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (isCritical) {
        // Wavy mouth (worried)
        ctx.moveTo(xPos - 10, yPos + 15);
        ctx.lineTo(xPos - 5, yPos + 12);
        ctx.lineTo(xPos, yPos + 15);
        ctx.lineTo(xPos + 5, yPos + 12);
        ctx.lineTo(xPos + 10, yPos + 15);
        ctx.stroke();
        
        // Sweat drop
        if (frame % 60 < 40) {
            ctx.fillStyle = "#38bdf8";
            ctx.beginPath();
            ctx.arc(xPos + 35, yPos - 20 + (frame % 20), 4, 0, Math.PI * 2);
            ctx.fill();
        }
      } else {
        // Smile
        ctx.arc(xPos, yPos + 10, 15, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [health]);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-xl border border-slate-800">
       <canvas ref={canvasRef} width={200} height={200} />
       <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">
           {health < 0.2 ? "Budget Status: RIP" : health < 0.5 ? "Budget Status: Panicking" : "Budget Status: Chilled"}
       </p>
    </div>
  );
};