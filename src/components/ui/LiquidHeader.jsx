--- original
+++ new
@@ -0,0 +1,38 @@
+import { motion } from "framer-motion";
+import { Wallet, TrendingUp } from "lucide-react";
+
+export const LiquidHeader = ({ amount, isExpanded }) => {
+  return (
+    <motion.div 
+      layout
+      className="bg-primary p-6 rounded-3xl text-white overflow-hidden relative"
+      initial={{ borderRadius: 24 }}
+      animate={{ height: isExpanded ? 200 : 100 }}
+      transition={{ type: "spring", stiffness: 300, damping: 30 }}
+    >
+      <div className="flex justify-between items-center">
+        <motion.div layout="position">
+          <p className="text-xs opacity-70 uppercase tracking-widest font-bold">Total Balance</p>
+          <motion.h2 className="text-3xl font-bold italic">
+            ${amount.toLocaleString()}
+          </motion.h2>
+        </motion.div>
+        
+        <motion.div 
+          animate={{ rotate: isExpanded ? 180 : 0 }}
+          className="bg-white/20 p-2 rounded-full"
+        >
+          <Wallet size={20} />
+        </motion.div>
+      </div>
+
+      {isExpanded && (
+        <motion.div 
+          initial={{ opacity: 0, y: 10 }}
+          animate={{ opacity: 1, y: 0 }}
+          className="mt-6 flex gap-4"
+        >
+          <div className="flex items-center gap-2 text-sm bg-green-500/20 px-3 py-1 rounded-full">
+            <TrendingUp size={14} />
+            <span>+2.4% this week</span>
+          </div>
+        </motion.div>
+      )}
+    </motion.div>
+  );
+};
