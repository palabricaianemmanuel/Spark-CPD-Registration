import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame
} from "framer-motion";

export const TheInfiniteGrid = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Use window mouse move so we don't have to capture events and block clicks on the form
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  const speedX = 0.5;
  const speedY = 0.5;

  useAnimationFrame(() => {
    const currentX = gridOffsetX.get();
    const currentY = gridOffsetY.get();
    gridOffsetX.set((currentX + speedX) % 40);
    gridOffsetY.set((currentY + speedY) % 40);
  });

  const maskImage = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div className="fixed inset-0 min-h-screen w-full pointer-events-none z-0 overflow-hidden bg-slate-50">
      {/* Base faint grid */}
      <div className="absolute inset-0 z-0 opacity-[0.3]">
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </div>

      {/* Interactive mouse reveal grid */}
      <motion.div
        className="absolute inset-0 z-0 opacity-100"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} active />
      </motion.div>

      {/* Light theme glowing orbs matching SPARK branding */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute right-[-10%] top-[-10%] w-[50%] h-[50%] rounded-full bg-orange-400/30 blur-[120px]" />
        <div className="absolute left-[10%] top-[20%] w-[30%] h-[30%] rounded-full bg-yellow-400/20 blur-[100px]" />
        <div className="absolute left-[-10%] bottom-[-20%] w-[40%] h-[40%] rounded-full bg-orange-500/20 blur-[120px]" />
      </div>
    </div>
  );
};

const GridPattern = ({ offsetX, offsetY, active = false }: { offsetX: any, offsetY: any, active?: boolean }) => {
  return (
    <svg className="w-full h-full">
      <defs>
        <motion.pattern
          id={active ? "grid-pattern-active" : "grid-pattern"}
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="currentColor"
            strokeWidth={active ? "1.5" : "1"}
            className={active ? "text-orange-500" : "text-slate-200"}
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${active ? "grid-pattern-active" : "grid-pattern"})`} />
    </svg>
  );
};
