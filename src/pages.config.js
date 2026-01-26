import BankSync from './pages/BankSync';
import BudgetDetail from './pages/BudgetDetail';
import Budgets from './pages/Budgets';
import Categories from './pages/Categories';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import ImportData from './pages/ImportData';
import MiniBudgets from './pages/MiniBudgets';
import RecurringTransactions from './pages/RecurringTransactions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Transactions from './pages/Transactions';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BankSync": BankSync,
    "BudgetDetail": BudgetDetail,
    "Budgets": Budgets,
    "Categories": Categories,
    "Dashboard": Dashboard,
    "Home": Home,
    "ImportData": ImportData,
    "MiniBudgets": MiniBudgets,
    "RecurringTransactions": RecurringTransactions,
    "Reports": Reports,
    "Settings": Settings,
    "Transactions": Transactions,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};