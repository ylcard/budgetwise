import { useState } from "react";
import { motion, useMotionValue, useTransform, useAnimation } from "framer-motion";
import { Check, X, HelpCircle, ShoppingBag, Home } from "lucide-react";

const DEMO_TRANSACTION = {
  id: 1,
  merchant: "AMZN MKTP US*H82",
  amount: 45.90,
  date: "Today, 2:30 PM"
};

export const SwipeSorter = () => {
  const [card, setCard] = useState(DEMO_TRANSACTION);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const controls = useAnimation();

  // Background color interpolation based on drag
  const bg = useTransform(
    x, 
    [-150, 0, 150], 
    ["rgba(34, 197, 94, 0.2)", "rgba(255,255,255,0)", "rgba(168, 85, 247, 0.2)"]
  );

  // Review (Down) zone interpolation
  const yBg = useTransform(y, [0, 150], ["rgba(255,255,255,0)", "rgba(234, 179, 8, 0.2)"]);

  const handleDragEnd = async (event, info) => {
    const offset = info.offset;
    const velocity = info.velocity;

    if (offset.x > 100) {
      // Swiped RIGHT (Lifestyle)
      await controls.start({ x: 500, opacity: 0 });
      console.log("Categorized: Lifestyle");
    } else if (offset.x < -100) {
      // Swiped LEFT (Essentials)
      await controls.start({ x: -500, opacity: 0 });
      console.log("Categorized: Essentials");
    } else if (offset.y > 100) {
      // Swiped DOWN (Review)
      await controls.start({ y: 500, opacity: 0 });
      console.log("Categorized: Review Later");
    } else {
      // Reset
      controls.start({ x: 0, y: 0, opacity: 1 });
    }
  };

  if (!card) return null;

  return (
    <div className="relative h-64 w-full flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-700 bg-slate-900/50">
      
      {/* Background Labels (Visible when dragging) */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
         <div className="flex justify-between w-full">
            <span className="text-green-500 font-bold opacity-30 flex items-center gap-2"><Home /> Essentials</span>
            <span className="text-purple-500 font-bold opacity-30 flex items-center gap-2">Lifestyle <ShoppingBag /></span>
         </div>
         <div className="text-center w-full">
            <span className="text-yellow-500 font-bold opacity-30 flex flex-col items-center gap-1">
               <HelpCircle /> Review
            </span>
         </div>
      </div>

      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        style={{ x, y, rotate }}
        animate={controls}
        onDragEnd={handleDragEnd}
        className="w-64 h-40 bg-slate-800 rounded-2xl shadow-xl border border-slate-700 flex flex-col items-center justify-center p-4 cursor-grab active:cursor-grabbing z-10"
      >
        <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mb-3 text-2xl">
           🧾
        </div>
        <h3 className="font-bold text-white">{card.merchant}</h3>
        <p className="text-2xl font-bold text-indigo-400 mt-1">-${card.amount}</p>
        <p className="text-xs text-slate-500 mt-2">Swipe to categorize</p>
      </motion.div>
    </div>
  );
};
