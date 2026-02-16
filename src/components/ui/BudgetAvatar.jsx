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

            // --- STATE DETERMINATION ---
            const isDead = health < 0.15;
            const isCritical = health >= 0.15 && health < 0.4;
            const isNormal = health >= 0.4 && health < 0.8;
            const isThriving = health >= 0.8;

            // --- ANIMATION VARIABLES ---
            // Bounce speed depends on health (Hyper when healthy, sluggish when sick)
            // --- DEAD ANIMATION CYCLE (300 frames) ---
            // 0-150: Float
            // 150-200: Fall & Disintegrate
            // 200-300: Re-integrate (Fade in)

            let bounce = 0;
            let shakeX = 0;
            let squashX = 1;
            let squashY = 1;
            let alpha = 1;
            let glitchOffset = 0;
            let yOffset = 0;

            if (isDead) {
                // --- DEAD: Glitch & Disintegrate ---
                const cycle = frame % 300;

                if (cycle < 150) {
                    // Normal Float
                    yOffset = Math.sin(frame * 0.05) * 5; // Float
                } else if (cycle < 220) {
                    // Fall & Disintegrate
                    const progress = (cycle - 150) / 70; // 0 to 1
                    yOffset = progress * 50; // Fall
                    alpha = 1 - progress;   // Fade out
                    glitchOffset = Math.sin(frame * 0.5) * (progress * 10); // Shake increases
                } else {
                    // Re-integrate
                    const progress = (cycle - 220) / 80;
                    alpha = progress;
                    yOffset = (1 - progress) * -20;
                }
            } else if (isCritical) {
                // --- CRITICAL: Shaking & Sweating ---
                bounce = Math.sin(frame * 0.2) * 2; // Fast nervous bounce
                shakeX = (Math.random() - 0.5) * 3; // Tremble
            } else if (isThriving) {
                // --- THRIVING: Happy Bouncing ---
                const speed = 0.1;
                bounce = Math.sin(frame * speed) * 10;
                // Squash and stretch
                squashX = 1 + Math.cos(frame * speed) * 0.05;
                squashY = 1 + Math.sin(frame * speed) * -0.05;
                yOffset = -10; // Float higher
            } else {
                // --- NORMAL: Calm Floating ---
                bounce = Math.sin(frame * 0.05) * 5;
            }

            const xPos = centerX + shakeX + glitchOffset;
            const yPos = centerY + bounce + yOffset;

            // --- COLOR ---
            let color = "#3b82f6"; // Blue (Normal)
            if (isThriving) color = "#10b981"; // Emerald
            else if (isCritical) color = "#f43f5e"; // Rose
            else if (isDead) color = "#94a3b8"; // Slate

            // --- DRAW GHOST BODY ---
            ctx.save();
            ctx.globalAlpha = alpha; // Apply fade for disintegration
            ctx.translate(xPos, yPos);
            ctx.scale(squashX, squashY);
            ctx.translate(-xPos, -yPos);

            // Shadow (if visible)
            if (alpha > 0.5) {
                ctx.fillStyle = "rgba(0,0,0,0.2)";
                ctx.beginPath();
                const shadowSize = isThriving ? 15 : 20;
                ctx.ellipse(xPos, centerY + 60, shadowSize * (2 - squashY), 5, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = color;
            // GLITCH EFFECT (Slices)
            if (isDead && alpha < 0.9) {
                for (let i = 0; i < 80; i += 8) {
                    const sliceOffset = (Math.random() - 0.5) * (1 - alpha) * 30;
                    ctx.fillRect(xPos - 40 + sliceOffset, yPos - 40 + i, 80, 6);
                }

            } else {
                // STANDARD GHOST SHAPE
                ctx.beginPath();
                ctx.arc(xPos, yPos, 40, Math.PI, 0); // Head
                ctx.lineTo(xPos + 40, yPos + 60);    // Right side

                // Wavy Bottom
                ctx.quadraticCurveTo(xPos + 30, yPos + 50, xPos + 20, yPos + 60);
                ctx.quadraticCurveTo(xPos + 10, yPos + 50, xPos, yPos + 60);
                ctx.quadraticCurveTo(xPos - 10, yPos + 50, xPos - 20, yPos + 60);
                ctx.quadraticCurveTo(xPos - 30, yPos + 50, xPos - 40, yPos + 60);

                ctx.lineTo(xPos - 40, yPos);         // Left side
                ctx.fill();
            }
            ctx.restore();

            // --- EYES ---			
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(xPos, yPos + (bounce * 0.1)); // Face follows body slightly less

            ctx.fillStyle = "white";
            ctx.strokeStyle = "white";
            ctx.lineCap = "round";
            ctx.lineWidth = 3;

            if (isDead) {
                // X X Eyes
                const drawX = (ox, oy) => {
                    ctx.beginPath();
                    ctx.moveTo(ox - 6, oy - 6);
                    ctx.lineTo(ox + 6, oy + 6);
                    ctx.moveTo(ox + 6, oy - 6);
                    ctx.lineTo(ox - 6, oy + 6);
                    ctx.stroke();
                };
                drawX(-15, -5);
                drawX(15, -5);
                // O Mouth
                ctx.beginPath();
                ctx.arc(0, 15, 4, 0, Math.PI * 2);
                ctx.stroke();
            } else if (isCritical) {
                // Wide Eyes (Panic)
                ctx.beginPath();
                ctx.arc(-15, -5, 10, 0, Math.PI * 2);
                ctx.arc(15, -5, 10, 0, Math.PI * 2);
                ctx.fill();
                // Tiny pupils
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(-15, -5, 3, 0, Math.PI * 2);
                ctx.arc(15, -5, 3, 0, Math.PI * 2);
                ctx.fill();
                // Wavy Mouth
                ctx.beginPath();
                ctx.moveTo(-10, 15);
                ctx.quadraticCurveTo(-5, 10, 0, 15);
                ctx.quadraticCurveTo(5, 20, 10, 15);
                ctx.stroke();

                // Sweat Drop
                if (frame % 60 < 40) {
                    ctx.fillStyle = "#38bdf8";
                    ctx.beginPath();
                    ctx.arc(35, -15 + (frame % 20), 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (isThriving) {
                // Happy Arches ^ ^
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(-15, 0, 8, Math.PI, 0); // Left Arch
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(15, 0, 8, Math.PI, 0); // Right Arch
                ctx.stroke();

                // Big Smile
                ctx.beginPath();
                ctx.arc(0, 5, 12, 0.2, Math.PI - 0.2);
                ctx.stroke();

                // Blush
                ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
                ctx.beginPath();
                ctx.arc(-25, 10, 6, 0, Math.PI * 2);
                ctx.arc(25, 10, 6, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Normal Eyes
                ctx.beginPath();
                ctx.arc(-15, -5, 6, 0, Math.PI * 2);
                ctx.arc(15, -5, 6, 0, Math.PI * 2);
                ctx.fill();

                // Small Smile
                ctx.beginPath();
                ctx.arc(0, 10, 6, 0.2, Math.PI - 0.2);
                ctx.stroke();
            }

            ctx.restore();

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, [health]);

    const getStatusText = () => {
        if (health >= 0.8) return "Ascended";
        if (health >= 0.4) return "Chilling";
        if (health >= 0.15) return "Panicking";
        return "RIP 💀";
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-xl border border-slate-800 transition-colors duration-500">
            <canvas ref={canvasRef} width={200} height={200} />
            <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest transition-all">
                {getStatusText()}
            </p>
        </div>
    );
};