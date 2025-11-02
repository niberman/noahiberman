import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface WaypointProps {
  x: string;
  y: string;
  delay: number;
}

const Waypoint = ({ x, y, delay }: WaypointProps) => (
  <motion.circle
    cx={x}
    cy={y}
    r="4"
    className="fill-secondary"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay, duration: 0.5 }}
  >
    <animate
      attributeName="r"
      values="4;6;4"
      dur="2s"
      begin={`${delay}s`}
      repeatCount="indefinite"
    />
  </motion.circle>
);

export function FlightPath() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
      <svg
        className="w-full h-full"
        viewBox="0 0 1000 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main flight path */}
        <motion.path
          d="M 50 400 Q 250 100, 500 300 T 950 200"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="10 10"
          className="text-secondary/50"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: isVisible ? 1 : 0 }}
          transition={{ duration: 3, ease: "easeInOut" }}
        />

        {/* Secondary path */}
        <motion.path
          d="M 100 500 Q 400 450, 600 500 T 900 450"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="5 5"
          className="text-accent/30"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: isVisible ? 1 : 0 }}
          transition={{ duration: 3.5, ease: "easeInOut", delay: 0.5 }}
        />

        {/* Waypoints */}
        <Waypoint x="50" y="400" delay={0.5} />
        <Waypoint x="500" y="300" delay={1.5} />
        <Waypoint x="950" y="200" delay={2.5} />
        
        {/* Animated plane icon */}
        <motion.g
          initial={{ x: 50, y: 400 }}
          animate={{ 
            x: [50, 500, 950],
            y: [400, 300, 200]
          }}
          transition={{
            duration: 3,
            ease: "easeInOut",
            delay: 0.5,
            repeat: Infinity,
            repeatDelay: 2
          }}
        >
          <path
            d="M 0 0 L -10 -3 L -8 0 L -10 3 Z"
            fill="currentColor"
            className="text-secondary"
          />
        </motion.g>
      </svg>
    </div>
  );
}
