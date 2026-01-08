/**
 * Safe-Insert PWA - Vanilla JS Implementation
 * 
 * Architecture:
 * - Store: Gerencia estado e persistência (localStorage)
 * - Router: Gerencia qual "View" exibir
 * - UI: Utilitários de renderização de HTML
 * - App: Inicialização
 */

// ==========================================
// STORE (Data Management)
// ==========================================
const Store = {
    data: {
        transactions: [],
        customCategories: ['Transporte', 'Alimentação', 'Hospedagem'],
        homeCategories: ['Água', 'Luz', 'Internet', 'Aluguel', 'Cartão de Crédito'],
        selectedDate: new Date().toISOString(),
        selectedMonth: new Date().toISOString(),
        reportFilter: 'monthly', // weekly, monthly, yearly, custom
        reportStartDate: '', // YYYY-MM-DD
        reportEndDate: '', // YYYY-MM-DD
        accounts: [], // { id, name, type: 'mei'|'cash', initialBalance, currentBalance }
    },

    init() {
        const savedTrans = localStorage.getItem('st_transactions');
        const savedCustomCats = localStorage.getItem('st_customCategories');
        const savedHomeCats = localStorage.getItem('st_homeCategories');
        const savedAccounts = localStorage.getItem('st_accounts');

        if (savedTrans) this.data.transactions = JSON.parse(savedTrans);
        if (savedCustomCats) this.data.customCategories = JSON.parse(savedCustomCats);
        if (savedHomeCats) this.data.homeCategories = JSON.parse(savedHomeCats);

        if (savedAccounts) {
            this.data.accounts = JSON.parse(savedAccounts);
        } else {
            // Default Accounts
            this.data.accounts = [
                { id: 'cash-1', name: 'Dinheiro (Não Fiscal)', type: 'cash', initialBalance: 0 }
            ];
            this.save();
        }

        // Init default report dates (current month)
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        this.data.reportStartDate = firstDay.toISOString().split('T')[0];
        this.data.reportEndDate = lastDay.toISOString().split('T')[0];
    },

    save() {
        localStorage.setItem('st_transactions', JSON.stringify(this.data.transactions));
        localStorage.setItem('st_customCategories', JSON.stringify(this.data.customCategories));
        localStorage.setItem('st_homeCategories', JSON.stringify(this.data.homeCategories));
        localStorage.setItem('st_accounts', JSON.stringify(this.data.accounts));
        // Trigger UI update
        router.renderResults();
    },

    addAccount(account) {
        account.id = crypto.randomUUID();
        this.data.accounts.push(account);
        this.save();
    },

    updateAccount(id, updates) {
        const idx = this.data.accounts.findIndex(a => a.id === id);
        if (idx !== -1) {
            this.data.accounts[idx] = { ...this.data.accounts[idx], ...updates };
            this.save();
        }
    },

    deleteAccount(id) {
        this.data.accounts = this.data.accounts.filter(a => a.id !== id);
        this.save();
    },

    getAccountLimitStatus(accountId) {
        const account = this.data.accounts.find(a => a.id === accountId);
        if (!account || account.type !== 'mei') return null;

        // Calculate total income for this account in current year
        const currentYear = new Date().getFullYear();
        const yearIncome = this.data.transactions
            .filter(t => t.accountId === accountId && t.type === 'income' && new Date(t.date).getFullYear() === currentYear)
            .reduce((acc, t) => acc + t.amount, 0);

        const total = (account.initialBalance || 0) + yearIncome;
        const limitSafe = 81000;
        const limitMax = 97200;

        let status = 'safe'; // safe, warning, critical
        if (total > limitMax) status = 'critical';
        else if (total > limitSafe) status = 'warning';

        return { total, limitSafe, limitMax, status, percent: (total / limitSafe) * 100 };
    },

    getAccountMonthlyStatus(accountId) {
        const account = this.data.accounts.find(a => a.id === accountId);
        if (!account || account.type !== 'mei') return null;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthIncome = this.data.transactions
            .filter(t =>
                t.accountId === accountId &&
                t.type === 'income' &&
                new Date(t.date).getMonth() === currentMonth &&
                new Date(t.date).getFullYear() === currentYear
            )
            .reduce((acc, t) => acc + t.amount, 0);

        const limitSafe = 6750; // 81k / 12

        return { total: monthIncome, limitSafe, percent: (monthIncome / limitSafe) * 100 };
    },

    addTransaction(t) {
        t.id = crypto.randomUUID();
        t.createdAt = new Date().toISOString();
        this.data.transactions.push(t);
        this.save();
    },

    updateTransaction(id, updates) {
        const index = this.data.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.data.transactions[index] = { ...this.data.transactions[index], ...updates };
            this.save();
        }
    },

    addCustomCategory(name) {
        if (!this.data.customCategories.includes(name)) {
            this.data.customCategories.push(name);
            this.save();
        }
    },

    // Helpers
    formatCurrency(val) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    },

    // Date Helpers
    isSameDay(d1Str, d2Str) {
        const d1 = new Date(d1Str);
        const d2 = new Date(d2Str);
        return d1.toDateString() === d2.toDateString();
    },

    isSameMonth(d1Str, d2Str) {
        const d1 = new Date(d1Str);
        const d2 = new Date(d2Str);
        return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    },

    isWithinRange(dateStr, startStr, endStr) {
        const d = new Date(dateStr);
        // Ajustar start para 00:00:00 e end para 23:59:59
        const start = new Date(startStr);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endStr);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
    },

    // Data Management
    getBackupData() {
        return JSON.stringify(this.data);
    },

    loadBackupData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!data.transactions || !data.accounts) throw new Error('Formato inválido');
            this.data = data;
            this.save();
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    clearAllData() {
        this.data.transactions = [];
        this.data.accounts = [];
        this.data.customCategories = ['Transporte', 'Alimentação', 'Hospedagem'];
        this.data.homeCategories = ['Água', 'Luz', 'Internet', 'Aluguel', 'Cartão de Crédito'];
        localStorage.clear();

        // Force re-init to set defaults
        this.init();
        this.save();

        alert('Todas as informações foram apagadas com sucesso.');
        window.location.reload();
    },

};

// ==========================================
// VIEWS (Templates)
// ==========================================
const Views = {
    work() {
        const dateObj = new Date(Store.data.selectedDate);
        const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
        const dateStr = dateObj.toLocaleDateString('pt-BR');

        // Filter Transactions
        const daily = Store.data.transactions.filter(t =>
            !t.isHomeExpense && Store.isSameDay(t.date, Store.data.selectedDate)
        );
        const income = daily.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = daily.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const balance = income - expense;

        const transactionsHtml = daily.length === 0
            ? '<p class="text-center text-gray-400 py-4 italic text-sm">Nenhum registro hoje.</p>'
            : daily.map(t => {
                const account = Store.data.accounts.find(a => a.id === t.accountId);
                const accLabel = account ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 ml-2">${account.name}</span>` : '';

                return `
                <div class="bg-white p-4 rounded-xl shadow-sm border ${t.type === 'income' ? 'border-green-50' : 'border-red-50'} flex justify-between items-center mb-2 group">
                    <div class="flex items-center gap-3">
                        ${t.type === 'expense'
                        ? `<div class="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 font-bold text-xs uppercase">${t.category.substring(0, 2)}</div>`
                        : `<div class="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600"><i data-lucide="arrow-down-left" class="w-4 h-4"></i></div>`
                    }
                        <div>
                            <p class="font-semibold text-gray-900 flex items-center">${t.type === 'income' ? t.description : t.category} ${accLabel}</p>
                            <p class="text-xs text-gray-400">${new Date(t.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}">
                            ${t.type === 'income' ? '+' : '-'}${Store.formatCurrency(t.amount)}
                        </span>
                        <button onclick="Actions.deleteTransaction('${t.id}')" class="text-gray-300 hover:text-red-500 transition-colors p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
            `}).join('');

        // Account Limits Status (Only MEI)


        return `
            <!-- Header Top -->
            <div class="flex justify-between items-center mb-4 px-2">
                <h1 class="text-xl font-bold text-gray-800">Trabalho</h1>
                <button onclick="ui.openModal('settings')" class="p-2 bg-white border border-gray-200 rounded-full text-gray-600 shadow-sm active:scale-95 transition-transform"><i data-lucide="settings" class="w-5 h-5"></i></button>
            </div>



            <!-- Date Nav -->
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex items-center justify-between sticky top-0 z-10">
                <button onclick="Actions.changeDate(-1)" class="p-2 bg-gray-50 rounded-full text-blue-500"><i data-lucide="chevron-left"></i></button>
                <div class="text-center">
                    <h2 class="font-bold capitalize text-gray-900">${dayName}</h2>
                    <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">${dateStr}</span>
                </div>
                <button onclick="Actions.changeDate(1)" class="p-2 bg-gray-50 rounded-full text-blue-500"><i data-lucide="chevron-right"></i></button>
            </div>



            <!-- Resumo Dia -->
            <div class="bg-white rounded-xl p-6 shadow-sm mb-6 text-center border-t-4 ${balance >= 0 ? 'border-green-500' : 'border-red-500'}">
                <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Saldo do Dia</span>
                <div class="text-4xl font-bold mt-2 ${balance >= 0 ? 'text-green-600' : 'text-red-500'}">${Store.formatCurrency(balance)}</div>
                
                <div class="flex justify-center gap-8 mt-6">
                    <div>
                        <span class="text-xs text-gray-400 block">Entradas</span>
                        <span class="text-green-600 font-semibold text-lg">${Store.formatCurrency(income)}</span>
                    </div>
                    <div class="w-px bg-gray-100 h-10"></div>
                    <div>
                        <span class="text-xs text-gray-400 block">Saídas</span>
                        <span class="text-red-500 font-semibold text-lg">${Store.formatCurrency(expense)}</span>
                    </div>
                </div>
            </div>

            <!-- Ações -->
            <div class="grid grid-cols-2 gap-3 mb-6">
                <button onclick="ui.openModal('income')" class="bg-green-500 active:bg-green-600 text-white p-4 rounded-xl shadow-lg shadow-green-200 flex flex-col items-center gap-1">
                    <i data-lucide="plus-circle"></i>
                    <span class="font-medium text-sm">Entrada</span>
                </button>
                <button onclick="ui.openModal('expense')" class="bg-red-500 active:bg-red-600 text-white p-4 rounded-xl shadow-lg shadow-red-200 flex flex-col items-center gap-1">
                    <i data-lucide="minus-circle"></i>
                    <span class="font-medium text-sm">Despesa</span>
                </button>
            </div>

            <!-- Lista -->
            <h3 class="font-bold text-gray-700 mb-3 flex items-center gap-2"><div class="w-1 h-4 bg-blue-500 rounded"></div>Histórico</h3>
            <div class="pb-20">
                ${transactionsHtml}
            </div>
        `;
    },

    home() {
        const dateObj = new Date(Store.data.selectedMonth);
        const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        const monthly = Store.data.transactions.filter(t =>
            t.isHomeExpense && Store.isSameMonth(t.date, Store.data.selectedMonth)
        );

        const total = monthly.reduce((acc, t) => acc + t.amount, 0);

        const listHtml = monthly.length === 0
            ? '<p class="text-center text-gray-400 py-4 italic text-sm">Nenhuma conta este mês.</p>'
            : monthly.map(t => `
            <div class="bg-white p-4 rounded-xl shadow-sm border ${t.isPaid ? 'border-green-200 bg-green-50/50' : 'border-yellow-200'} flex justify-between items-center mb-2 transition-all">
                <div class="flex items-center gap-3">
                    <button onclick="Actions.togglePaid('${t.id}')" class="${t.isPaid ? 'text-green-500' : 'text-gray-300'}">
                        <i data-lucide="${t.isPaid ? 'check-circle-2' : 'circle'}" class="w-7 h-7"></i>
                    </button>
                    <div>
                        <p class="font-semibold ${t.isPaid ? 'text-gray-500 line-through' : 'text-gray-900'}">${t.category}</p>
                        <p class="text-xs text-gray-400">${t.dueDate ? 'Vence: ' + new Date(t.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Fixo'}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-bold text-lg text-gray-700">${Store.formatCurrency(t.amount)}</span>
                    <button onclick="Actions.deleteTransaction('${t.id}')" class="text-gray-300 hover:text-red-500 transition-colors p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
        `).join('');

        return `
             <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex items-center justify-between sticky top-0 z-10">
                <button onclick="Actions.changeMonth(-1)" class="p-2 bg-gray-50 rounded-full text-blue-500"><i data-lucide="chevron-left"></i></button>
                <h2 class="font-bold capitalize text-gray-900 text-lg">${monthName}</h2>
                <button onclick="Actions.changeMonth(1)" class="p-2 bg-gray-50 rounded-full text-blue-500"><i data-lucide="chevron-right"></i></button>
            </div>

            <div class="bg-slate-800 text-white rounded-xl p-6 shadow-lg mb-6 text-center">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Custo Fixo Mensal</span>
                <div class="text-4xl font-bold mt-2">${Store.formatCurrency(total)}</div>
            </div>

            <button onclick="ui.openModal('home_expense')" class="w-full bg-blue-500 active:bg-blue-600 text-white p-4 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 mb-6 text-lg font-semibold">
                <i data-lucide="plus"></i> Adicionar Conta
            </button>

            <div class="pb-20">
                ${listHtml}
            </div>
        `;
    },

    reports() {
        const { reportFilter, reportStartDate, reportEndDate } = Store.data;

        // Validar e Filtrar Transações
        const filtered = Store.data.transactions.filter(t =>
            Store.isWithinRange(t.date, reportStartDate, reportEndDate)
        );

        const workIncome = filtered.filter(t => !t.isHomeExpense && t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const workExpense = filtered.filter(t => !t.isHomeExpense && t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const homeCost = filtered.filter(t => t.isHomeExpense).reduce((acc, t) => acc + t.amount, 0);
        const workProfit = workIncome - workExpense;
        const totalBalance = workProfit - homeCost;

        // Renderização dos botões de filtro
        const filters = [
            { id: 'weekly', label: 'Semanal' },
            { id: 'monthly', label: 'Mensal' },
            { id: 'yearly', label: 'Anual' },
            { id: 'custom', label: 'Outro' }
        ];

        const filterButtonsHtml = filters.map(f => `
            <button
                onclick="Actions.setReportFilter('${f.id}')"
                class="flex-1 py-2 px-1 text-xs font-semibold rounded-lg transition-colors ${reportFilter === f.id ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}"
            >
                ${f.label}
            </button>
        `).join('');

        const customDateInputHtml = reportFilter === 'custom' ? `
            <div class="flex gap-2 mb-4 animate-in fade-in slide-in-from-top-1">
                <div class="flex-1">
                    <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Início</label>
                    <input type="date" value="${reportStartDate}" onchange="Actions.changeReportDate('start', this.value)" class="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm font-medium focus:border-blue-500 outline-none">
                </div>
                <div class="flex-1">
                    <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Fim</label>
                    <input type="date" value="${reportEndDate}" onchange="Actions.changeReportDate('end', this.value)" class="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm font-medium focus:border-blue-500 outline-none">
                </div>
            </div>
        ` : `<div class="mb-4 text-center text-xs text-gray-400 font-medium bg-gray-50 py-2 rounded-lg border border-gray-100">
                ${new Date(reportStartDate).toLocaleDateString('pt-BR')} até ${new Date(reportEndDate).toLocaleDateString('pt-BR')}
             </div>`;

        return `
            <div class="p-2 pb-24">
                <h2 class="text-2xl font-bold mb-4 text-gray-900 px-2">Relatórios</h2>

                <!-- Filtros -->
                <div class="flex gap-2 mb-4 px-1">
                    ${filterButtonsHtml}
                </div>
                
                <div class="px-1">
                    ${customDateInputHtml}
                </div>

                <div class="space-y-4">
                    <div class="bg-white p-5 rounded-xl border-l-4 border-blue-500 shadow-sm">
                        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Performance Profissional</h3>
                        <div class="flex justify-between text-sm mb-1">
                            <span class="text-gray-600">Faturamento</span>
                            <span class="font-semibold text-green-600">+${Store.formatCurrency(workIncome)}</span>
                        </div>
                        <div class="flex justify-between text-sm mb-3">
                            <span class="text-gray-600">Custos Op.</span>
                            <span class="font-semibold text-red-500">-${Store.formatCurrency(workExpense)}</span>
                        </div>
                        <div class="border-t pt-2 flex justify-between items-center">
                            <span class="font-bold text-gray-800">Lucro Líquido</span>
                            <span class="font-bold text-xl text-blue-600">${Store.formatCurrency(workProfit)}</span>
                        </div>
                    </div>

                    <div class="bg-white p-5 rounded-xl border-l-4 border-orange-400 shadow-sm">
                        <div class="flex justify-between items-center">
                            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Custo Doméstico Total</h3>
                            <span class="font-bold text-lg text-orange-500">-${Store.formatCurrency(homeCost)}</span>
                        </div>
                    </div>

                    <div class="p-6 rounded-xl text-center border-2 ${totalBalance >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}">
                        <span class="text-sm font-bold text-gray-500 uppercase tracking-widest block mb-1">
                            ${totalBalance >= 0 ? 'Saldo Livre' : 'Prejuízo Total'}
                        </span>
                        <span class="text-4xl font-extrabold tracking-tight ${totalBalance >= 0 ? 'text-green-700' : 'text-red-700'}">
                            ${Store.formatCurrency(totalBalance)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    },

    mei() {
        // Recalcular status para garantir dados frescos
        const list = Store.data.accounts.map(a => {
            const annualStatus = Store.getAccountLimitStatus(a.id);
            const monthlyStatus = Store.getAccountMonthlyStatus(a.id);
            let limitInfo = '';

            if (a.type === 'mei' && annualStatus && monthlyStatus) {
                // Helper para cor da barra
                const getBarColor = (p) => {
                    if (p >= 90) return 'bg-red-500';
                    if (p >= 60) return 'bg-orange-500';
                    if (p >= 30) return 'bg-yellow-400';
                    return 'bg-green-500';
                };

                limitInfo = `
                    <div class="mt-3 space-y-3">
                        <!-- Anual -->
                        <div>
                             <div class="flex justify-between items-center mb-1">
                                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Ano (81k)</span>
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] font-bold bg-gray-50 px-1.5 py-0.5 rounded text-gray-500">${annualStatus.percent.toFixed(1)}%</span>
                                    <span class="text-xs font-bold text-gray-700">${Store.formatCurrency(annualStatus.total)}</span>
                                </div>
                            </div>
                            <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div class="${getBarColor(annualStatus.percent)} h-2 rounded-full transition-all" style="width: ${Math.min(annualStatus.percent, 100)}%"></div>
                            </div>
                        </div>

                        <!-- Mensal -->
                        <div>
                             <div class="flex justify-between items-center mb-1">
                                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Mês (6.75k)</span>
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] font-bold bg-gray-50 px-1.5 py-0.5 rounded text-gray-500">${monthlyStatus.percent.toFixed(1)}%</span>
                                    <span class="text-xs font-bold text-gray-700">${Store.formatCurrency(monthlyStatus.total)}</span>
                                </div>
                            </div>
                            <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div class="${getBarColor(monthlyStatus.percent)} h-2 rounded-full transition-all" style="width: ${Math.min(monthlyStatus.percent, 100)}%"></div>
                            </div>
                        </div>
                    </div>
                `;
            }

            return `
            <div class="bg-white p-5 rounded-xl border border-gray-100 mb-3 shadow-sm relative group">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="font-bold text-gray-800 text-lg flex items-center gap-2">
                            ${a.name} 
                            ${a.type === 'mei' ? '<span class="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full uppercase font-bold">MEI</span>' : '<span class="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full uppercase font-bold">CX</span>'}
                        </p>
                        ${a.cnpj ? `<p class="text-xs text-gray-500 font-mono mt-0.5">CNPJ: ${a.cnpj}</p>` : ''}
                    </div>
                    ${a.type !== 'cash' ? `<button onclick="Actions.deleteAccount('${a.id}')" class="text-gray-300 hover:text-red-500 p-2"><i data-lucide="trash-2" class="w-5 h-5"></i></button>` : ''}
                </div>
                
                ${a.description ? `<p class="text-sm text-gray-600 mb-3 italic bg-gray-50 p-2 rounded-lg border border-gray-100">"${a.description}"</p>` : ''}
                
                <div class="grid grid-cols-2 gap-4 text-xs">
                     <div>
                        <span class="block text-gray-400 uppercase font-bold text-[10px]">Saldo Inicial (Ano)</span>
                        <span class="font-bold text-gray-700 text-sm">${Store.formatCurrency(a.initialBalance || 0)}</span>
                    </div>
                     <div>
                        <span class="block text-gray-400 uppercase font-bold text-[10px]">Saldo Atual</span>
                        <span class="font-bold text-green-600 text-sm">--</span>
                    </div>
                </div>

                ${limitInfo}
            </div>
        `}).join('');

        return `
            <div class="p-4 pb-24">
                <h2 class="text-2xl font-bold mb-6 text-gray-900">Gerenciar Contas & MEI</h2>
                
                ${(() => {
                const hasMei = Store.data.accounts.some(a => a.type === 'mei');
                if (hasMei) return '';

                return `
                    <form onsubmit="Actions.createAccount(event)" class="bg-white p-5 rounded-xl shadow-sm border border-blue-200 mb-8 relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full -mr-10 -mt-10 blur-xl"></div>
                        
                        <p class="text-sm font-bold mb-4 text-blue-700 flex items-center gap-2 relative z-10"><i data-lucide="plus-circle" class="w-4 h-4"></i> Nova Conta</p>
                        
                        <div class="space-y-4 relative z-10">
                            <div>
                                <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome da Conta</label>
                                <input id="inp-acc-name" type="text" class="w-full bg-gray-50/50 focus:bg-white p-3 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-blue-500 transition-colors" placeholder="Ex: MEI Consultoria" required>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CNPJ (Opcional)</label>
                                    <input id="inp-acc-cnpj" type="text" class="w-full bg-gray-50/50 focus:bg-white p-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 transition-colors" placeholder="00.000...">
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Saldo Inicial</label>
                                    <input id="inp-acc-initial" type="number" step="0.01" class="w-full bg-gray-50/50 focus:bg-white p-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 transition-colors" placeholder="R$ 0,00">
                                </div>
                            </div>
                            
                            <div>
                                <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição</label>
                                <textarea id="inp-acc-desc" class="w-full bg-gray-50/50 focus:bg-white p-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 transition-colors" rows="2" placeholder="Ex: Conta principal para recebimento de serviços..."></textarea>
                            </div>
                        </div>

                        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-4 rounded-xl font-bold text-sm mt-6 shadow-lg shadow-blue-200 transition-all transform active:scale-95">Cadastrar Conta</button>
                    </form>
                    `;
            })()}

                <h3 class="font-bold text-gray-400 text-xs uppercase mb-4 pl-1">Minhas Contas</h3>
                <div class="space-y-2">
                    ${list}
                </div>
            </div>
        `;
    }
};

// ==========================================
// ACTIONS (Logic)
// ==========================================
const Actions = {
    changeDate(delta) {
        const d = new Date(Store.data.selectedDate);
        d.setDate(d.getDate() + delta);
        Store.data.selectedDate = d.toISOString();
        router.renderResults();
    },

    changeMonth(delta) {
        const d = new Date(Store.data.selectedMonth);
        d.setMonth(d.getMonth() + delta);
        Store.data.selectedMonth = d.toISOString();
        router.renderResults();
    },

    // Report Actions
    setReportFilter(type) {
        Store.data.reportFilter = type;
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);

        if (type === 'weekly') {
            const day = start.getDay();
            const diff = start.getDate() - day;
            start.setDate(diff);
            end.setDate(diff + 6);
        } else if (type === 'monthly') {
            start.setDate(1);
            end.setMonth(end.getMonth() + 1, 0);
        } else if (type === 'yearly') {
            start.setMonth(0, 1);
            end.setMonth(11, 31);
        }

        if (type !== 'custom') {
            Store.data.reportStartDate = start.toISOString().split('T')[0];
            Store.data.reportEndDate = end.toISOString().split('T')[0];
        }

        router.renderResults();
    },

    changeReportDate(field, value) {
        if (field === 'start') Store.data.reportStartDate = value;
        if (field === 'end') Store.data.reportEndDate = value;
        router.renderResults();
    },

    togglePaid(id) {
        const t = Store.data.transactions.find(item => item.id === id);
        if (t) {
            Store.updateTransaction(id, { isPaid: !t.isPaid });
        }
    },

    deleteTransaction(id) {
        if (confirm('Tem certeza que deseja excluir este registro?')) {
            Store.data.transactions = Store.data.transactions.filter(t => t.id !== id);
            Store.save();
        }
    },

    createAccount(e) {
        e.preventDefault();
        const name = document.getElementById('inp-acc-name').value;
        const cnpj = document.getElementById('inp-acc-cnpj').value;
        const description = document.getElementById('inp-acc-desc').value;
        const initial = parseFloat(document.getElementById('inp-acc-initial').value || 0);

        if (!name) return;

        Store.addAccount({
            name,
            cnpj: cnpj || '',
            description: description || '',
            initialBalance: initial,
            type: 'mei'
        });
        ui.openModal('accounts');
    },

    deleteAccount(id) {
        if (confirm('Tem certeza? Isso apaga a conta. Transações antigas ficarão sem vínculo.')) {
            Store.deleteAccount(id);
            ui.openModal('accounts');
        }
    },

    submitIncome(e) {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('inp-amount').value);
        const desc = document.getElementById('inp-desc').value;
        const accountId = document.getElementById('inp-account').value;

        if (!amount || !accountId) return;

        // Check for MEI Limit Warning (MONTHLY)
        const account = Store.data.accounts.find(a => a.id === accountId);
        if (account && account.type === 'mei') {
            const status = Store.getAccountMonthlyStatus(accountId);
            // Simular novo total
            const newTotal = status.total + amount;
            const newPercent = (newTotal / status.limitSafe) * 100;

            if (newPercent >= 75) {
                const confirmMsg = `
ATENÇÃO: ALERTA DE LIMITE MENSAL MEI!

Com essa entrada, a conta "${account.name}" atingirá ${newPercent.toFixed(1)}% do limite mensal recomendado de R$ 6.750,00.

Considere lançar esta receita em outra conta ou Pessoa Física se possível para evitar estourar a média mensal.

Deseja continuar mesmo assim?
                `;
                if (!confirm(confirmMsg)) return;
            }
        }

        Store.addTransaction({
            type: 'income',
            amount,
            description: desc || 'Venda',
            date: Store.data.selectedDate,
            isHomeExpense: false,
            accountId: accountId
        });
        ui.closeModal();
    },

    submitExpense(e) {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('inp-exp-amount').value);
        let category = document.getElementById('inp-category').value;
        const accountId = document.getElementById('inp-exp-account').value;
        const newCat = document.getElementById('inp-new-cat')?.value;

        if (newCat) {
            Store.addCustomCategory(newCat);
            category = newCat;
        }

        if (!amount || !accountId) return;

        Store.addTransaction({
            type: 'expense',
            amount,
            category: category || 'Outros',
            date: Store.data.selectedDate,
            isHomeExpense: false,
            accountId: accountId
        });
        ui.closeModal();
    },

    submitHomeExpense(e) {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('inp-home-amount').value);
        const category = document.getElementById('inp-home-cat').value;
        const isPaid = document.getElementById('inp-is-paid').checked;

        if (!amount) return;

        Store.addTransaction({
            type: 'expense',
            amount,
            category,
            date: Store.data.selectedMonth,
            isHomeExpense: true,
            isPaid: isPaid
        });
        ui.closeModal();
    },

    // Data Actions
    downloadBackup() {
        const data = Store.getBackupData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `safe-insert-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    triggerUpload() {
        document.getElementById('file-upload').click();
    },

    processUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const success = Store.loadBackupData(e.target.result);
            if (success) {
                alert('Backup restaurado com sucesso!');
                router.renderResults();
            } else {
                alert('Erro ao ler arquivo de backup. Verifique se é um arquivo válido.');
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    },

    askReset() {
        ui.openModal('reset_confirm');
    },

    confirmReset() {
        Store.clearAllData();
        ui.closeModal();
        alert('Dados apagados e resetados para o padrão.');
        router.renderResults();
    }
};

// ==========================================
// UI / ROUTER
// ==========================================
const router = {
    current: 'work',

    navigate(route) {
        this.current = route;

        ['work', 'mei', 'home', 'reports'].forEach(r => {
            const btn = document.getElementById('nav-' + r);
            if (r === route) {
                btn.classList.remove('text-gray-400');
                btn.classList.add('text-blue-600');
            } else {
                btn.classList.add('text-gray-400');
                btn.classList.remove('text-blue-600');
            }
        });

        this.renderResults();
    },

    renderResults() {
        const app = document.getElementById('app-content');
        app.innerHTML = Views[this.current]();
        lucide.createIcons();
    }
};

const ui = {
    openModal(type) {
        const overlay = document.getElementById('modal-overlay');
        const content = document.getElementById('modal-content');
        overlay.classList.remove('hidden');

        if (type === 'income') {
            const accounts = Store.data.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
            content.innerHTML = `
                <div class="bg-white px-4 py-3 flex justify-between items-center border-b sticky top-0">
                    <h3 class="font-bold">Nova Entrada</h3>
                    <button onclick="ui.closeModal()" class="bg-gray-100 p-1 rounded-full"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <form onsubmit="Actions.submitIncome(event)" class="p-6 space-y-4">
                    <div>
                        <label class="text-xs font-bold text-gray-400 uppercase">Valor</label>
                        <input id="inp-amount" type="number" step="0.01" inputmode="decimal" class="ios-input text-4xl font-bold w-full border-b-2 border-green-500 py-2" placeholder="0,00" autoFocus required>
                    </div>
                    <div>
                        <label class="text-sm font-bold text-gray-700">Conta / Destino</label>
                        <select id="inp-account" class="w-full bg-white p-4 text-lg font-medium rounded-xl border border-gray-300 mt-1 shadow-sm focus:border-blue-500 outline-none">
                            ${accounts}
                        </select>
                    </div>
                    <div>
                        <label class="text-sm font-medium">Descrição / Cliente</label>
                        <input id="inp-desc" type="text" class="w-full bg-white p-3 rounded-xl border border-gray-200 mt-1" placeholder="Ex: Cliente Silva">
                    </div>
                    <button type="submit" class="w-full bg-green-500 text-white p-4 rounded-xl font-bold text-lg mt-4 shadow-lg shadow-green-200">Confirmar</button>
                </form>
            `;
        } else if (type === 'accounts') {
            const list = Store.data.accounts.map(a => `
                <div class="bg-white p-4 rounded-lg border border-gray-100 mb-3 shadow-sm">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <p class="font-bold text-gray-800 text-lg">${a.name}</p>
                            <p class="text-xs text-gray-400 font-medium uppercase tracking-wide">${a.type}</p>
                        </div>
                        ${a.type !== 'cash' ? `<button onclick="Actions.deleteAccount('${a.id}')" class="text-red-500 bg-red-50 p-2 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : ''}
                    </div>
                    
                    ${a.description ? `<p class="text-sm text-gray-600 mb-1 italic">"${a.description}"</p>` : ''}
                    ${a.cnpj ? `<p class="text-xs text-gray-500 font-mono mb-2">CNPJ: ${a.cnpj}</p>` : ''}
                    
                    <div class="text-xs bg-gray-50 p-2 rounded border border-gray-100">
                        Inicial: <span class="font-bold text-gray-700">${Store.formatCurrency(a.initialBalance || 0)}</span>
                    </div>
                </div>
            `).join('');

            const hasMei = Store.data.accounts.some(a => a.type === 'mei');

            content.innerHTML = `
                <div class="bg-white px-4 py-3 flex justify-between items-center border-b sticky top-0">
                    <h3 class="font-bold">Gerenciar Contas</h3>
                    <button onclick="ui.closeModal()" class="bg-gray-100 p-1 rounded-full"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <div class="p-4 bg-gray-50/50 h-[80vh] overflow-y-auto">
                    ${!hasMei ? `
                    <form onsubmit="Actions.createAccount(event)" class="bg-white p-4 rounded-xl shadow-sm border border-blue-100 mb-6">
                        <p class="text-sm font-bold mb-3 text-blue-600 flex items-center gap-2"><i data-lucide="plus-circle" class="w-4 h-4"></i> Nova Conta MEI</p>
                        
                        <div class="space-y-3">
                            <div>
                                <label class="text-[10px] font-bold text-gray-400 uppercase">Nome da Conta</label>
                                <input id="inp-acc-name" type="text" class="w-full bg-gray-50 p-2 rounded-lg border border-gray-200 text-sm" placeholder="Ex: MEI Consultoria" required>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="text-[10px] font-bold text-gray-400 uppercase">CNPJ (Opcional)</label>
                                    <input id="inp-acc-cnpj" type="text" class="w-full bg-gray-50 p-2 rounded-lg border border-gray-200 text-sm" placeholder="00.000.000/0001-00">
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-gray-400 uppercase">Saldo Inicial (Ano)</label>
                                    <input id="inp-acc-initial" type="number" step="0.01" class="w-full bg-gray-50 p-2 rounded-lg border border-gray-200 text-sm" placeholder="R$ 0,00">
                                </div>
                            </div>
                            
                            <div>
                                <label class="text-[10px] font-bold text-gray-400 uppercase">Descrição</label>
                                <textarea id="inp-acc-desc" class="w-full bg-gray-50 p-2 rounded-lg border border-gray-200 text-sm" rows="2" placeholder="Conta principal para serviços..."></textarea>
                            </div>
                        </div>

                        <button type="submit" class="w-full bg-blue-500 text-white py-3 rounded-lg font-bold text-sm mt-4 shadow-lg shadow-blue-200">Criar Conta</button>
                    </form>
                    ` : ''}

                    <h4 class="font-bold text-gray-400 text-xs uppercase mb-2 ml-1">Contas Existentes</h4>
                    ${list}
                </div>
            `;
        } else if (type === 'expense') {
            const cats = Store.data.customCategories.map(c => `<option value="${c}">${c}</option>`).join('');
            const accounts = Store.data.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');

            content.innerHTML = `
                 <div class="bg-white px-4 py-3 flex justify-between items-center border-b sticky top-0">
                    <h3 class="font-bold">Nova Despesa</h3>
                    <button onclick="ui.closeModal()" class="bg-gray-100 p-1 rounded-full"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <form onsubmit="Actions.submitExpense(event)" class="p-6 space-y-4">
                    <div>
                        <label class="text-xs font-bold text-gray-400 uppercase">Valor</label>
                        <input id="inp-exp-amount" type="number" step="0.01" inputmode="decimal" class="ios-input text-4xl font-bold w-full border-b-2 border-red-500 py-2" placeholder="0,00" autoFocus required>
                    </div>
                    
                    <div>
                        <label class="text-sm font-bold text-gray-700">Conta / Origem</label>
                        <select id="inp-exp-account" class="w-full bg-white p-3 rounded-xl border border-gray-300 mt-1 shadow-sm">
                            ${accounts}
                        </select>
                    </div>

                    <div>
                        <label class="text-sm font-medium">Categoria</label>
                        <select id="inp-category" class="w-full bg-white p-3 rounded-xl border border-gray-200 mt-1" onchange="if(this.value==='new'){document.getElementById('new-cat-box').classList.remove('hidden')}else{document.getElementById('new-cat-box').classList.add('hidden')}">
                            ${cats}
                            <option value="new">+ Nova Categoria...</option>
                        </select>
                    </div>
                    <div id="new-cat-box" class="hidden">
                         <input id="inp-new-cat" type="text" class="w-full bg-gray-50 p-3 rounded-xl border border-blue-200 mt-1" placeholder="Nome da nova categoria">
                    </div>
                    <button type="submit" class="w-full bg-red-500 text-white p-4 rounded-xl font-bold text-lg mt-4 shadow-lg shadow-red-200">Confirmar</button>
                </form>
            `;
        } else if (type === 'home_expense') {
            const cats = Store.data.homeCategories.map(c => `<option value="${c}">${c}</option>`).join('');
            content.innerHTML = `
                <div class="bg-white px-4 py-3 flex justify-between items-center border-b sticky top-0">
                    <h3 class="font-bold">Conta Fixa</h3>
                    <button onclick="ui.closeModal()" class="bg-gray-100 p-1 rounded-full"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <form onsubmit="Actions.submitHomeExpense(event)" class="p-6 space-y-4">
                    <div>
                        <label class="text-xs font-bold text-gray-400 uppercase">Valor</label>
                        <input id="inp-home-amount" type="number" step="0.01" inputmode="decimal" class="ios-input text-4xl font-bold w-full border-b-2 border-blue-500 py-2" placeholder="0,00" autoFocus required>
                    </div>
                    <div>
                        <label class="text-sm font-medium">Categoria</label>
                        <select id="inp-home-cat" class="w-full bg-white p-3 rounded-xl border border-gray-200 mt-1">
                            ${cats}
                        </select>
                    </div>
                     <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <span class="font-medium text-gray-700">Já pago?</span>
                        <input id="inp-is-paid" type="checkbox" class="w-6 h-6 rounded accent-green-500">
                    </div>
                    <button type="submit" class="w-full bg-blue-500 text-white p-4 rounded-xl font-bold text-lg mt-4 shadow-lg shadow-blue-200">Salvar Conta</button>
                </form>
             `;
        } else if (type === 'settings') {
            content.innerHTML = `
                <div class="bg-white px-4 py-3 flex justify-between items-center border-b sticky top-0">
                    <h3 class="font-bold">Configurações</h3>
                    <button onclick="ui.closeModal()" class="bg-gray-100 p-1 rounded-full"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <div class="p-6 bg-gray-50/50">
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Dados & Backup</h4>
                    <div class="space-y-3">
                         <button onclick="Actions.downloadBackup()" class="w-full flex items-center justify-between bg-white border border-gray-200 p-4 rounded-xl font-medium active:scale-95 transition-transform shadow-sm">
                            <span class="flex items-center gap-3"><i data-lucide="download" class="text-blue-500"></i> Baixar Backup</span>
                            <i data-lucide="chevron-right" class="text-gray-300 w-4 h-4"></i>
                        </button>
                        
                        <div class="relative">
                            <input onchange="Actions.processUpload(event)" type="file" id="file-upload" accept=".json" class="hidden">
                            <button onclick="Actions.triggerUpload()" class="w-full flex items-center justify-between bg-white border border-gray-200 p-4 rounded-xl font-medium active:scale-95 transition-transform shadow-sm">
                                <span class="flex items-center gap-3"><i data-lucide="upload" class="text-green-500"></i> Restaurar Backup</span>
                                <i data-lucide="chevron-right" class="text-gray-300 w-4 h-4"></i>
                            </button>
                        </div>

                        <button onclick="Actions.askReset()" class="w-full flex items-center justify-between bg-white border border-red-100 p-4 rounded-xl font-medium mt-4 text-red-600 active:bg-red-50 active:scale-95 transition-transform shadow-sm">
                            <span class="flex items-center gap-3"><i data-lucide="trash-2"></i> Resetar Aplicativo</span>
                            <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                        </button>
                    </div>
                    
                    <div class="mt-8 text-center">
                        <p class="text-xs text-gray-400 font-mono">Safe-Insert Alpha 1.0.0</p>
                    </div>
                </div>
            `;
        } else if (type === 'reset_confirm') {
            content.innerHTML = `
                <div class="bg-white px-4 py-3 flex justify-between items-center border-b sticky top-0">
                    <h3 class="font-bold text-red-600">Resetar Tudo</h3>
                    <button onclick="ui.closeModal()" class="bg-gray-100 p-1 rounded-full"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <div class="p-6 bg-gray-50/50">
                    <div class="bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
                        <div class="flex items-center gap-3 mb-2">
                            <i data-lucide="alert-triangle" class="w-6 h-6 text-red-500"></i>
                            <h4 class="font-bold text-red-700">Atenção!</h4>
                        </div>
                        <p class="text-sm text-red-600">Isso apagará todas as contas e transações salvas neste dispositivo.</p>
                    </div>
                    
                    <div class="space-y-3">
                         <button onclick="Store.clearAllData()" class="w-full bg-red-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg shadow-red-200 active:scale-95 transition-transform">Sim, Apagar Tudo</button>
                         <button onclick="ui.closeModal()" class="w-full bg-white border border-gray-200 text-gray-700 p-4 rounded-xl font-bold text-lg active:scale-95 transition-transform">Cancelar</button>
                    </div>
                </div>
            `;
        }
        lucide.createIcons();
    },

    closeModal(e) {
        if (e && e.target.id !== 'modal-overlay') return;
        document.getElementById('modal-overlay').classList.add('hidden');
    }
};

// ==========================================
// BOOTSTRAP
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    Store.init();

    // Onboarding Check
    const hasMei = Store.data.accounts.some(a => a.type === 'mei');
    if (!hasMei) {
        router.navigate('mei');
        // Open modal automatically for better onboarding
        setTimeout(() => ui.openModal('accounts'), 100);
    } else {
        router.navigate('work');
    }
});
