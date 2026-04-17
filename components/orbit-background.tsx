"use client";

import { motion } from "framer-motion";

export function OrbitBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0B0F14]">
      <div className="premium-grid absolute inset-0 opacity-70" />
      <motion.div
        aria-hidden
        className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl"
        animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -right-28 top-0 h-[28rem] w-[28rem] rounded-full bg-violet-500/20 blur-3xl"
        animate={{ x: [0, -42, 0], y: [0, 60, 0], scale: [1, 0.92, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-0 left-1/2 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl"
        animate={{ x: ["-50%", "-46%", "-50%"], y: [0, -40, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute left-[12%] top-[18%] h-72 w-72 rounded-full border border-cyan-300/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute left-1/2 top-0 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_24px_rgba(103,232,249,0.9)]" />
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute bottom-[14%] right-[12%] h-96 w-96 rounded-full border border-fuchsia-300/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 54, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute right-10 top-8 h-1.5 w-1.5 rounded-full bg-fuchsia-300 shadow-[0_0_22px_rgba(240,171,252,0.9)]" />
      </motion.div>
    </div>
  );
}
