import { useEffect, useRef } from "react";

type AshParticle = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
};

export default function AshParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const canvasEl = canvas;
    const context = ctx;

    let animationFrameId = 0;
    let particles: AshParticle[] = [];

    function resize() {
      canvasEl.width = window.innerWidth;
      canvasEl.height = window.innerHeight;
      particles = Array.from({ length: 80 }).map(() => createParticle());
    }

    function createParticle(): AshParticle {
      return {
        x: Math.random() * canvasEl.width,
        y: canvasEl.height + Math.random() * 200,
        r: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.8 - 0.2,
        alpha: Math.random() * 0.5 + 0.2,
        life: Math.random() * 0.005 + 0.001,
      };
    }

    function render() {
      context.clearRect(0, 0, canvasEl.width, canvasEl.height);

      particles.forEach((particle, index) => {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        context.shadowBlur = 10;
        context.shadowColor = `rgba(209, 168, 91, ${particle.alpha})`;
        context.fillStyle = `rgba(209, 168, 91, ${particle.alpha})`;
        context.fill();
        context.shadowBlur = 0;

        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.alpha -= particle.life;

        if (particle.y < -10 || particle.alpha <= 0) {
          particles[index] = createParticle();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    }

    resize();
    render();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="ash-canvas" aria-hidden="true" />;
}
