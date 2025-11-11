// COMMENTED OUT 11-Nov-2025: This file's functionality has been moved to components/utils/dateUtils.js for better organization.
// All imports should now use: import { formatDate } from '../utils/dateUtils';

/*
import { format } from "date-fns";

export const formatDate = (date, dateFormat = "MMM dd, yyyy") => {
  if (!date) return "";
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Map our format strings to date-fns format strings
  const formatMap = {
    "MM/dd/yyyy": "MM/dd/yyyy",
    "dd/MM/yyyy": "dd/MM/yyyy",
    "yyyy-MM-dd": "yyyy-MM-dd",
    "dd MMM yyyy": "dd MMM yyyy",
    "MMM dd, yyyy": "MMM dd, yyyy"
  };
  
  const fnsFormat = formatMap[dateFormat] || "MMM dd, yyyy";
  
  return format(dateObj, fnsFormat);
};
*/