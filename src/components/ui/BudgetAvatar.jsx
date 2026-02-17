import { useEffect, useRef } from "react";

export const BudgetAvatar = ({ health = 0.5 }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let animationFrameId;
        let frame = 0;

        // Thriving Animation State
        let phase = 'launch'; // launch -> explode -> fall -> reform -> exit
        let particles = [];
        let trails = [];
        let ghostY = canvas.height + 50; // Start off-screen bottom (Dynamic)
        let ghostAlpha = 1;
        let ghostRotation = 0;

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
            let yOffset = 0; // Relative offset for normal animations
            let overrideY = null; // Absolute position for thriving animation
            let overrideColor = null;

            if (isDead) {
                // --- DEAD: Glitch & Disintegrate ---
                const cycle = frame % 300;

                if (cycle < 150) {
                    // Normal Float
                    yOffset = Math.sin(frame * 0.1) * 5; // Float
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

                // --- THRIVING: PRIDE PARADE MODE --- 		
                // 1. LAUNCH (Shoots up with Rainbow Trail)
                if (phase === 'launch') {
                    ghostY -= 7; // Slower, more majestic ascent
                    squashX = 0.7; squashY = 1.5; // Extreme stretch
                    // Super Fast Rainbow Cycle
                    overrideColor = `hsl(${frame * 25}, 100%, 60%)`;

                    // Add Rainbow Trail
                    trails.push({ x: centerX, y: ghostY + 50, color: overrideColor, size: 25 });
                    if (trails.length > 20) trails.shift();

                    // Draw Trail
                    trails.forEach((t, i) => {
                        ctx.beginPath();
                        ctx.fillStyle = t.color;
                        const s = t.size * (i / trails.length);
                        ctx.arc(t.x + (Math.sin(frame * 0.8 + i) * 10), t.y, s, 0, Math.PI * 2);
                        ctx.fill();
                    });

                    if (ghostY < height * 0.25) phase = 'explode'; // Explode at 25% height
                }

                // 2. EXPLODE (Glitter Bomb)
                else if (phase === 'explode') {
                    alpha = 0; // Hide Ghost
                    // Spawn MASSIVE amount of particles (Sparks)
                    if (particles.length === 0) {
                        for (let i = 0; i < 100; i++) {
                            particles.push({
                                x: centerX,
                                y: ghostY,
                                vx: (Math.random() - 0.5) * 50, // WIDER EXPLOSION (Range)
                                vy: (Math.random() - 0.5) * 50 - 10, // Higher jump
                                color: `hsl(${Math.random() * 360}, 100%, 60%)`,
                                life: 1.0,
                                type: 'spark' // All sparks for fireworks look
                            });
                        }
                    }
                    trails = []; // Clear trail
                    phase = 'fall';
                }

                // 3. FALL (Slow Motion Sparks)
                else if (phase === 'fall') {
                    alpha = 0; // Ghost still hidden
                    let activeParticles = 0;
                    particles.forEach(p => {
                        // Move slower (0.6 multiplier) for "Grand" feeling
                        p.x += p.vx * 0.5; // SLOW MOTION FACTOR (Lower = Slower)
                        p.y += p.vy * 0.5;

                        // Physics
                        p.vy += 0.15; // Very Low Gravity (Floaty)
                        p.vx *= 0.95; // Air resistance
                        p.life -= 0.008; // Very Slow fade

                        if (p.life > 0) activeParticles++;

                        // Draw Particle
                        ctx.save();
                        ctx.fillStyle = p.color;

                        // Draw THIN SPARK (Line segment based on velocity)
                        ctx.lineWidth = 1.5;
                        ctx.lineCap = "round";
                        ctx.strokeStyle = p.color;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        // Trail behind the particle to make it look like a spark
                        ctx.lineTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5);
                        ctx.stroke();
                        ctx.restore();
                    });

                    // Transition when particles hit bottom
                    if (particles.every(p => p.y > height || p.life <= 0)) {
                        phase = 'reform';
                        ghostY = height - 60; // Float near bottom
                        ghostAlpha = 0;
                        ghostRotation = 0;
                        particles = []; // Clear
                    }
                }

                // 4. REFORM (Spin in with style)
                else if (phase === 'reform') {
                    ghostAlpha += 0.05;
                    alpha = Math.min(1, ghostAlpha);
                    ghostRotation = (1 - alpha) * 360; // Twirl in
                    overrideColor = `hsl(${frame * 5}, 100%, 60%)`; // Gentle rainbow pulse

                    if (alpha >= 1) {
                        // Pause briefly then exit
                        if (frame % 60 === 0) phase = 'exit';
                    }
                }

                // 5. EXIT (Drop down)
                else if (phase === 'exit') {
                    ghostY += 5;
                    if (ghostY > height + 100) {
                        phase = 'launch'; // RESET LOOP
                        ghostY = height + 100;
                    }
                }

                overrideY = ghostY;
            } else {
                // --- NORMAL: Calm Floating ---
                bounce = Math.sin(frame * 0.05) * 5;
            }

            const xPos = centerX + shakeX + glitchOffset;
            // Use overrideY if we are in thriving animation, otherwise standard calculation
            const yPos = overrideY !== null ? overrideY : (centerY + bounce + yOffset);

            // --- COLOR ---
            let color = "#3b82f6"; // Blue (Normal)
            if (isThriving) color = overrideColor || "#10b981"; // Emerald or Rainbow
            else if (isCritical) color = "#f43f5e"; // Rose
            else if (isDead) color = "#94a3b8"; // Slate

            // --- DRAW GHOST BODY ---
            ctx.save();
            ctx.globalAlpha = alpha; // Apply fade for disintegration
            ctx.translate(xPos, yPos);
            if (isThriving && phase === 'reform') ctx.rotate((ghostRotation * Math.PI) / 180);
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
                // Heart Eyes <3 <3
                ctx.fillStyle = "#ec4899"; // Pink
                ctx.beginPath();
                const drawHeart = (ox, oy) => {
                    const size = 8;
                    ctx.moveTo(ox, oy + size * 0.3);
                    ctx.bezierCurveTo(ox - size, oy - size, ox - size * 1.5, oy - size * 0.5, ox, oy + size * 0.5);
                    ctx.bezierCurveTo(ox + size * 1.5, oy - size * 0.5, ox + size, oy - size, ox, oy + size * 0.3);
                };
                drawHeart(-15, -5);
                drawHeart(15, -5);
                ctx.fill();

                // Big Smile
                ctx.strokeStyle = "white";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(0, 5, 12, 0.2, Math.PI - 0.2);
                ctx.stroke();

                // Blush
                ctx.fillStyle = "rgba(236, 72, 153, 0.5)"; // Pink Blush
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
        if (health >= 0.8) return "FABULOUS ✨";
        if (health >= 0.4) return "Chilling";
        if (health >= 0.15) return "Panicking";
        return "RIP 💀";
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-xl border border-slate-800 transition-colors duration-500 w-full overflow-hidden">
            {/* Canvas Resolution increased and set to w-full to fill container */}
            <canvas ref={canvasRef} width={400} height={350} className="w-full h-auto max-w-[400px]" />
            <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest transition-all">
                {getStatusText()}
            </p>
        </div>
    );
};