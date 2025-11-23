import { CustomButton } from "@/components/ui/CustomButton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    destructive = false
}) {
    const handleConfirm = () => {
        onConfirm();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <CustomButton
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </CustomButton>
                    <CustomButton
                        variant={destructive ? "delete" : "success"}
                        onClick={handleConfirm}
                    >
                        Confirm
                    </CustomButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
