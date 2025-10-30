"use client";

import { motion } from "framer-motion";
import styles from "./MoltenFooter.module.scss";

const MoltenFooter = () => {
  const ribbons = Array.from({ length: 14 });

  return (
    <div className={styles.moltenFooter} aria-hidden>
      <div className={styles.glow} />
      <div className={styles.ribbons}>
        {ribbons.map((_, i) => {
          const width = 4 + ((i * 7) % 5);
          const height = 120 + ((i * 13) % 40);
          const blur = 0.5 + ((i * 3) % 2);
          const duration = 3.8 + (i % 5) * 0.25;
          const delay = (i * 0.17) % 2;

          return (
            <motion.div
              key={i}
              className={styles.ribbon}
              initial={{ y: 40, opacity: 0.6, scaleY: 0.85 }}
              animate={{
                y: [-6, -22, 0, -12, -6],
                opacity: [0.5, 0.8, 0.65, 0.75, 0.6],
                scaleY: [0.9, 1.05, 0.95, 1.02, 0.9],
              }}
              transition={{
                duration,
                repeat: Infinity,
                repeatType: "mirror" as const,
                ease: "easeInOut",
                delay,
              }}
              style={{
                width,
                height,
                filter: `blur(${blur}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MoltenFooter;
