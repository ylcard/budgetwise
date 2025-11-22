import { Check } from "lucide-react";

export function Steps({ steps, currentStep, className }) {
    return (
        <div className={`flex justify-between items-center relative ${className || ''}`}>
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 -z-10" />
            {steps.map((s) => {
                const isActive = s.id === currentStep;
                const isCompleted = s.id < currentStep;
                return (
                    <div key={s.id} className="flex flex-col items-center bg-white px-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${isActive ? "bg-blue-600 text-white" :
                            isCompleted ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"
                            }`}>
                            {isCompleted ? <Check className="w-4 h-4" /> : s.id}
                        </div>
                        <span className={`text-xs mt-1 font-medium ${isActive ? "text-blue-600" : "text-gray-500"}`}>
                            {s.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
