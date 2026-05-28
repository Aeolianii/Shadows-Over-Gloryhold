import { useEffect, useRef } from 'react';

export default function AshParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number, y: number, r: number, vx: number, vy: number, alpha: number, life: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    for(let i=0; i<80; i++) {
        particles.push(createParticle(canvas));
    }

    function createParticle(canvas: HTMLCanvasElement) {
        return {
            x: Math.random() * canvas.width,
            y: canvas.height + Math.random() * 200,
            r: Math.random() * 2 + 0.5,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -Math.random() * 0.8 - 0.2,
            alpha: Math.random() * 0.5 + 0.2,
            life: Math.random() * 0.005 + 0.001
        };
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, index) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        
        // Soft glowing particle
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(209, 168, 91, ${p.alpha})`;
        ctx.fillStyle = `rgba(209, 168, 91, ${p.alpha})`;
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.life;

        if (p.y < -10 || p.alpha <= 0) {
          particles[index] = createParticle(canvas);
        }
      });
      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0 opacity-60"
    />
  );
}
