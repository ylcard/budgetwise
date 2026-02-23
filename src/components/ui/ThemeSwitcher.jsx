import React from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export default function ThemeSwitcher({ theme = "light", toggleTheme, className }) {
  const isDark = theme === "dark";

  return (
    <motion.button
      onClick={toggleTheme}
      className={twMerge(
        clsx(
          "relative w-28 h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer",
          className
        )
      )}
      // 3. The day sky gradually turns into a night sky
      animate={{
        backgroundColor: isDark ? "#0f172a" : "#38bdf8", // tailwind slate-900 (night) vs sky-400 (day)
      }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      {/* Ambient Moon Glow (Only visible at night) */}
      <motion.div
        className="absolute top-1 left-2 w-9 h-9 rounded-full bg-slate-400/30 blur-md pointer-events-none"
        animate={{ opacity: isDark ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      />

      {/* Night Sky Stars */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={false}
        animate={{ opacity: isDark ? 1 : 0, y: isDark ? 0 : 10 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="absolute top-2 right-4 w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_2px_white]" />
        <div className="absolute top-5 right-10 w-[3px] h-[3px] bg-white rounded-full shadow-[0_0_3px_white]" />
        <div className="absolute top-8 right-5 w-[1px] h-[1px] bg-white rounded-full shadow-[0_0_2px_white]" />
      </motion.div>

      {/* 2. Clouds moving, simulating time passing, fewer clouds at night */}
      {/* Cloud 1 (Fades out at night) */}
      <motion.div
        className="absolute top-2 left-10 w-6 h-2 bg-white rounded-full blur-[0.5px] pointer-events-none"
        animate={{
          x: isDark ? -40 : 0,
          opacity: isDark ? 0 : 0.9,
        }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />
      {/* Cloud 2 (Stays but moves and dims at night) */}
      <motion.div
        className="absolute top-6 left-16 w-8 h-3 bg-white rounded-full blur-[0.5px] pointer-events-none"
        animate={{
          x: isDark ? -20 : 0,
          opacity: isDark ? 0.2 : 0.8,
        }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />
      {/* Cloud 3 (Fades out quickly) */}
      <motion.div
        className="absolute top-4 left-4 w-5 h-2 bg-white rounded-full blur-[0.5px] pointer-events-none"
        animate={{
          x: isDark ? -30 : 0,
          opacity: isDark ? 0 : 0.7,
        }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
      />

      {/* 1. Sun curves to the left and beneath the horizon */}
      <motion.div
        className="absolute top-1 left-[60px] w-9 h-9 flex items-center justify-center bg-gradient-to-br from-yellow-100 via-yellow-400 to-orange-500 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.8)] pointer-events-none"
        animate={{
          x: isDark ? -40 : 0, // Moves left
          y: isDark ? 40 : 0,  // Moves down (beneath horizon)
          scale: isDark ? 0.5 : 1,
        }}
        transition={{ type: "spring", stiffness: 60, damping: 15 }}
      >
        {/* Inner bright core to give a 3D hot appearance */}
        <div className="w-5 h-5 bg-white/40 rounded-full blur-[2px] shadow-inner" />
        {/* Subtle sunspot/texture */}
        <div className="absolute bottom-1 right-2 w-3 h-2 bg-orange-600/30 rounded-full blur-[2px]" />
      </motion.div>

      {/* 1. Moon comes up from the other side to the Sun's position */}
      <motion.div
        className="absolute top-1 left-2 w-9 h-9 bg-slate-200 rounded-full shadow-[0_0_10px_rgba(226,232,240,0.4)] pointer-events-none overflow-hidden"
        initial={false}
        animate={{
          x: isDark ? 0 : 80, // Starts far right in light mode, ends up at 0 in dark mode
          y: isDark ? 0 : 40, // Starts below horizon, ends up at 0
          scale: isDark ? 1 : 0.5,
        }}
        transition={{ type: "spring", stiffness: 60, damping: 15 }}
      >
        {/* Subtle craters on the moon */}
        <div className="absolute top-2 left-5 w-2 h-2 bg-slate-300 rounded-full" />
        <div className="absolute top-5 left-2 w-[10px] h-[10px] bg-slate-300 rounded-full" />
        <div className="absolute top-6 left-6 w-1.5 h-1.5 bg-slate-300 rounded-full" />
      </motion.div>
    </motion.button>
  );
}
