import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CustomButton } from '@/components/ui/CustomButton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Shield, BarChart3, Target, Cookie } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const categories = [
    {
        key: 'essential',
        title: 'Essential Cookies',
        description: 'Required for the website to function properly. These cannot be disabled.',
        icon: Shield,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        disabled: true
    },
    {
        key: 'analytics',
        title: 'Analytics Cookies',
        description: 'Help us understand how visitors interact with our website by collecting anonymous data.',
        icon: BarChart3,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        disabled: false
    },
    {
        key: 'marketing',
        title: 'Marketing Cookies',
        description: 'Used to deliver personalized advertisements and track campaign performance.',
        icon: Target,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        disabled: false
    }
];

export default function CookieSettings({ open, onOpenChange, consent, onUpdateConsent }) {
    const isMobile = useIsMobile();
    const [localConsent, setLocalConsent] = useState(() => ({
        essential: true,
        analytics: consent?.analytics || false,
        marketing: consent?.marketing || false
    }));

    const handleToggle = (category, value) => {
        if (category === 'essential') return; // Cannot toggle essential
        setLocalConsent(prev => ({ ...prev, [category]: value }));
    };

    const handleSave = () => {
        onUpdateConsent(localConsent);
        onOpenChange(false);
    };

    const handleAcceptAll = () => {
        const allAccepted = { essential: true, analytics: true, marketing: true };
        setLocalConsent(allAccepted);
        onUpdateConsent(allAccepted);
        onOpenChange(false);
    };

    const content = (
        <div className="space-y-6">
            {/* Header Description */}
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Cookie className="w-5 h-5 text-blue-500" />
                <p>Manage your cookie preferences. You can change these settings at any time.</p>
            </div>

            <Separator />

            {/* Category Toggles */}
            <div className="space-y-4">
                {categories.map((category) => {
                    const Icon = category.icon;
                    const isChecked = localConsent[category.key];

                    return (
                        <div
                            key={category.key}
                            className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
                        >
                            <div className={`w-10 h-10 rounded-lg ${category.bgColor} flex items-center justify-center flex-shrink-0`}>
                                <Icon className={`w-5 h-5 ${category.color}`} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-3 mb-1">
                                    <Label
                                        htmlFor={category.key}
                                        className="font-semibold text-sm cursor-pointer"
                                    >
                                        {category.title}
                                    </Label>
                                    <Switch
                                        id={category.key}
                                        checked={isChecked}
                                        onCheckedChange={(value) => handleToggle(category.key, value)}
                                        disabled={category.disabled}
                                        className={category.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {category.description}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Separator />

            {/* Info Notice */}
            <div className="bg-muted/50 border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Privacy Notice:</strong> Your choices will be saved locally on your device. 
                    No personal data is shared with third parties without your consent. 
                    View our <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a> for details.
                </p>
            </div>
        </div>
    );

    const footer = (
        <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
            <CustomButton
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
            >
                Cancel
            </CustomButton>
            <CustomButton
                variant="ghost"
                onClick={handleAcceptAll}
                className="flex-1"
            >
                Accept All
            </CustomButton>
            <CustomButton
                variant="primary"
                onClick={handleSave}
                className="flex-1 shadow-lg"
            >
                Save Preferences
            </CustomButton>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="max-h-[90dvh] z-[10000]">
                    <DrawerHeader className="text-left">
                        <DrawerTitle>Cookie Preferences</DrawerTitle>
                        <DrawerDescription>
                            Choose which cookies you want to allow
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4 pb-4 overflow-y-auto flex-1">
                        {content}
                    </div>
                    <DrawerFooter className="border-t pt-4">
                        {footer}
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] z-[10000]">
                <DialogHeader>
                    <DialogTitle>Cookie Preferences</DialogTitle>
                    <DialogDescription>
                        Choose which cookies you want to allow
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {content}
                </div>
                <DialogFooter>
                    {footer}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}