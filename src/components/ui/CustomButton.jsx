import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// This component extends ShadcnUI button with centralized, purpose-driven variants
// All buttons in the app should use this component for consistency

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                // Original ShadcnUI variants
                default:
                    "bg-primary text-primary-foreground shadow hover:bg-primary/90",
                destructive:
                    "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-600",
                outline:
                    "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
                secondary:
                    "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",

                // NEW: Purpose-based custom variants
                create:
                    "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg focus-visible:ring-blue-600",
                modify:
                    "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-blue-600",
                delete:
                    "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-600",
                success:
                    "bg-green-600 text-white shadow-sm hover:bg-green-700 focus-visible:ring-green-600",
                warning:
                    "bg-orange-600 text-white shadow-sm hover:bg-orange-700 focus-visible:ring-orange-600",
                info:
                    "bg-sky-600 text-white shadow-sm hover:bg-sky-700 focus-visible:ring-sky-600",
                primary:
                    "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg focus-visible:ring-blue-600",
                glass:
                    "border border-white/30 bg-transparent text-white shadow-sm hover:bg-white/20 hover:border-white/50 hover:text-white",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 rounded-md px-3 text-xs",
                lg: "h-10 rounded-md px-8",
                icon: "h-9 w-9",
                "icon-sm": "h-8 w-8",
                "icon-lg": "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

const CustomButton = React.forwardRef(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                type="button"
                ref={ref}
                {...props}
            />
        );
    }
);
CustomButton.displayName = "CustomButton";

export { CustomButton, buttonVariants };

// CREATED 15-Jan-2025: Purpose-based button component
// 
// Purpose-Based Variants:
// - create: Gradient blue-purple for creation actions (Add, Create, New)
// - modify: Solid blue for modification actions (Edit, Update, Save)
// - delete: Red for deletion actions (Delete, Remove)
// - success: Green for success/completion actions (Complete, Done, Confirm)
// - warning: Orange for warning actions (Cancel with consequences, Archive)
// - info: Sky blue for informational actions (View, Details, Info)
// - primary: Same as create, for primary CTAs
// 
// Original ShadcnUI Variants (preserved):
// - default: Primary brand color
// - destructive: Red, similar to delete but follows ShadcnUI naming
// - outline: Border with transparent background
// - secondary: Secondary color
// - ghost: Transparent with hover effect
// - link: Text with underline
// 
// Sizes:
// - default: Standard button height (h-9)
// - sm: Small button (h-8)
// - lg: Large button (h-10)
// - icon: Square icon button (h-9 w-9)
// - icon-sm: Small square icon button (h-8 w-8)
// - icon-lg: Large square icon button (h-10 w-10)
// 
// Usage Examples:
// <CustomButton variant="create">Add New</CustomButton>
// <CustomButton variant="delete" size="sm">Delete</CustomButton>
// <CustomButton variant="modify">Edit</CustomButton>
// <CustomButton variant="success">Complete</CustomButton>