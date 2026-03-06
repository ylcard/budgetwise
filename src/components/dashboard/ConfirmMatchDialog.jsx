import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { CustomButton } from "@/components/ui/CustomButton";
import { formatDate } from "../utils/dateUtils";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Dialog to confirm linking a transaction to a recurring bill template.
 * @param {object} props
 * @param {boolean} props.isOpen - Visibility state
 * @param {function} props.onClose - Close handler
 * @param {function} props.onConfirm - Confirm match handler
 * @param {object} props.matchData - Object containing { transaction, template }
 */
export function ConfirmMatchDialog({ isOpen, onClose, onConfirm, matchData }) {
  const isMobile = useIsMobile();

  if (!matchData) return null;

  const { transaction, template } = matchData;

  const Content = (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between gap-2 text-sm">
        {/* Template (Left) */}
        <div className="flex-1 p-3 border rounded-lg bg-muted/50 space-y-1">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">Bill</p>
          <p className="font-bold truncate">{template.title}</p>
          <p className="text-sm">~{Math.abs(template.amount).toLocaleString()} <span className="text-muted-foreground">expected</span></p>
        </div>

        <ArrowRight className="text-muted-foreground w-5 h-5 flex-shrink-0" />

        {/* Transaction (Right) */}
        <div className="flex-1 p-3 border rounded-lg border-primary/20 bg-primary/5 space-y-1">
          <p className="font-semibold text-primary text-xs uppercase tracking-wider">Transaction</p>
          <p className="font-bold truncate">{transaction.rawDescription || transaction.title}</p>
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold">{Math.abs(transaction.amount).toLocaleString()}</p>
            <span className="text-xs text-muted-foreground">{formatDate(transaction.date, "MMM d")}</span>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md flex gap-2">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
        <p>
          Confirming this will link this transaction to your <strong>{template.title}</strong> bill for this month and mark it as paid.
        </p>
      </div>
    </div>
  );

  const Footer = (
    <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
      <CustomButton variant="outline" onClick={onClose} className="w-full sm:w-1/2">
        Cancel
      </CustomButton>
      <CustomButton onClick={onConfirm} variant="success" className="w-full sm:w-1/2">
        Confirm Match
      </CustomButton>
    </div>
  );

  if (!isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Transaction Match</DialogTitle>
            <DialogDescription>
              Is this the correct payment for your bill?
            </DialogDescription>
          </DialogHeader>
          {Content}
          <DialogFooter>{Footer}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Confirm Transaction Match</DrawerTitle>
          <DrawerDescription>
            Is this the correct payment for your bill?
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-8">
          {Content}
          {Footer}
        </div>
      </DrawerContent>
    </Drawer>
  );
}