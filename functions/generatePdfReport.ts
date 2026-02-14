/**
 * CREATED 14-Feb-2026: Generate PDF reports with multiple layout templates
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { template, data, dateRange, settings } = await req.json();

        const doc = new jsPDF();
        let y = 20;

        // Helper to add page breaks
        const checkPageBreak = (spaceNeeded = 30) => {
            if (y + spaceNeeded > 280) {
                doc.addPage();
                y = 20;
                return true;
            }
            return false;
        };

        // Helper to format currency
        const formatMoney = (amount) => {
            const formatted = amount.toFixed(settings?.decimalPlaces || 2);
            return `${settings?.currencySymbol || '$'}${formatted}`;
        };

        // Header
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.text('BudgetWise Financial Report', 20, y);
        y += 10;

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
        y += 5;
        doc.text(`User: ${user.email}`, 20, y);
        y += 5;
        if (dateRange?.from && dateRange?.to) {
            doc.text(`Period: ${dateRange.from} to ${dateRange.to}`, 20, y);
            y += 5;
        }
        y += 10;

        // Render based on template type
        if (template === 'summary') {
            await renderSummaryReport(doc, data, y, checkPageBreak, formatMoney);
        } else if (template === 'detailed') {
            await renderDetailedReport(doc, data, y, checkPageBreak, formatMoney);
        } else if (template === 'comprehensive') {
            await renderComprehensiveReport(doc, data, y, checkPageBreak, formatMoney);
        }

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=budgetwise-report-${new Date().toISOString().split('T')[0]}.pdf`
            }
        });
    } catch (error) {
        console.error('PDF Generation Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function renderSummaryReport(doc, data, startY, checkPageBreak, formatMoney) {
    let y = startY;

    // Section: Summary Overview
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text('Financial Summary', 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);

    const totalIncome = data.transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const totalExpenses = data.transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const netSavings = totalIncome - totalExpenses;

    doc.text(`Total Income: ${formatMoney(totalIncome)}`, 20, y);
    y += 7;
    doc.text(`Total Expenses: ${formatMoney(totalExpenses)}`, 20, y);
    y += 7;
    doc.setTextColor(netSavings >= 0 ? 34 : 220, netSavings >= 0 ? 197 : 38, netSavings >= 0 ? 94 : 38);
    doc.text(`Net Savings: ${formatMoney(netSavings)}`, 20, y);
    y += 15;

    checkPageBreak(40);

    // Section: Budget Overview
    if (data.systemBudgets && data.systemBudgets.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(59, 130, 246);
        doc.text('System Budgets', 20, y);
        y += 10;

        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        data.systemBudgets.slice(0, 5).forEach(budget => {
            doc.text(`${budget.name}: ${formatMoney(budget.budgetAmount || 0)}`, 25, y);
            y += 6;
        });
        y += 5;
    }

    checkPageBreak(40);

    // Section: Custom Budgets
    if (data.customBudgets && data.customBudgets.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(59, 130, 246);
        doc.text('Custom Budgets', 20, y);
        y += 10;

        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        data.customBudgets.slice(0, 5).forEach(budget => {
            doc.text(`${budget.name}: ${formatMoney(budget.allocatedAmount || 0)} (${budget.status})`, 25, y);
            y += 6;
        });
    }
}

async function renderDetailedReport(doc, data, startY, checkPageBreak, formatMoney) {
    let y = startY;

    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text('Transaction List', 20, y);
    y += 10;

    // Table header
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont(undefined, 'bold');
    doc.text('Date', 20, y);
    doc.text('Description', 50, y);
    doc.text('Category', 120, y);
    doc.text('Amount', 170, y);
    y += 7;
    doc.setFont(undefined, 'normal');

    // Table rows
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    if (data.transactions && data.transactions.length > 0) {
        data.transactions.forEach(tx => {
            checkPageBreak(10);
            
            const date = tx.date || 'N/A';
            const title = (tx.title || 'Untitled').substring(0, 30);
            const category = (tx.category || 'Uncategorized').substring(0, 20);
            const amount = tx.type === 'income' 
                ? `+${formatMoney(tx.amount || 0)}` 
                : `-${formatMoney(tx.amount || 0)}`;

            doc.text(date, 20, y);
            doc.text(title, 50, y);
            doc.text(category, 120, y);
            doc.setTextColor(tx.type === 'income' ? 34 : 220, tx.type === 'income' ? 197 : 38, tx.type === 'income' ? 94 : 38);
            doc.text(amount, 170, y);
            doc.setTextColor(30, 41, 59);
            y += 6;
        });
    } else {
        doc.text('No transactions to display', 20, y);
    }
}

async function renderComprehensiveReport(doc, data, startY, checkPageBreak, formatMoney) {
    let y = startY;

    // Part 1: Summary
    await renderSummaryReport(doc, data, y, checkPageBreak, formatMoney);
    
    // Part 2: Add new page for detailed list
    doc.addPage();
    y = 20;
    await renderDetailedReport(doc, data, y, checkPageBreak, formatMoney);

    // Part 3: Analysis section
    doc.addPage();
    y = 20;

    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text('Category Breakdown', 20, y);
    y += 10;

    if (data.transactions && data.categories) {
        const categoryTotals = {};
        
        data.transactions
            .filter(t => t.type === 'expense')
            .forEach(tx => {
                const catName = tx.category || 'Uncategorized';
                categoryTotals[catName] = (categoryTotals[catName] || 0) + (tx.amount || 0);
            });

        const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        sorted.slice(0, 15).forEach(([cat, total]) => {
            checkPageBreak(8);
            doc.text(`${cat}: ${formatMoney(total)}`, 25, y);
            y += 7;
        });
    }
}