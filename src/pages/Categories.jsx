import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  useCategoryData,
  useCategoryActions,
} from "../components/hooks/useFinancialData";

import CategoryForm from "../components/categories/CategoryForm";
import CategoryGrid from "../components/categories/CategoryGrid";

export default function Categories() {
  // UI state
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Data fetching
  const { categories, isLoading } = useCategoryData();

  // Actions (mutations and handlers)
  const { handleSubmit, handleEdit, handleDelete, isSubmitting } = useCategoryActions(
    setShowForm,
    setEditingCategory
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Categories</h1>
            <p className="text-gray-500 mt-1">Organize your transactions with custom categories</p>
          </div>
          <Button
            onClick={() => {
              setEditingCategory(null);
              setShowForm(!showForm);
            }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>

        {showForm && (
          <CategoryForm
            category={editingCategory}
            onSubmit={(data) => handleSubmit(data, editingCategory)}
            onCancel={() => {
              setShowForm(false);
              setEditingCategory(null);
            }}
            isSubmitting={isSubmitting}
          />
        )}

        <CategoryGrid
          categories={categories}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}