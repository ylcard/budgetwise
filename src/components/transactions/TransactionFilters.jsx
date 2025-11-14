import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
// COMMENTED OUT 16-Jan-2025: Replaced with CustomButton for consistency
// import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/CustomButton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import DateRangePicker from "../ui/DateRangePicker";

export default function TransactionFilters({ filters, setFilters, categories }) {
  const selectedCategories = Array.isArray(filters.category) ? filters.category : [];
  
  const handleCategoryToggle = (categoryId) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    setFilters({ ...filters, category: newCategories });
  };

  const handleClearCategories = () => {
    setFilters({ ...filters, category: [] });
  };

  const handleDateRangeChange = (startDate, endDate) => {
    setFilters({ ...filters, startDate, endDate });
  };

  return (
    <Card className="border-none shadow-lg">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <Select
            value={filters.type}
            onValueChange={(value) => setFilters({ ...filters, type: value })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <CustomButton variant="outline" className="w-48 justify-between">
                {selectedCategories.length === 0 ? (
                  "All Categories"
                ) : (
                  `${selectedCategories.length} selected`
                )}
                <Filter className="w-4 h-4 ml-2" />
              </CustomButton>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Categories</Label>
                  {selectedCategories.length > 0 && (
                    <CustomButton
                      variant="ghost"
                      size="sm"
                      onClick={handleClearCategories}
                      className="h-6 px-2 text-xs"
                    >
                      Clear
                    </CustomButton>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={() => handleCategoryToggle(category.id)}
                      />
                      <label
                        htmlFor={`category-${category.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedCategories.map(catId => {
                const cat = categories.find(c => c.id === catId);
                return cat ? (
                  <Badge key={catId} variant="secondary" className="gap-1">
                    {cat.name}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-red-600" 
                      onClick={() => handleCategoryToggle(catId)}
                    />
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          <Select
            value={filters.paymentStatus}
            onValueChange={(value) => setFilters({ ...filters, paymentStatus: value })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>

          <DateRangePicker
            startDate={filters.startDate}
            endDate={filters.endDate}
            onRangeChange={handleDateRangeChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// UPDATED 16-Jan-2025: Replaced Button with CustomButton for filter actions
// - Category trigger button uses variant="outline"
// - Clear categories button uses variant="ghost" size="sm"
// - All functionality preserved with consistent styling