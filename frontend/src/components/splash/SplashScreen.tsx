import { motion } from "framer-motion";
import hpcLogo from "@/assets/hpc-logo.png";

type SplashScreenProps = {
  /** Optional “Welcome back, …” when we have a cached display name */
  welcomeName?: string | null;
};

/**
 * Full-viewport branded splash while session + homepage public data restore or load.
 */
export function SplashScreen({ welcomeName }: SplashScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
      aria-busy
      aria-live="polite"
      aria-label="Loading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--primary)/0.14),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_50%,hsl(var(--primary)/0.06),transparent_45%),radial-gradient(ellipse_80%_50%_at_0%_50%,hsl(var(--primary)/0.06),transparent_45%)]"
        aria-hidden
      />
      <div className="relative flex max-w-md flex-col items-center px-8 text-center">
        <motion.div
          className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl border border-border/60 bg-card/80 shadow-lg shadow-primary/5 backdrop-blur-sm sm:h-28 sm:w-28"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={hpcLogo} alt="" className="h-[72%] w-[72%] object-contain" width={120} height={120} />
        </motion.div>
        <motion.h1
          className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
        >
          HPC Alumni Association
        </motion.h1>
        <motion.p
          className="mt-2 text-sm text-muted-foreground sm:text-base"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.4 }}
        >
          Hamdard Public College, Dhaka
        </motion.p>
        {welcomeName ? (
          <motion.p
            className="mt-4 text-sm font-medium text-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.35 }}
          >
            Welcome back, {welcomeName}
          </motion.p>
        ) : null}
        <motion.div
          className="mt-10 h-1 w-40 overflow-hidden rounded-full bg-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          aria-hidden
        >
          <motion.div
            className="h-full w-1/3 rounded-full bg-primary"
            animate={{ x: ["-100%", "280%"] }}
            transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
