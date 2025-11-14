import React from "react";
// UPDATED 16-Jan-2025: Replaced Button with CustomButton for consistency
// import { Button } from "@/components/ui/button";
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
  message, 
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
          <DialogDescription>{message}</DialogDescription>
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

// UPDATED 16-Jan-2025: Replaced shadcn Button with CustomButton
// - Cancel button uses CustomButton with variant="outline"
// - Confirm button uses CustomButton with variant="delete" (for destructive actions) or "success" (for non-destructive)
// - This provides consistent, purpose-based styling for confirmation dialogs
// - All functionality preserved