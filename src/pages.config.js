/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Automation from './pages/Automation';
import BankSync from './pages/BankSync';
import BudgetDetail from './pages/BudgetDetail';
import Budgets from './pages/Budgets';
import Categories from './pages/Categories';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import ImportData from './pages/ImportData';
import Manage from './pages/Manage';
import MiniBudgets from './pages/MiniBudgets';
import RecurringTransactions from './pages/RecurringTransactions';
import Reports from './pages/Reports';
import Transactions from './pages/Transactions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import FinancialDisclaimer from './pages/FinancialDisclaimer';
import CookiePolicy from './pages/CookiePolicy';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Automation": Automation,
    "BankSync": BankSync,
    "BudgetDetail": BudgetDetail,
    "Budgets": Budgets,
    "Categories": Categories,
    "Dashboard": Dashboard,
    "Home": Home,
    "ImportData": ImportData,
    "Manage": Manage,
    "MiniBudgets": MiniBudgets,
    "RecurringTransactions": RecurringTransactions,
    "Reports": Reports,
    "Transactions": Transactions,
    "PrivacyPolicy": PrivacyPolicy,
    "TermsOfService": TermsOfService,
    "FinancialDisclaimer": FinancialDisclaimer,
    "CookiePolicy": CookiePolicy,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};