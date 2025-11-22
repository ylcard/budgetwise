import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CategoryCard from "./CategoryCard";
import { FINANCIAL_PRIORITIES } from "../utils/constants";

export default function CategoryGrid({ categories, onEdit, onDelete, isLoading }) {
    if (isLoading) {
        return (
            <Card className="border-none shadow-lg">
                <CardHeader>
                    <CardTitle>Your Categories</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {Array(6).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-32 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (categories.length === 0) {
        return (
            <Card className="border-none shadow-lg">
                <CardHeader>
                    <CardTitle>Your Categories</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-40 flex items-center justify-center text-gray-400">
                        <p>No categories yet. Create your first one!</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Sort logic: Priority Order (Needs -> Wants -> Savings) then Alphabetical
    const sortedCategories = [...categories].sort((a, b) => {
        const orderA = FINANCIAL_PRIORITIES[a.priority]?.order ?? 99;
        const orderB = FINANCIAL_PRIORITIES[b.priority]?.order ?? 99;

        // If priorities differ, sort by priority weight
        if (orderA !== orderB) return orderA - orderB;
        // If priorities are same, sort by name
        return a.name.localeCompare(b.name);
    });

    return (
        <Card className="border-none shadow-lg">
            <CardHeader>
                <CardTitle>All Categories ({sortedCategories.length})</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {sortedCategories.map((category) => (
                        <CategoryCard
                            key={category.id}
                            category={category}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
