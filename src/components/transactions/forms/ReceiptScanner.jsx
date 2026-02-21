import React, { useState, useRef, useCallback } from 'react';
import { Camera as CameraIcon, X, Zap, RefreshCw, Loader2 } from 'lucide-react';
import { Camera } from 'react-camera-pro';
import Tesseract from 'tesseract.js';
import imageCompression from 'browser-image-compression';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { CustomButton } from "@/components/ui/CustomButton";
import { cn } from "@/lib/utils";

export default function ReceiptScanner({ onScanComplete, open, onOpenChange }) {
    const camera = useRef(null);
    const [image, setImage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [numberOfCameras, setNumberOfCameras] = useState(0);

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

    const handleCapture = async () => {
        if (camera.current) {
            const photo = camera.current.takePhoto();
            setImage(photo);
            setIsProcessing(true);

            try {
                // 1. Compress Image (Tesseract is faster with smaller files)
                const imageFile = await fetch(photo).then(r => r.blob());
                const compressedBlob = await imageCompression(imageFile, {
                    maxSizeMB: 0.5,
                    maxWidthOrHeight: 1024,
                    useWebWorker: true
                });

                // 2. Run OCR
                const { data: { text } } = await Tesseract.recognize(
                    compressedBlob,
                    'eng',
                    { logger: m => {
                        if (m.status === 'recognizing text') setProgress(parseInt(m.progress * 100));
                    }}
                );

                // 3. Parse and Return
                const result = parseReceiptText(text);
                onScanComplete(result);
                onOpenChange(false);
                resetScanner();
            } catch (error) {
                console.error("OCR Error:", error);
            } finally {
                setIsProcessing(false);
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
                            <CustomButton variant="ghost" size="icon" className="rounded-full">
                                <X className="h-5 w-5" />
                            </CustomButton>
                        </DrawerClose>
                    </div>
                </DrawerHeader>

                <div className="flex-1 relative bg-black overflow-hidden flex flex-col">
                    {!image ? (
                        <>
                            <Camera 
                                ref={camera} 
                                numberOfCamerasCallback={setNumberOfCameras}
                                aspectRatio={16 / 9}
                                facingMode="environment"
                                errorMessages={{
                                    noCameraAccessible: 'No camera device accessible',
                                    permissionDenied: 'Permission denied',
                                    switchCamera: 'It is not possible to switch camera to different camera device',
                                    canvas: 'Canvas is not supported.'
                                }}
                            />
                            {/* Viewfinder Overlay */}
                            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                                <div className="w-full h-full border-2 border-white/50 border-dashed rounded-lg" />
                            </div>
                            
                            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8">
                                <button 
                                    onClick={handleCapture}
                                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
                                >
                                    <div className="w-16 h-16 rounded-full bg-white shadow-lg" />
                                </button>
                                {numberOfCameras > 1 && (
                                    <button 
                                        onClick={() => camera.current?.switchCamera()}
                                        className="p-3 bg-white/20 rounded-full backdrop-blur-md text-white"
                                    >
                                        <RefreshCw className="w-6 h-6" />
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-white space-y-6">
                            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-white/20">
                                <img src={image} alt="captured" className="w-full h-full object-cover grayscale blur-[2px]" />
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                                    <Loader2 className="w-12 h-12 animate-spin text-blue-400 mb-4" />
                                    <p className="text-xl font-bold">Scanning Text...</p>
                                    <p className="text-blue-400 font-mono mt-2">{progress}%</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-400 text-center px-4 italic">
                                "Tesseract is extracting data locally on your device..."
                            </p>
                        </div>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}
