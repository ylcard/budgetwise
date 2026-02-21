import React, { useState, useRef } from 'react';
import { X, Loader2, Upload, Camera as CameraIcon, Sparkles } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { CustomButton } from "@/components/ui/CustomButton";
import { cn } from "@/lib/utils";

export default function ReceiptScanner({ onScanComplete, open, onOpenChange }) {
    const fileInputRef = useRef(null);
    const [image, setImage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create a local preview URL
        setImage(URL.createObjectURL(file));
        setIsProcessing(true);

        try {
            const compressedFile = await imageCompression(file, {
                maxSizeMB: 0.2,
                maxWidthOrHeight: 1200,
                useWebWorker: true
            });

            // 2. Convert to Base64
            const base64Image = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(compressedFile);
            });

            // 3. Call your Deno Serverless Function
            const response = await fetch('/functions/parseReceipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64Image })
            });

            const result = await response.json();

            onScanComplete({
                title: result.merchant || "",
                amount: result.total ? result.total.toString() : "",
                date: result.date || null
            });

            onOpenChange(false);
            resetScanner();
        } catch (error) {
            console.error("Scanning failed:", error);
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
                                    <p className="text-xl font-bold text-white">AI is analyzing...</p>
                                    <Sparkles className="w-6 h-6 text-blue-400 mt-2 animate-pulse" />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 text-center px-4 italic">
                                "Gemini is identifying the merchant, total, and date."
                            </p>
                        </div>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}
