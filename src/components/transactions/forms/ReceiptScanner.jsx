import React, { useState, useRef } from 'react';
import { X, Loader2, Upload, Camera as CameraIcon } from 'lucide-react';
import Tesseract from 'tesseract.js';
import imageCompression from 'browser-image-compression';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { CustomButton } from "@/components/ui/CustomButton";
import { cn } from "@/lib/utils";

export default function ReceiptScanner({ onScanComplete, open, onOpenChange }) {
    const fileInputRef = useRef(null);
    const [image, setImage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const parseReceiptText = (text) => {
        // Simple regex logic to find Total, Date, and Merchant
        // This is the "brain" that needs refinement over time
        const lines = text.split('\n').filter(line => line.trim().length > 0);

        // 1. Find Amount: Look for patterns like XX.XX or XX,XX
        const amountRegex = /(\d+[.,]\d{2})/g;
        const amounts = text.match(amountRegex) || [];
        const numericAmounts = amounts.map(a => parseFloat(a.replace(',', '.')));
        const total = numericAmounts.length > 0 ? Math.max(...numericAmounts) : null;

        // 2. Find Date: Look for DD/MM/YYYY or similar
        const dateRegex = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/g;
        const dates = text.match(dateRegex) || [];

        // 3. Find Merchant: Usually the first line of the receipt
        const merchant = lines[0]?.trim() || "";

        return {
            title: merchant,
            amount: total,
            date: dates[0] || null,
            raw: text
        };
    };

    // --- NEW: Image Preprocessing Engine ---
    const preprocessImage = (file) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;

                // Draw original image
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Get pixels
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Convert to Grayscale & Apply High Contrast Threshold
                for (let i = 0; i < data.length; i += 4) {
                    // Standard grayscale conversion
                    const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
                    // Threshold: If it's darkish, make it pure black. If light, pure white.
                    const threshold = 120; // Adjust this if receipts are too washed out or too dark
                    const color = brightness > threshold ? 255 : 0;

                    data[i] = data[i + 1] = data[i + 2] = color; // R, G, B
                }

                ctx.putImageData(imageData, 0, 0);
                canvas.toBlob(resolve, 'image/jpeg', 0.9);
            };
        });
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create a local preview URL
        setImage(URL.createObjectURL(file));
        setIsProcessing(true);

        try {
            // 1. Compress Image (Tesseract is faster with smaller files)
            const compressedFile = await imageCompression(file, {
                maxSizeMB: 1,
                maxWidthOrHeight: 1024,
                useWebWorker: true
            });

            // 2. Preprocess (Grayscale + Contrast)
            const processedBlob = await preprocessImage(compressedFile);

            // Update UI to show the processed (black and white) image to the user
            setImage(URL.createObjectURL(processedBlob));

            // 3. Run OCR with Character Whitelisting
            const { data: { text } } = await Tesseract.recognize(
                processedBlob,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') setProgress(parseInt(m.progress * 100));
                    },
                    // Whitelist: Only look for standard letters, numbers, and receipt punctuation
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,/-:$£€ '
                }
            );

            // 4. Parse and Return
            const result = parseReceiptText(text);
            onScanComplete(result);
            onOpenChange(false);
            resetScanner();
        } catch (error) {
            console.error("OCR Error:", error);
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input
            }
        }
    };

    const resetScanner = () => {
        setImage(null);
        setIsProcessing(false);
        setProgress(0);
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="z-[250] h-[95dvh] flex flex-col">
                <DrawerHeader className="shrink-0">
                    <div className="flex items-center justify-between">
                        <DrawerTitle>Scan Receipt</DrawerTitle>
                        <DrawerClose asChild>
                            <CustomButton variant="ghost" size="icon" className="rounded-full" onClick={resetScanner}>
                                <X className="h-5 w-5" />
                            </CustomButton>
                        </DrawerClose>
                    </div>
                </DrawerHeader>

                <div className="flex-1 relative bg-black/5 overflow-hidden flex flex-col items-center justify-center p-6">
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {!image ? (
                        <div className="w-full max-w-sm flex flex-col gap-4">
                            <CustomButton
                                onClick={() => fileInputRef.current?.click()}
                                className="h-16 text-lg rounded-xl flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                            >
                                <CameraIcon className="w-6 h-6" />
                                Take Photo
                            </CustomButton>

                            <div className="relative flex items-center py-2">
                                <div className="flex-grow border-t border-gray-300"></div>
                                <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">or</span>
                                <div className="flex-grow border-t border-gray-300"></div>
                            </div>

                            <CustomButton
                                variant="outline"
                                onClick={() => {
                                    // Remove capture attribute temporarily to force gallery opening on some devices
                                    if (fileInputRef.current) {
                                        fileInputRef.current.removeAttribute('capture');
                                        fileInputRef.current.click();
                                        // Add it back after a short delay
                                        setTimeout(() => fileInputRef.current?.setAttribute('capture', 'environment'), 1000);
                                    }
                                }}
                                className="h-16 text-lg rounded-xl flex items-center justify-center gap-3 bg-white"
                            >
                                <Upload className="w-6 h-6 text-gray-600" />
                                Choose from Gallery
                            </CustomButton>
                        </div>
                    ) : (
                        <div className="w-full flex flex-col items-center justify-center space-y-6">
                            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-white/20">
                                <img src={image} alt="captured" className="w-full h-full object-cover grayscale blur-[2px]" />
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                                    <Loader2 className="w-12 h-12 animate-spin text-blue-400 mb-4" />
                                    <p className="text-xl font-bold">Scanning Text...</p>
                                    <p className="text-blue-400 font-mono mt-2">{progress}%</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 text-center px-4 italic">
                                "Tesseract is extracting data locally on your device..."
                            </p>
                        </div>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}
