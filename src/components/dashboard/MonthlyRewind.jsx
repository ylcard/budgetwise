import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { motion } from 'framer-motion';
import { Share, Download, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";

export const MonthlyRewind = ({ containerRef, monthName }) => {
  const exportAsPDF = async () => {
    if (!containerRef.current) return;
    
    const canvas = await html2canvas(containerRef.current, {
      backgroundColor: '#0f172a', // Matches your slate-900
      scale: 2, // Higher quality for mobile screens
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`BudgetWise-${monthName}-Summary.pdf`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl text-white shadow-xl flex flex-col gap-4"
    >
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-xl">
          <Sparkles size={24} className="text-yellow-300" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Monthly Rewind</h3>
          <p className="text-xs opacity-80">Export your {monthName} stats as a visual report.</p>
        </div>
      </div>

      <Button 
        onClick={exportAsPDF}
        className="w-full bg-white text-indigo-700 hover:bg-slate-100 font-bold rounded-2xl gap-2"
      >
        <Download size={18} />
        Generate PDF Report
      </Button>
    </motion.div>
  );
};
