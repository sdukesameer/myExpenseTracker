// Global variables
let currentUser = null;
let currentChart = null;
let filteredExpenses = [];
let allExpensesCache = [];
let budgetWarningShown = { billed: false, unbilled: false };
let isPasswordResetFlow = false;
let monthlyBilledBudget = 0;
let monthlyUnbilledBudget = 0;

// Initialize Supabase - FIXED: Remove import.meta usage
const supabaseUrl = '%VITE_SUPABASE_URL%';
const supabaseKey = '%VITE_SUPABASE_ANON_KEY%';

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not found. Please check environment variables.');
}

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// FIXED: Initialize theme toggle variables at the top
let isDarkMode = localStorage.getItem('darkMode') === 'true';

// FIXED: Theme toggle function moved up and properly scoped
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.getElementById('theme-icon').textContent = isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDarkMode);
}

// Add this function after toggleTheme() function
function handleSecureEmailLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const actualLink = urlParams.get('link');

    if (actualLink && window.location.pathname === '/secure-email-link') {
        // Redirect to the actual Supabase link
        window.location.href = actualLink;
    }
}

function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function validateExpenseInput(amount, type, note) {
    const errors = [];

    if (!amount || isNaN(amount) || amount <= 0) {
        errors.push('Valid amount is required');
    }
    if (amount > 1000000) {
        errors.push('Amount cannot exceed ₹10,00,000');
    }
    if (!type || type.trim() === '') {
        errors.push('Expense type is required');
    }
    if (!note || note.trim() === '') {
        errors.push('Description is required');
    }
    if (note && note.length > 500) {
        errors.push('Description cannot exceed 500 characters');
    }

    return errors;
}

function getISTDate(date = new Date()) {
    // Create IST date properly
    const utc = date.getTime();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    return new Date(utc + istOffset);
}

function getISTMonthBounds(year, month) {
    // Get first day (always 01) and last day of the month
    const firstDay = 1;
    const lastDay = new Date(year, month, 0).getDate(); // 0th day of next month = last day of current month

    // Format as YYYY-MM-DD strings
    const firstDayStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return {
        first: firstDayStr,
        last: lastDayStr
    };
}

function getCurrentMonthName() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return months[new Date().getMonth()];
}

// FIXED: Notification system properly scoped
function showNotification(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notification-container');

    // Position existing notifications higher
    const existingNotifications = container.querySelectorAll('.notification');
    existingNotifications.forEach((notification, index) => {
        const currentTop = parseInt(notification.style.top || '20') + 80;
        notification.style.top = currentTop + 'px';
    });

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.top = '20px';

    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (container.contains(notification)) {
                container.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// Initialize the app
document.addEventListener('DOMContentLoaded', async function () {
    // Show loading spinner
    document.getElementById('loading-spinner').style.display = 'block';

    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-icon').textContent = '☀️';
    }

    // Set today's date in IST
    const now = new Date();
    const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const todayIST = istNow.toISOString().split('T')[0];
    // Extract year and month from today's date
    const [year, month] = todayIST.split('-');
    const firstDayIST = `${year}-${month}-01`;

    document.getElementById('date').value = todayIST;
    document.getElementById('end-date').value = todayIST;
    document.getElementById('start-date').value = firstDayIST;

    handleSecureEmailLink();
    handleEmailChangeConfirmation();

    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            // Ensure clean state for password recovery
            currentUser = null;
            isPasswordResetFlow = true;
            if (session?.user) {
                currentUser = session.user;
            }
            showForcedPasswordChange();
        } else if (event === 'SIGNED_IN' && session?.user) {
            if (!isPasswordResetFlow) {
                currentUser = session.user;
                showDashboard();
            }
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            isPasswordResetFlow = false;
            showSignIn();
        } else if (event === 'USER_UPDATED' && session?.user) {
            if (!window.location.search.includes('type=email_change')) {
                currentUser = session.user;
                if (!isPasswordResetFlow && document.getElementById('dashboard').style.display !== 'none') {
                    showDashboard();
                }
            }
        }

        document.getElementById('loading-spinner').style.display = 'none';
        document.body.classList.add('loaded');
    });

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            currentUser = user;
            showDashboard();
        } else {
            showSignIn();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showSignIn();
    } finally {
        // Hide loading spinner and show content
        document.getElementById('loading-spinner').style.display = 'none';
        document.body.classList.add('loaded');
    }

    document.getElementById('signin').addEventListener('submit', handleSignIn);
    document.getElementById('signup').addEventListener('submit', handleSignUp);
    document.getElementById('forgot-password').addEventListener('submit', handleForgotPassword);
    document.getElementById('expense-form').addEventListener('submit', handleAddExpense);
    document.getElementById('add-type-form').addEventListener('submit', handleAddType);
    document.getElementById('change-password-form').addEventListener('submit', handleChangePassword);
    document.getElementById('edit-profile-form').addEventListener('submit', handleEditProfile);
    updateDateDisplay();
});

// Authentication functions
function showSignIn() {
    hideAllForms();
    document.getElementById('signin-form').classList.remove('hidden');
}

function showSignUp() {
    hideAllForms();
    document.getElementById('signup-form').classList.remove('hidden');
}

async function showForgotPassword() {
    // Logout current session before showing forgot password form
    try {
        await supabase.auth.signOut();
        currentUser = null;
    } catch (error) {
        console.error('Error during logout:', error);
    }

    hideAllForms();
    document.getElementById('forgot-password-form').classList.remove('hidden');
}

function hideAllForms() {
    document.getElementById('signin-form').classList.add('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById('forgot-password-form').classList.add('hidden');
    document.getElementById('password-reset-form').classList.add('hidden');
    document.getElementById('dashboard').style.display = 'none';
}

async function handleSignIn(e) {
    e.preventDefault();
    const emailField = document.getElementById('signin-email');
    const passwordField = document.getElementById('signin-password');

    if (!emailField || !passwordField) {
        showAlert('signin-alert', 'Form fields not found.', 'error');
        return;
    }

    const email = emailField.value;
    const password = passwordField.value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email, password
        });

        if (error) throw error;

        currentUser = data.user;
        showAlert('signin-alert', 'Sign in successful!', 'success');
        setTimeout(() => showDashboard(), 1000);
    } catch (error) {
        showAlert('signin-alert', error.message, 'error');
    }
}

async function handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (password !== confirmPassword) {
        showAlert('signup-alert', 'Passwords do not match.', 'error');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email, password,
            options: {
                data: {
                    display_name: name,
                    name: name,
                    full_name: name
                },
                emailRedirectTo: window.location.origin
            }
        });

        if (error) throw error;

        // Add default expense types for new user
        if (data.user) {
            const defaultTypes = ['Food', 'Transportation', 'Entertainment', 'Utilities', 'Shopping', 'Healthcare', 'Education', 'Other'];
            for (const type of defaultTypes) {
                await supabase.from('expense_types').insert([{ user_id: data.user.id, name: type }]);
            }
        }

        showAlert('signup-alert', 'Check your email for verification link!', 'success');
        setTimeout(() => showSignIn(), 2000);
    } catch (error) {
        showAlert('signup-alert', error.message, 'error');
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });

        if (error) {
            showAlert('forgot-alert', 'Invalid email or user doesn\'t exist. Please sign up.', 'error');
        } else {
            showAlert('forgot-alert', 'Password reset link sent to your email!', 'success');
            setTimeout(() => showSignIn(), 2000);
        }
    } catch (error) {
        showAlert('forgot-alert', 'Invalid email or user doesn\'t exist. Please sign up.', 'error');
    }
}

async function handlePasswordReset(e) {
    e.preventDefault();
    const newPassword = document.getElementById('reset-password').value;
    const confirmPassword = document.getElementById('reset-confirm-password').value;

    if (newPassword !== confirmPassword) {
        showAlert('reset-alert', 'Passwords do not match.', 'error');
        return;
    }

    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;

        showAlert('reset-alert', 'Password updated successfully!', 'success');
        setTimeout(() => {
            window.location.hash = '';
        }, 2000);
    } catch (error) {
        showAlert('reset-alert', error.message, 'error');
    }
}

async function showForcedPasswordChange() {
    hideAllForms();

    // Ensure we have a valid user for password recovery
    if (!currentUser) {
        showSignIn();
        return;
    }

    try {
        await supabase
            .from('user_profiles')
            .upsert([{
                user_id: currentUser.id,
                requires_password_reset: true
            }], { onConflict: 'user_id' });
    } catch (error) {
        console.error('Failed to update password reset flag:', error);
    }

    document.getElementById('change-password-modal').style.display = 'block';

    const closeBtn = document.querySelector('#change-password-modal .close-modal');
    closeBtn.style.display = 'none';
    document.getElementById('change-password-modal').onclick = null;

    const modalTitle = document.querySelector('#change-password-modal h3');
    modalTitle.textContent = 'Set New Password';

    let instructionText = document.getElementById('password-reset-instruction');
    if (!instructionText) {
        instructionText = document.createElement('p');
        instructionText.id = 'password-reset-instruction';
        instructionText.style.cssText = 'color: #6b7280; margin-bottom: 1rem; font-size: 0.9rem; text-align: center;';
        instructionText.textContent = 'Please set a new password to continue using your account.';
        modalTitle.insertAdjacentElement('afterend', instructionText);
    }

    document.getElementById('new-password').focus();
}

async function handleChangePassword(e) {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;

    if (newPassword !== confirmNewPassword) {
        showAlert('change-password-alert', 'New passwords do not match.', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showAlert('change-password-alert', 'Password must be at least 6 characters long.', 'error');
        return;
    }

    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;

        if (isPasswordResetFlow) {
            await supabase
                .from('user_profiles')
                .upsert([{
                    user_id: currentUser.id,
                    requires_password_reset: false
                }], { onConflict: 'user_id' });
        }

        showAlert('change-password-alert', 'Password changed successfully!', 'success');

        if (isPasswordResetFlow) {
            setTimeout(() => {
                isPasswordResetFlow = false;
                closeChangePasswordModal();
                showDashboard();
                showNotification('Password updated successfully! You can now use your account.', 'success');
            }, 1500);
        } else {
            setTimeout(() => closeChangePasswordModal(), 2000);
        }
    } catch (error) {
        showAlert('change-password-alert', error.message, 'error');
    }
}

function showChangePassword() {
    document.getElementById('change-password-modal').style.display = 'block';
    document.getElementById('current-password').focus();
}

function closeChangePasswordModal() {
    if (isPasswordResetFlow) return;

    document.getElementById('change-password-modal').style.display = 'none';
    document.getElementById('change-password-form').reset();
    document.getElementById('change-password-alert').innerHTML = '';

    const closeBtn = document.querySelector('#change-password-modal .close-modal');
    closeBtn.style.display = 'block';

    const modalTitle = document.querySelector('#change-password-modal h3');
    modalTitle.textContent = 'Change Password';

    const instructionText = document.getElementById('password-reset-instruction');
    if (instructionText) {
        instructionText.remove();
    }
}

// Replace the existing logout function
async function logout() {
    try {
        // Sign out with global scope to terminate all sessions
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Logout error:', error);
        }

        // Clear any local storage related to auth
        localStorage.removeItem('supabase.auth.token');

        // Clear the project-specific auth token
        const projectId = supabaseUrl.split('//')[1]?.split('.')[0];
        if (projectId) {
            localStorage.removeItem(`sb-${projectId}-auth-token`);
        }

        currentUser = null;
        isPasswordResetFlow = false;
        showSignIn();
        showNotification('Signed out from all devices', 'success');
    } catch (error) {
        console.error('Error during logout:', error);
        currentUser = null;
        showSignIn();
    }
}

// Dashboard functions
async function showDashboard() {
    // Check if user requires password reset
    try {
        const { data } = await supabase
            .from('user_profiles')
            .select('requires_password_reset')
            .eq('user_id', currentUser.id)
            .single();

        if (data?.requires_password_reset) {
            isPasswordResetFlow = true;
            showForcedPasswordChange();
            return;
        }
    } catch (error) {
        console.error('Failed to check password reset status:', error);
    }

    hideAllForms();
    document.getElementById('dashboard').style.display = 'block';

    const displayName = currentUser.user_metadata?.display_name ||
        currentUser.user_metadata?.name ||
        currentUser.user_metadata?.full_name ||
        currentUser.email.split('@')[0];

    document.getElementById('user-name').textContent = `Welcome, ${displayName}!`;
    document.getElementById('user-email').textContent = currentUser.email;
    document.getElementById('user-avatar').textContent = displayName.charAt(0).toUpperCase();

    // Check for URL parameters (amount from SMS automation)
    const urlParams = new URLSearchParams(window.location.search);
    const prefilledAmount = urlParams.get('amount');
    if (prefilledAmount && !isNaN(prefilledAmount)) {
        const ceiledAmount = Math.ceil(parseFloat(prefilledAmount));
        document.getElementById('amount').value = ceiledAmount;
        document.getElementById('amount').focus(); // Optional: focus the field
        // Clear URL parameter
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Load budget first, then other data
    await loadUserBudget();
    updateBudgetHeader();
    loadUserTypes();
    await loadExpenses();
    await updateStatistics();
    await updateBudgetDisplay();

    // Check if current month budget exists and update button
    setTimeout(async () => {
        const istNow = getISTDate();
        const currentMonth = istNow.getMonth() + 1;
        const currentYear = istNow.getFullYear();

        const { data } = await supabase
            .from('user_budgets')
            .select('monthly_billed_budget, monthly_unbilled_budget')
            .eq('user_id', currentUser.id)
            .eq('budget_month', currentMonth)
            .eq('budget_year', currentYear)
            .single();

        const budgetExists = data && (data.monthly_billed_budget > 0 || data.monthly_unbilled_budget > 0);
        const budgetBtn = document.querySelector('.budget-tracker h3 + .btn');
        if (budgetBtn) budgetBtn.textContent = budgetExists ? 'Update Budget' : 'Set Budget';
    }, 100);
}

function toggleUserMenu() {
    const menu = document.getElementById('user-menu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Close menu when clicking outside
document.addEventListener('click', function (event) {
    const avatar = document.getElementById('user-avatar');
    const menu = document.getElementById('user-menu');
    if (menu && !avatar.contains(event.target) && !menu.contains(event.target)) {
        menu.style.display = 'none';
    }
});

async function loadUserTypes() {
    try {
        const { data, error } = await supabase
            .from('expense_types')
            .select('name')
            .order('name');

        if (error) throw error;

        const typeSelect = document.getElementById('type');
        typeSelect.innerHTML = '<option value="">Select Type</option>';

        data.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;
            option.textContent = type.name;
            typeSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load types:', error);
    }
}

async function loadTypesForEdit() {
    try {
        const { data, error } = await supabase
            .from('expense_types')
            .select('name')
            .order('name');

        if (error) throw error;
        return data.map(type => type.name);
    } catch (error) {
        console.error('Failed to load types:', error);
        return [];
    }
}

async function createEditableElements(expenseId, expense) {
    const expenseItem = document.querySelector(`[data-id="${expenseId}"]`);

    // Amount input with ₹ prefix
    const amountEl = expenseItem.querySelector('.expense-amount');
    const originalAmount = parseFloat(amountEl.dataset.original);
    amountEl.innerHTML = `<input type="number" step="0.01" min="0" max="1000000" value="${originalAmount}" placeholder="0.00" onchange="trackExpenseChange(${expenseId})">`;

    // Note input
    const noteEl = expenseItem.querySelector('.expense-note');
    const originalNote = noteEl.dataset.original;
    noteEl.innerHTML = `<input type="text" value="${originalNote}" placeholder="Add description..." maxlength="500" onchange="trackExpenseChange(${expenseId})">`;

    // Type select with styled dropdown
    const typeEl = expenseItem.querySelector('.expense-type');
    const originalType = typeEl.dataset.original;
    const types = await loadTypesForEdit();
    typeEl.innerHTML = `<select onchange="trackExpenseChange(${expenseId})">
                ${types.map(type => `<option value="${type}" ${type === originalType ? 'selected' : ''}>${type}</option>`).join('')}
            </select>`;

    // Date input
    const dateEl = expenseItem.querySelector('.expense-date');
    const originalDate = dateEl.dataset.original;
    dateEl.innerHTML = `<input type="date" value="${originalDate}" onchange="trackExpenseChange(${expenseId})">`;
}

function restoreStaticElements(expenseId) {
    const expenseItem = document.querySelector(`[data-id="${expenseId}"]`);
    const edits = expenseEdits[expenseId] || {};

    // Restore amount with ₹ prefix
    const amountEl = expenseItem.querySelector('.expense-amount');
    const finalAmount = edits.amount !== undefined ? edits.amount : parseFloat(amountEl.dataset.original);
    amountEl.innerHTML = `₹${finalAmount.toFixed(2)}`;

    // Restore note
    const noteEl = expenseItem.querySelector('.expense-note');
    const finalNote = edits.note !== undefined ? edits.note : noteEl.dataset.original;
    noteEl.innerHTML = finalNote || 'No description';

    // Restore type with original styling
    const typeEl = expenseItem.querySelector('.expense-type');
    const finalType = edits.type !== undefined ? edits.type : typeEl.dataset.original;
    typeEl.innerHTML = finalType;
    typeEl.className = 'expense-type'; // Restore original class

    // Restore date
    const dateEl = expenseItem.querySelector('.expense-date');
    const finalDate = edits.date !== undefined ? edits.date : dateEl.dataset.original;
    dateEl.innerHTML = formatDate(finalDate);
}

function trackExpenseChange(expenseId) {
    const expenseItem = document.querySelector(`[data-id="${expenseId}"]`);

    // Get current values
    const amountInput = expenseItem.querySelector('.expense-amount input');
    const noteInput = expenseItem.querySelector('.expense-note input');
    const typeSelect = expenseItem.querySelector('.expense-type select');
    const dateInput = expenseItem.querySelector('.expense-date input');

    const currentAmount = parseFloat(amountInput?.value || 0);
    const currentNote = noteInput?.value?.trim() || '';
    const currentType = typeSelect?.value || '';
    const currentDate = dateInput?.value || '';

    // Get original values
    const originalAmount = parseFloat(expenseItem.querySelector('.expense-amount').dataset.original);
    const originalNote = expenseItem.querySelector('.expense-note').dataset.original;
    const originalType = expenseItem.querySelector('.expense-type').dataset.original;
    const originalDate = expenseItem.querySelector('.expense-date').dataset.original;
    const originalBilled = expenseItem.querySelector('.billed-status').dataset.billed === 'true';

    // Initialize edits object
    if (!expenseEdits[expenseId]) {
        expenseEdits[expenseId] = {
            originalAmount, originalNote, originalType, originalDate, originalBilled,
            billed: originalBilled
        };
    }

    // Update current values
    expenseEdits[expenseId].amount = currentAmount;
    expenseEdits[expenseId].note = currentNote;
    expenseEdits[expenseId].type = currentType;
    expenseEdits[expenseId].date = currentDate;

    // Check if anything changed from original
    const hasChanges = currentAmount !== originalAmount ||
        currentNote !== originalNote ||
        currentType !== originalType ||
        currentDate !== originalDate ||
        expenseEdits[expenseId].billed !== originalBilled;

    if (hasChanges) {
        editedExpenses.add(expenseId);
    } else {
        editedExpenses.delete(expenseId);
        // Don't delete the object completely, keep it for toggle state
    }

    updateSaveButton();
}

async function handleAddExpense(e) {
    e.preventDefault();

    try {
        const amount = parseFloat(document.getElementById('amount').value);
        const type = document.getElementById('type').value;
        const note = document.getElementById('note').value.trim();
        const isBilled = document.getElementById('form-billed-toggle').classList.contains('active');

        // Enhanced validation
        if (!amount || amount <= 0) {
            showNotification('Please enter a valid amount greater than 0', 'error');
            return;
        }

        if (amount > 1000000) {
            showNotification('Amount cannot exceed ₹10,00,000', 'error');
            return;
        }

        if (!type) {
            showNotification('Please select an expense type', 'error');
            return;
        }

        if (!note) {
            showNotification('Please enter a description', 'error');
            return;
        }

        if (note.length > 500) {
            showNotification('Description cannot exceed 500 characters', 'error');
            return;
        }

        const expense = {
            user_id: currentUser.id,
            amount: amount,
            date: document.getElementById('date').value,
            type: type,
            note: note,
            billed: isBilled
        };

        const { error } = await supabase
            .from('expenses')
            .insert([expense]);

        if (error) throw error;

        document.getElementById('expense-form').reset();
        document.getElementById('date').value = new Date().toLocaleDateString('en-CA');
        document.getElementById('form-billed-toggle').classList.remove('active');
        updateDateDisplay();

        const selectedType = document.getElementById('type').value; // Save current selection
        await Promise.all([
            loadExpenses(),
            updateStatistics(),
            updateBudgetDisplay()
        ]);
        document.getElementById('type').value = selectedType; // Restore selection

        await checkBudgetWarnings();
        showNotification('Expense added successfully!', 'success');
    } catch (error) {
        console.error('Add expense error:', error);
        showNotification('Failed to add expense: ' + error.message, 'error');
    }
}

async function checkBudgetWarnings() {
    const { billedUsedPercentage, unbilledUsedPercentage } = await updateBudgetDisplay();

    if (!budgetWarningShown.billed && billedUsedPercentage >= 90 && monthlyBilledBudget > 0) {
        if (billedUsedPercentage >= 100) {
            showNotification('Alert: You\'ve exceeded your monthly billed budget!', 'error');
        } else {
            showNotification(`Warning: You\'ve used ${Math.round(billedUsedPercentage)}% of your billed budget!`, 'warning');
        }
        budgetWarningShown.billed = true;
    }

    if (!budgetWarningShown.unbilled && unbilledUsedPercentage >= 90 && monthlyUnbilledBudget > 0) {
        if (unbilledUsedPercentage >= 100) {
            showNotification('Alert: You\'ve exceeded your monthly unbilled budget!', 'error');
        } else {
            showNotification(`Warning: You\'ve used ${Math.round(unbilledUsedPercentage)}% of your unbilled budget!`, 'warning');
        }
        budgetWarningShown.unbilled = true;
    }
}

async function loadExpenses() {
    try {
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false })
            .limit(5); // Show only last 5

        if (error) throw error;

        const container = document.getElementById('expenses-container');

        if (data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 3rem;">No expenses added yet. Add your first expense above!</p>';
            return;
        }

        container.innerHTML = data.map(expense => `
                    <div class="expense-item">
                        <div class="expense-details">
                            <div class="expense-amount">₹${expense.amount.toFixed(2)}</div>
                            <div class="expense-note">${sanitizeHTML(expense.note) || 'No description'}</div>
                            <div class="expense-meta">
                                <span class="expense-type">${expense.type}</span>
                                ${expense.billed ? '<span class="billed-badge">BILLED</span>' : ''}
                                <span>${formatDate(expense.date)}</span>
                            </div>
                        </div>
                    </div>
                `).join('');
    } catch (error) {
        console.error('Failed to load expenses:', error);
    }
}


async function deleteFilteredExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Remove from filtered expenses
            filteredExpenses = filteredExpenses.filter(expense => expense.id !== id);

            // Refresh displays
            await showExpenseList();
            updateChart(currentChart ? currentChart.config.type : 'pie');
            await loadExpenses();
            await updateStatistics();
            await updateBudgetDisplay();
            await checkBudgetWarnings();
            showNotification('Expense deleted successfully!', 'success');
        } catch (error) {
            showNotification('Failed to delete expense: ' + error.message, 'error');
        }
    }
}

async function updateStatistics() {
    try {
        const { data, error } = await supabase
            .from('expenses')
            .select('amount, date, billed');

        if (error) throw error;

        const istNow = getISTDate();
        const currentMonth = istNow.getMonth() + 1;
        const currentYear = istNow.getFullYear();
        const bounds = getISTMonthBounds(currentYear, currentMonth);
        const firstDayOfMonth = bounds.first;
        const lastDayOfMonth = bounds.last;

        // For last month:
        const lastMonthBounds = currentMonth === 1 ?
            getISTMonthBounds(currentYear - 1, 12) :
            getISTMonthBounds(currentYear, currentMonth - 1);
        const lastMonthFirstDay = lastMonthBounds.first;
        const lastMonthLastDay = lastMonthBounds.last;

        // Current month calculations
        const monthlyExpenses = data
            .filter(expense => expense.date >= firstDayOfMonth && expense.date <= lastDayOfMonth)
            .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

        const monthlyCount = data.filter(expense =>
            expense.date >= firstDayOfMonth && expense.date <= lastDayOfMonth
        ).length;

        const monthlyBilledExpenses = data
            .filter(expense => expense.billed && expense.date >= firstDayOfMonth && expense.date <= lastDayOfMonth)
            .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

        const monthlyUnbilledExpenses = data
            .filter(expense => !expense.billed && expense.date >= firstDayOfMonth && expense.date <= lastDayOfMonth)
            .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

        const lastMonthExpenses = data
            .filter(expense => expense.date >= lastMonthFirstDay && expense.date <= lastMonthLastDay)
            .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

        // All-time total for reference
        const totalExpenses = data.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

        // Update DOM - Note: Changed labels to reflect actual data
        document.getElementById('total-expenses').textContent = `₹${lastMonthExpenses.toFixed(2)}`;
        document.getElementById('monthly-expenses').textContent = `₹${monthlyExpenses.toFixed(2)}`;
        document.getElementById('billed-expenses').textContent = `₹${monthlyBilledExpenses.toFixed(2)}`;
        document.getElementById('unbilled-expenses').textContent = `₹${monthlyUnbilledExpenses.toFixed(2)}`;
        document.getElementById('expense-count').textContent = monthlyCount;
    } catch (error) {
        console.error('Failed to update statistics:', error);
    }
}

// Type management functions
function showAddTypeModal() {
    document.getElementById('add-type-modal').style.display = 'block';
    document.getElementById('new-type').focus();
}

function closeAddTypeModal() {
    document.getElementById('add-type-modal').style.display = 'none';
    document.getElementById('add-type-form').reset();
    document.getElementById('type-alert').innerHTML = '';
}

async function handleAddType(e) {
    e.preventDefault();
    const newType = document.getElementById('new-type').value.trim();

    if (!newType) {
        showAlert('type-alert', 'Please enter a type name.', 'error');
        return;
    }

    try {
        // Check if type already exists
        const { data: existing } = await supabase
            .from('expense_types')
            .select('name')
            .ilike('name', newType);

        if (existing && existing.length > 0) {
            showAlert('type-alert', 'This type already exists.', 'error');
            return;
        }

        const { error } = await supabase
            .from('expense_types')
            .insert([{ user_id: currentUser.id, name: newType }]);

        if (error) throw error;

        loadUserTypes();
        document.getElementById('type').value = newType;
        showAlert('type-alert', 'Type added successfully!', 'success');
        setTimeout(() => closeAddTypeModal(), 1500);
    } catch (error) {
        showAlert('type-alert', error.message || 'Failed to add type.', 'error');
    }
}

function updateBudgetHeader() {
    const monthName = getCurrentMonthName();
    document.getElementById('budget-header').textContent = `${monthName} Budget`;
}

// Budget management
function setBudget() {
    document.getElementById('budget-modal').style.display = 'block';
    // Load current month's budget specifically
    loadCurrentMonthBudget();
}

async function loadCurrentMonthBudget() {
    const istNow = getISTDate();
    const currentMonth = istNow.getMonth() + 1;
    const currentYear = istNow.getFullYear();

    const { data } = await supabase
        .from('user_budgets')
        .select('monthly_billed_budget, monthly_unbilled_budget')
        .eq('user_id', currentUser.id)
        .eq('budget_month', currentMonth)
        .eq('budget_year', currentYear);

    const budget = data && data.length > 0 ? data[0] : null;
    document.getElementById('billed-budget-amount').value = budget?.monthly_billed_budget || '';
    document.getElementById('unbilled-budget-amount').value = budget?.monthly_unbilled_budget || '';
}

function closeBudgetModal() {
    document.getElementById('budget-modal').style.display = 'none';
}

async function updateBudgetDisplay() {
    if (!currentUser) return;

    try {
        const istNow = getISTDate();
        const currentMonth = istNow.getMonth() + 1;
        const currentYear = istNow.getFullYear();
        const bounds = getISTMonthBounds(currentYear, currentMonth);
        const firstDayOfMonth = bounds.first;
        const lastDayOfMonth = bounds.last;

        // Get current month expenses only
        const { data: monthlyExpenses, error } = await supabase
            .from('expenses')
            .select('amount, billed')
            .eq('user_id', currentUser.id)
            .gte('date', firstDayOfMonth)
            .lte('date', lastDayOfMonth);

        if (error) throw error;

        const monthlyBilledSpent = monthlyExpenses
            .filter(expense => expense.billed)
            .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

        const monthlyUnbilledSpent = monthlyExpenses
            .filter(expense => !expense.billed)
            .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    // Billed Budget Display
        const billedRemaining = monthlyBilledBudget - monthlyBilledSpent;
        const billedRemainingElement = document.getElementById('billed-budget-remaining');
        const billedPercentage = monthlyBilledBudget > 0 ? ((billedRemaining / monthlyBilledBudget) * 100) : 0;
        const billedPercentageText = monthlyBilledBudget > 0 ? ` (${billedPercentage.toFixed(0)}%)` : '';

        billedRemainingElement.textContent = `Billed Remaining: ₹${billedRemaining.toFixed(2)}${billedPercentageText}`;
        document.getElementById('billed-budget-total').textContent = `Billed Budget: ₹${monthlyBilledBudget.toFixed(2)}`;

        const billedUsedPercentage = monthlyBilledBudget > 0 ? (monthlyBilledSpent / monthlyBilledBudget) * 100 : 0;
        const billedProgressBar = document.getElementById('billed-budget-progress-bar');
        billedProgressBar.style.width = `${Math.min(billedUsedPercentage, 100)}%`;
        billedProgressBar.classList.toggle('over-budget', billedUsedPercentage > 100);

    // Unbilled Budget Display
        const unbilledRemaining = monthlyUnbilledBudget - monthlyUnbilledSpent;
        const unbilledRemainingElement = document.getElementById('unbilled-budget-remaining');
        const unbilledPercentage = monthlyUnbilledBudget > 0 ? ((unbilledRemaining / monthlyUnbilledBudget) * 100) : 0;
        const unbilledPercentageText = monthlyUnbilledBudget > 0 ? ` (${unbilledPercentage.toFixed(0)}%)` : '';

        unbilledRemainingElement.textContent = `Unbilled Remaining: ₹${unbilledRemaining.toFixed(2)}${unbilledPercentageText}`;
        document.getElementById('unbilled-budget-total').textContent = `Unbilled Budget: ₹${monthlyUnbilledBudget.toFixed(2)}`;

        const unbilledUsedPercentage = monthlyUnbilledBudget > 0 ? (monthlyUnbilledSpent / monthlyUnbilledBudget) * 100 : 0;
        const unbilledProgressBar = document.getElementById('unbilled-budget-progress-bar');
        unbilledProgressBar.style.width = `${Math.min(unbilledUsedPercentage, 100)}%`;
        unbilledProgressBar.classList.toggle('over-budget', unbilledUsedPercentage > 100);

    // Color coding for remaining amounts
        [
            { element: billedRemainingElement, percentage: billedUsedPercentage },
            { element: unbilledRemainingElement, percentage: unbilledUsedPercentage }
        ].forEach(({ element, percentage }) => {
            if (percentage >= 100) {
                element.style.color = '#ef4444';
                element.style.fontWeight = '600';
            } else if (percentage >= 90) {
                element.style.color = '#f56a20';
                element.style.fontWeight = '600';
            } else {
                element.style.color = '';
                element.style.fontWeight = '';
            }
        });

        return { billedUsedPercentage, unbilledUsedPercentage };

    } catch (error) {
        console.error('Failed to update budget display:', error);
        return { billedUsedPercentage: 0, unbilledUsedPercentage: 0 };
    }
}

function updateDateDisplay() {
    const dateInput = document.getElementById('date');
    const dateDisplay = document.getElementById('date-display');

    if (dateInput && dateInput.value) {
        // Parse date string directly without timezone conversion
        const [year, month, day] = dateInput.value.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        const options = {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        };

        const formattedDate = date.toLocaleDateString('en-IN', options);
        const dayNum = date.getDate();
        const suffix = dayNum % 10 === 1 && dayNum !== 11 ? 'st' :
            dayNum % 10 === 2 && dayNum !== 12 ? 'nd' :
                dayNum % 10 === 3 && dayNum !== 13 ? 'rd' : 'th';

        if (dateDisplay) {
            dateDisplay.textContent = formattedDate.replace(dayNum.toString(), `${dayNum}${suffix}`);
        }
    }
}

// Visualization functions
function showVisualizationModal() {
    // Update modal title
    document.querySelector('#visualization-modal h3').textContent = 'Expense Analytics & Export';
    document.getElementById('visualization-modal').style.display = 'block';

    // Load types for filter
    loadTypesForFilter();

    applyDateFilter();
}

// Add new function
async function loadTypesForFilter() {
    try {
        const { data, error } = await supabase
            .from('expense_types')
            .select('name')
            .order('name');

        if (error) throw error;

        const typeFilter = document.getElementById('type-filter');
        typeFilter.innerHTML = '<option value="all">All Types</option>';

        data.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;
            option.textContent = type.name;
            typeFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load types for filter:', error);
    }
}

function closeVisualizationModal() {
    document.getElementById('visualization-modal').style.display = 'none';
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
    // Reset billing toggle tracking
    editedExpenses.clear();
    expenseEdits = {};
}

async function applyDateFilter() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const billingFilter = document.getElementById('billing-filter').value;
    const typeFilter = document.getElementById('type-filter').value;

    try {
        let query = supabase.from('expenses').select('*');

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        if (billingFilter === 'billed') query = query.eq('billed', true);
        if (billingFilter === 'unbilled') query = query.eq('billed', false);
        if (typeFilter !== 'all') query = query.eq('type', typeFilter);

        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;

        filteredExpenses = data || [];
        updateChart('line');

        // Add expense list below chart
        showExpenseList();
    } catch (error) {
        console.error('Failed to filter expenses:', error);
        filteredExpenses = [];
        updateChart('line');
    }
}

function updateChartType(type) {
    updateChart(type);
}

function updateChart(chartType) {
    const ctx = document.getElementById('expenseChart').getContext('2d');

    if (currentChart) {
        currentChart.destroy();
    }

    if (filteredExpenses.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#f9fafb' : '#9ca3af';
        ctx.font = '16px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No expenses found for the selected date range', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    let chartData, chartConfig;

    if (chartType === 'line') {
        chartData = prepareLineChartData();
        chartConfig = {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Expenses Over Time' },
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: function (value) { return '₹' + value.toFixed(0); } }
                    }
                }
            }
        };
    } else if (chartType === 'bubble') {
        chartData = prepareBubbleChartData();
        chartConfig = {
            type: 'bubble',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Expense Types by Amount & Frequency' },
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.raw.label}: ₹${context.raw.y.toFixed(2)} (${context.raw.x} transactions)`;
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        backgroundColor: function(context) {
                            const colors = [
                                '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe',
                                '#43e97b', '#38f9d7', '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
                            ];
                            return colors[context.dataIndex % colors.length];
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Number of Transactions' } },
                    y: {
                        title: { display: true, text: 'Total Amount (₹)' },
                        ticks: { callback: function (value) { return '₹' + value.toFixed(0); } }
                    }
                }
            }
        };
    } else {
        chartData = prepareTypeChartData();
        const isHorizontal = chartType === 'horizontalBar';

        chartConfig = {
            type: isHorizontal ? 'bar' : chartType,
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: isHorizontal ? 'y' : 'x',
                plugins: {
                    title: { display: true, text: 'Expenses by Type' },
                    legend: { position: 'bottom', display: chartType === 'doughnut' },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                // For horizontal bar charts, use context.parsed.x, for others use context.parsed.y
                                const value = isHorizontal ? context.parsed.x : (context.parsed.y || context.parsed);
                                return context.label + ': ₹' + value.toFixed(2);
                            }
                        }
                    }
                },
                scales: chartType === 'doughnut' ? {} : {
                    [isHorizontal ? 'x' : 'y']: {
                        beginAtZero: true,
                        title: { display: true, text: 'Amount (₹)' },
                        ticks: { callback: function (value) { return '₹' + value.toFixed(0); } }
                    },
                    [isHorizontal ? 'y' : 'x']: {
                        title: { display: true, text: 'Expense Types' }
                    }
                }
            }
        };
    }

    currentChart = new Chart(ctx, chartConfig);
}

function prepareTypeChartData() {
    const typeData = {};
    filteredExpenses.forEach(expense => {
        typeData[expense.type] = (typeData[expense.type] || 0) + parseFloat(expense.amount);
    });

    const colors = [
        '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe',
        '#43e97b', '#38f9d7', '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3',
        '#ff9a9e', '#fecfef', '#ffeaa7', '#fab1a0'
    ];

    return {
        labels: Object.keys(typeData),
        datasets: [{
            label: 'Amount',
            data: Object.values(typeData),
            backgroundColor: colors.slice(0, Object.keys(typeData).length),
            borderWidth: 2,
            borderColor: '#ffffff'
        }]
    };
}

function prepareLineChartData() {
    const dailyData = {};
    filteredExpenses.forEach(expense => {
        const date = expense.date;
        dailyData[date] = (dailyData[date] || 0) + parseFloat(expense.amount);
    });

    const sortedDates = Object.keys(dailyData).sort();

    // Calculate cumulative totals
    let cumulativeTotal = 0;
    const cumulativeData = sortedDates.map(date => {
        cumulativeTotal += dailyData[date];
        return cumulativeTotal;
    });

    return {
        labels: sortedDates.map(date => formatDate(date)),
        datasets: [{
            label: 'Cumulative Expenses',
            data: cumulativeData,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
        }]
    };
}

function prepareBubbleChartData() {
    const typeData = {};
    filteredExpenses.forEach(expense => {
        if (!typeData[expense.type]) {
            typeData[expense.type] = { total: 0, count: 0 };
        }
        typeData[expense.type].total += parseFloat(expense.amount);
        typeData[expense.type].count += 1;
    });

    const colors = [
        '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe',
        '#43e97b', '#38f9d7', '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3',
        '#ff9a9e', '#fecfef', '#ffeaa7', '#fab1a0'
    ];

    const bubbleData = Object.keys(typeData).map((type, index) => ({
        x: typeData[type].count,
        y: typeData[type].total,
        r: Math.max(Math.sqrt(typeData[type].total) * 0.5, 8), // Better bubble sizing
        label: type
    }));

    return {
        datasets: [{
            label: 'Expense Types',
            data: bubbleData,
            backgroundColor: colors.slice(0, bubbleData.length),
            borderColor: '#ffffff',
            borderWidth: 2
        }]
    };
}

async function exportToCSV() {
    if (filteredExpenses.length === 0) {
        alert('No expenses to export for the selected date range.');
        return;
    }

    // Get date range for budget info
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const billingFilter = document.getElementById('billing-filter').value;

    // Generate filename based on filters
    let filename = 'expenses';

    if (startDate && endDate) {
        if (startDate === endDate) {
            filename += `_${startDate}`;
        } else {
            filename += `_${startDate}_to_${endDate}`;
        }
    } else if (startDate) {
        filename += `_from_${startDate}`;
    } else if (endDate) {
        filename += `_until_${endDate}`;
    }

    if (billingFilter === 'billed') {
        filename += '_billed';
    } else if (billingFilter === 'unbilled') {
        filename += '_unbilled';
    } else {
        filename += '_both';
    }

    filename += '.csv';

    // Check if the date range spans only one month
    const startMonth = startDate ? new Date(startDate).getMonth() + 1 : null;
    const startYear = startDate ? new Date(startDate).getFullYear() : null;
    const endMonth = endDate ? new Date(endDate).getMonth() + 1 : null;
    const endYear = endDate ? new Date(endDate).getFullYear() : null;

    const isSingleMonthExport = startMonth === endMonth && startYear === endYear && startMonth && endMonth;

    const headers = ['Date', 'Type', 'Amount', 'Note', 'Billed'];
    const rows = filteredExpenses.map(expense => [
        expense.date,
        `"${expense.type}"`,
        expense.amount,
        `"${expense.note || ''}"`,
        expense.billed ? 'Yes' : 'No'
    ]);

    // Calculate total
    const total = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    // Add total row
    rows.push(['', '', '', '', '']);
    rows.push(['', '', 'TOTAL:', `Rs. ${total.toFixed(2)}`, '']);

    // Check if export contains both billed and unbilled, or just one type
    const hasBilled = filteredExpenses.some(e => e.billed);
    const hasUnbilled = filteredExpenses.some(e => !e.billed);

    // Only show budget info if it's a single month export
    if (isSingleMonthExport) {
        try {
            // Fetch budget for the specific month
            const { data: budgetData } = await supabase
                .from('user_budgets')
                .select('monthly_billed_budget, monthly_unbilled_budget')
                .eq('user_id', currentUser.id)
                .eq('budget_month', startMonth)
                .eq('budget_year', startYear)
                .single();

            const exportBilledBudget = budgetData?.monthly_billed_budget || 0;
            const exportUnbilledBudget = budgetData?.monthly_unbilled_budget || 0;

            if (exportBilledBudget > 0 || exportUnbilledBudget > 0) {
                const billedSpent = filteredExpenses.filter(e => e.billed).reduce((sum, e) => sum + parseFloat(e.amount), 0);
                const unbilledSpent = filteredExpenses.filter(e => !e.billed).reduce((sum, e) => sum + parseFloat(e.amount), 0);

                rows.push(['', '', '', '', '']);

                // Only add billed budget info if export has billed expenses and budget is set
                if (hasBilled && exportBilledBudget > 0) {
                    rows.push(['', '', 'BILLED BUDGET:', `Rs. ${exportBilledBudget.toFixed(2)}`, '']);
                    rows.push(['', '', 'BILLED SPENT:', `Rs. ${billedSpent.toFixed(2)}`, '']);
                    rows.push(['', '', 'BILLED REMAINING:', `Rs. ${(exportBilledBudget - billedSpent).toFixed(2)}`, '']);
                    if (hasUnbilled) rows.push(['', '', '', '', '']); // Add separator if both types
                }

                // Only add unbilled budget info if export has unbilled expenses and budget is set
                if (hasUnbilled && exportUnbilledBudget > 0) {
                    rows.push(['', '', 'UNBILLED BUDGET:', `Rs. ${exportUnbilledBudget.toFixed(2)}`, '']);
                    rows.push(['', '', 'UNBILLED SPENT:', `Rs. ${unbilledSpent.toFixed(2)}`, '']);
                    rows.push(['', '', 'UNBILLED REMAINING:', `Rs. ${(exportUnbilledBudget - unbilledSpent).toFixed(2)}`, '']);
                }
            }
        } catch (error) {
            console.error('Failed to fetch budget for export month:', error);
        }
    }

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showExpenseList() {
    // Remove existing list
    const existingList = document.querySelector('.expense-list-container');
    if (existingList) existingList.remove();

    if (filteredExpenses.length === 0) return;

    const chartContainer = document.querySelector('.chart-container');
    const listContainer = document.createElement('div');
    listContainer.className = 'expense-list-container';
    listContainer.innerHTML = `
                <div style="margin-top: 2rem;">
                    <h4 style="margin-bottom: 1rem; color: #374151;">Filtered Expenses (${filteredExpenses.length})</h4>
                    <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px;">
                        ${filteredExpenses.map(expense => `
                            <div class="expense-item" style="margin: 0; border-radius: 0;" data-id="${expense.id}">
                                <div class="expense-details">
                                    <div class="expense-amount" data-original="${expense.amount}">₹${parseFloat(expense.amount).toFixed(2)}</div>
                                    <div class="expense-note" data-original="${expense.note || ''}">${sanitizeHTML(expense.note) || 'No description'}</div>
                                    <div class="expense-meta">
                                        <span class="expense-type" data-original="${expense.type}">${expense.type}</span>
                                        <span class="billed-status" data-billed="${expense.billed}">
                                            ${expense.billed ? '<span class="billed-badge">BILLED</span>' : '<span style="color: #ef4444; font-size: 0.7rem; font-weight: 600;">UNBILLED</span>'}
                                        </span>
                                        <span class="expense-date" data-original="${expense.date}">${formatDate(expense.date)}</span>
                                    </div>
                                </div>
                                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <svg class="edit-icon" id="edit-icon-${expense.id}" onclick="toggleEditMode(${expense.id})" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="24" height="24" style="background: #667eea; color: white; stroke: white; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; padding: 6px;">
                                            <path d="m18 2 4 4-14 14H4v-4L18 2z"></path>
                                            <path d="M14.5 5.5 18.5 9.5"></path>
                                        </svg>
                                        <svg class="delete-btn" id="delete-btn-${expense.id}" onclick="deleteFilteredExpense(${expense.id})" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24" title="Delete expense" style="background: #ef4444; color: white; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; padding: 6px;">
                                            <polyline points="3,6 5,6 21,6"></polyline>
                                            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,2h4a2,2 0 0,1 2,2v2"></path>
                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                        </svg>
                                    </div>
                                    <div class="edit-toggle-container" id="edit-container-${expense.id}" style="display: none;">
                                        <div class="billed-toggle ${expense.billed ? 'active' : ''}" onclick="toggleBillingStatus(${expense.id})"></div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
    // Calculate and display total
    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    listContainer.innerHTML += `
                <div style="margin-top: 1rem; padding: 1rem; background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05)); border-radius: 12px; border: 1px solid rgba(102, 126, 234, 0.1);">
                    <div class="expense-total" style="font-size: 1.1rem; font-weight: 600; color: #374151; text-align: right;">
                        Total: ₹${totalAmount.toFixed(2)}
                    </div>
                </div>
            `;
    // Add save changes button after the expense list
    if (filteredExpenses.length > 0) {
        listContainer.innerHTML += `
                    <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
                        <button class="save-changes-btn" style="display: none;" onclick="saveAllChanges()">Save Changes</button>
                    </div>
                `;
    }
    chartContainer.parentNode.insertBefore(listContainer, chartContainer.nextSibling);
}

// Utility functions
function showAlert(containerId, message, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Global variables for edit mode
let editedExpenses = new Set();
let expenseEdits = {};

// Delete type functions
function showDeleteTypeModal() {
    document.getElementById('delete-type-modal').style.display = 'block';

    // Auto-select the current type if one is selected
    const currentType = document.getElementById('type').value;

    loadTypesForDeletion().then(() => {
        if (currentType) {
            document.getElementById('delete-type-select').value = currentType;
        }
    });
}

function closeDeleteTypeModal() {
    document.getElementById('delete-type-modal').style.display = 'none';
    document.getElementById('delete-type-form').reset();
    document.getElementById('delete-type-alert').innerHTML = '';
}

async function loadTypesForDeletion() {
    try {
        const { data, error } = await supabase
            .from('expense_types')
            .select('name')
            .order('name');

        if (error) throw error;

        const typeSelect = document.getElementById('delete-type-select');
        typeSelect.innerHTML = '<option value="">Select Type</option>';

        data.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;
            option.textContent = type.name;
            typeSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load types:', error);
    }
}

function showSearchModal() {
    document.getElementById('search-modal').style.display = 'block';
    document.getElementById('search-input').focus();
    loadAllExpensesForSearch();
}

function closeSearchModal() {
    document.getElementById('search-modal').style.display = 'none';
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '';
}

// Add this function for search
async function loadAllExpensesForSearch() {
    try {
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;

        allExpensesCache = data || [];
        performSearch(); // Show all initially
    } catch (error) {
        console.error('Failed to load expenses for search:', error);
    }
}

// Add search function
function performSearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const resultsContainer = document.getElementById('search-results');

    if (!allExpensesCache) {
        resultsContainer.innerHTML = '<p>Loading...</p>';
        return;
    }

        let filteredResults = allExpensesCache;

    if (searchTerm) {
        filteredResults = allExpensesCache.filter(expense =>
            expense.note?.toLowerCase().includes(searchTerm) ||
            expense.type.toLowerCase().includes(searchTerm) ||
            expense.amount.toString().includes(searchTerm) ||
            formatDate(expense.date).toLowerCase().includes(searchTerm)
        );
    }

    if (filteredResults.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 2rem;">No expenses found</p>';
        return;
    }

    const total = filteredResults.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    resultsContainer.innerHTML = `
        <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f9fafb; border-radius: 8px; font-weight: 600;">
            Found ${filteredResults.length} expense(s) totaling ₹${total.toFixed(2)}
        </div>
        ${filteredResults.map(expense => `
            <div class="expense-item" style="margin-bottom: 0.5rem;">
                <div class="expense-details">
                    <div class="expense-amount">₹${parseFloat(expense.amount).toFixed(2)}</div>
                    <div class="expense-note">${expense.note || 'No description'}</div>
                    <div class="expense-meta">
                        <span class="expense-type">${expense.type}</span>
                        ${expense.billed ? '<span class="billed-badge">BILLED</span>' : '<span style="color: #ef4444; font-size: 0.7rem; font-weight: 600;">UNBILLED</span>'}
                        <span>${formatDate(expense.date)}</span>
                    </div>
                </div>
            </div>
        `).join('')}
    `;
}

// Add spending insights function
function showInsightsModal() {
    document.getElementById('insights-modal').style.display = 'block';
    loadSpendingInsights();
}

function closeInsightsModal() {
    document.getElementById('insights-modal').style.display = 'none';
}

// Add insights calculation
async function loadSpendingInsights() {
    try {
        const { data, error } = await supabase
            .from('expenses')
            .select('note, amount, date, type, billed')
            .order('date', { ascending: false });

        if (error) throw error;

        const insights = calculateInsights(data);
        displayInsights(insights);
    } catch (error) {
        console.error('Failed to load insights:', error);
    }
}

function calculateInsights(expenses) {
    const istNow = getISTDate();
    const currentMonth = istNow.getMonth() + 1;
    const currentYear = istNow.getFullYear();
    const bounds = getISTMonthBounds(currentYear, currentMonth);

    const thisMonth = expenses.filter(expense => {
        return expense.date >= bounds.first && expense.date <= bounds.last;
    });

    const lastMonthBounds = currentMonth === 1 ?
        getISTMonthBounds(currentYear - 1, 12) :
        getISTMonthBounds(currentYear, currentMonth - 1);

    const lastMonth = expenses.filter(expense => {
        return expense.date >= lastMonthBounds.first && expense.date <= lastMonthBounds.last;
    });

    // Calculations
    const thisMonthTotal = thisMonth.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const lastMonthTotal = lastMonth.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const monthlyChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    // Top categories this month
    const categoryTotals = {};
    thisMonth.forEach(expense => {
        categoryTotals[expense.type] = (categoryTotals[expense.type] || 0) + parseFloat(expense.amount);
    });

    const topCategories = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 6);

    // Daily average
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentDay = istNow.getDate();
    const dailyAverage = thisMonthTotal / currentDay;
    const projectedMonthly = dailyAverage * daysInMonth;

    // Highest expense
    const highestExpense = thisMonth.length > 0 ?
        thisMonth.reduce((max, expense) => parseFloat(expense.amount) > parseFloat(max.amount) ? expense : max) : null;

    // Average per transaction
    const avgPerTransaction = thisMonth.length > 0 ? thisMonthTotal / thisMonth.length : 0;

    // Lowest expense
    const lowestExpense = thisMonth.length > 0 ?
    thisMonth.reduce((min, expense) => parseFloat(expense.amount) < parseFloat(min.amount) ? expense : min) : null;

    return {
        thisMonthTotal,
        lastMonthTotal,
        monthlyChange,
        topCategories,
        dailyAverage,
        projectedMonthly,
        highestExpense,
        lowestExpense,
        totalExpenses: thisMonth.length,
        avgPerTransaction
    };
}

function displayInsights(insights) {
    const container = document.getElementById('insights-content');
    const monthName = getCurrentMonthName();

    container.innerHTML = `
        <div style="margin-bottom: 2rem;"></div>
        <div class="insights-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem;">

            <div class="insight-card" style="padding: 1.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 12px;">
                <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; opacity: 0.9;">This Month Total</h4>
                <p style="margin: 0; font-size: 2rem; font-weight: 700;">₹${insights.thisMonthTotal.toFixed(2)}</p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; opacity: 0.8;">${insights.totalExpenses} transactions</p>
            </div>

            <div class="insight-card" style="padding: 1.5rem; background: ${insights.monthlyChange > 0? 'linear-gradient(135deg, #d4fc79, #96e6a1)' : 'linear-gradient(135deg, #fbc2eb, #a18cd1)'}; color: white; border-radius: 12px;">
                <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; opacity: 0.9;">vs Last Month</h4>
                <p style="margin: 0; font-size: 2rem; font-weight: 700; color: ${insights.monthlyChange > 0 ? '#ff4757' : '#39cc79'};"> ${insights.monthlyChange >= 0 ? '+' : ''}${insights.monthlyChange.toFixed(1)}% </p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; opacity: 0.8;"> ₹${insights.lastMonthTotal.toFixed(2)} last month </p>
            </div>

            <div class="insight-card" style="padding: 1.5rem; background: linear-gradient(135deg, #4facfe, #00f2fe); color: white; border-radius: 12px;">
                <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; opacity: 0.9;">Daily Average</h4>
                <p style="margin: 0; font-size: 2rem; font-weight: 700;">₹${insights.dailyAverage.toFixed(2)}</p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; opacity: 0.8;">Projected: ₹${insights.projectedMonthly.toFixed(2)}</p>
            </div>

            <div class="insight-card" style="padding: 1.5rem; background: linear-gradient(135deg,rgb(215, 189, 94), #fab1a0); color: #white; border-radius: 12px;">
                <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; opacity: 0.8;">Avg Per Transaction</h4>
                <p style="margin: 0; font-size: 2rem; font-weight: 700;">₹${(insights.thisMonthTotal / Math.max(insights.totalExpenses, 1)).toFixed(2)}</p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; opacity: 0.8;">Range analysis</p>
            </div>

        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">

            <div>
                <h4 style="margin-bottom: 1rem; color: #374151;">Top Categories This Month</h4>
                <div style="space-y: 0.5rem;">
                    ${insights.topCategories.map(([category, amount], index) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f9fafb; border-radius: 8px; margin-bottom: 0.5rem;">
                            <span style="font-weight: 500; color: #374151;">${index + 1}. ${category}</span>
                            <span style="font-weight: 600; color: #667eea;">₹${amount.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div>
                <h4 style="margin-bottom: 1.25rem; color: #374151;">Expense Range</h4>
                ${insights.highestExpense ? `
                    <div style="padding: 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 1.5rem;">
                        <div style="font-size: 0.9rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">Highest Expense</div>
                        <div style="font-size: 1.5rem; font-weight: 600; color: #dc2626; margin-bottom: 0.5rem;">₹${parseFloat(insights.highestExpense.amount).toFixed(2)}</div>
                        <div style="color: #6b7280; margin-bottom: 0.25rem;">${insights.highestExpense.note ? sanitizeHTML(insights.highestExpense.note) : 'No description'}</div>
                        <div style="font-size: 0.875rem; color: #6b7280;">
                            ${insights.highestExpense.type} • ${formatDate(insights.highestExpense.date)}
                        </div>
                    </div>
                ` : ''}
                ${insights.lowestExpense ? `
                    <div style="padding: 1rem; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;">
                        <div style="font-size: 0.9rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">Lowest Expense</div>
                        <div style="font-size: 1.5rem; font-weight: 600; color:rgb(8, 161, 3); margin-bottom: 0.5rem;">₹${parseFloat(insights.lowestExpense.amount).toFixed(2)}</div>
                        <div style="color: #6b7280; margin-bottom: 0.25rem;">${insights.lowestExpense.note ? sanitizeHTML(insights.lowestExpense.note) : 'No description'}</div>
                        <div style="font-size: 0.875rem; color: #6b7280;">
                            ${insights.lowestExpense.type} • ${formatDate(insights.lowestExpense.date)}
                        </div>
                    </div>
                ` : '<p style="color: #9ca3af;">No expenses this month</p>'}
            </div>

        </div>
    `;
}

document.getElementById('delete-type-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const typeName = document.getElementById('delete-type-select').value;

    if (!typeName) {
        showAlert('delete-type-alert', 'Please select a type to delete.', 'error');
        return;
    }

    try {
        // Check if type is being used
        const { data: usedTypes, error: checkError } = await supabase
            .from('expenses')
            .select('type')
            .eq('type', typeName)
            .limit(1);

        if (checkError) throw checkError;

        if (usedTypes && usedTypes.length > 0) {
            showAlert('delete-type-alert', 'Cannot delete type that is being used in expenses.', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete the type "${typeName}"?`)) {
            return;
        }

        const { error } = await supabase
            .from('expense_types')
            .delete()
            .eq('name', typeName)
            .eq('user_id', currentUser.id);

        if (error) throw error;

        loadUserTypes();
        showAlert('delete-type-alert', 'Type deleted successfully!', 'success');
        setTimeout(() => closeDeleteTypeModal(), 1500);
    } catch (error) {
        showAlert('delete-type-alert', error.message || 'Failed to delete type.', 'error');
    }
});

function showEditTypeModal() {
    document.getElementById('edit-type-modal').style.display = 'block';
    loadTypesForEdit().then(types => {
        const editSelect = document.getElementById('edit-type-select');
        editSelect.innerHTML = '<option value="">Select Type</option>';
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            editSelect.appendChild(option);
        });

        // Pre-select current type if one is selected
        const currentType = document.getElementById('type').value;
        if (currentType) {
            editSelect.value = currentType;
            document.getElementById('edit-type-name').value = currentType;
        }
    });
}

function closeEditTypeModal() {
    document.getElementById('edit-type-modal').style.display = 'none';
    document.getElementById('edit-type-form').reset();
    document.getElementById('edit-type-alert').innerHTML = '';
}

function populateEditField() {
    const selectedType = document.getElementById('edit-type-select').value;
    document.getElementById('edit-type-name').value = selectedType;
}

// Add event listener in DOMContentLoaded:
document.getElementById('edit-type-form').addEventListener('submit', handleEditType);

async function handleEditType(e) {
    e.preventDefault();
    const oldTypeName = document.getElementById('edit-type-select').value;
    const newTypeName = document.getElementById('edit-type-name').value.trim();

    if (!oldTypeName) {
        showAlert('edit-type-alert', 'Please select a type to edit.', 'error');
        return;
    }

    if (!newTypeName) {
        showAlert('edit-type-alert', 'Please enter a new type name.', 'error');
        return;
    }

    if (oldTypeName === newTypeName) {
        showAlert('edit-type-alert', 'No changes found. Please modify the type name.', 'error');
        return;
    }

    try {
        // Check if new type name already exists
        const { data: existing } = await supabase
            .from('expense_types')
            .select('name')
            .ilike('name', newTypeName)
            .neq('name', oldTypeName);

        if (existing && existing.length > 0) {
            showAlert('edit-type-alert', 'A type with this name already exists.', 'error');
            return;
        }

        // Update type in expense_types table
        const { error: typeError } = await supabase
            .from('expense_types')
            .update({ name: newTypeName })
            .eq('name', oldTypeName)
            .eq('user_id', currentUser.id);

        if (typeError) throw typeError;

        // Update all expenses that use this type
        const { error: expenseError } = await supabase
            .from('expenses')
            .update({ type: newTypeName })
            .eq('type', oldTypeName)
            .eq('user_id', currentUser.id);

        if (expenseError) throw expenseError;

        // Refresh UI
        loadUserTypes();
        document.getElementById('type').value = newTypeName;

        // Refresh visualization if open
        if (document.getElementById('visualization-modal').style.display === 'block') {
            loadTypesForFilter();
            applyDateFilter();
        }

        showAlert('edit-type-alert', 'Type updated successfully!', 'success');
        setTimeout(() => closeEditTypeModal(), 1500);
    } catch (error) {
        showAlert('edit-type-alert', error.message || 'Failed to update type.', 'error');
    }
}

// Edit expense functions
function toggleEditMode(expenseId) {
    const container = document.getElementById(`edit-container-${expenseId}`);
    const icon = document.getElementById(`edit-icon-${expenseId}`);
    const deleteBtn = document.getElementById(`delete-btn-${expenseId}`);
    const expenseItem = document.querySelector(`[data-id="${expenseId}"]`);
    const isVisible = container.style.display === 'flex';

    if (isVisible) {
        // Save mode - restore static elements and update display
        expenseItem.classList.remove('edit-mode');
        restoreStaticElements(expenseId);

        // Update billed status display
        const billedStatusSpan = container.closest('.expense-item').querySelector('.billed-status');
        const currentEdit = expenseEdits[expenseId];

        if (currentEdit && currentEdit.billed !== undefined) {
            billedStatusSpan.innerHTML = currentEdit.billed ?
                '<span class="billed-badge">BILLED</span>' :
                '<span style="color: #ef4444; font-size: 0.7rem; font-weight: 600;">UNBILLED</span>';
            billedStatusSpan.dataset.billed = currentEdit.billed;
        }

        // Hide toggle
        container.style.display = 'none';

        // Check if there are any changes to determine button display
        const hasChanges = editedExpenses.has(expenseId);

        if (hasChanges) {
            // Show cancel (X) button
            deleteBtn.innerHTML = `<path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" fill="none"></path>`;
            deleteBtn.style.background = '#ef4444';
            deleteBtn.onclick = () => cancelEdit(expenseId);
            deleteBtn.title = 'Cancel changes';
        } else {
            // Show delete button
            deleteBtn.innerHTML = `
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,2h4a2,2 0 0,1 2,2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    `;
            deleteBtn.style.background = '#ef4444';
            deleteBtn.onclick = () => deleteFilteredExpense(expenseId);
            deleteBtn.title = 'Delete expense';
        }

        deleteBtn.style.display = 'block';

        // Switch back to pencil icon
        icon.innerHTML = `
                    <path d="m18 2 4 4-14 14H4v-4L18 2z"></path>
                    <path d="M14.5 5.5 18.5 9.5"></path>
                `;
        icon.style.background = '#667eea';
        icon.onclick = () => toggleEditMode(expenseId);
    } else {
        // Edit mode - show editable elements
        expenseItem.classList.add('edit-mode');

        // Get original data for this expense
        const expense = filteredExpenses.find(e => e.id == expenseId);
        createEditableElements(expenseId, expense);

        // Show toggle and hide delete button
        container.style.display = 'flex';
        deleteBtn.style.display = 'none';

        // Switch to check/save icon
        icon.innerHTML = `<polyline points="20,6 9,17 4,12"></polyline>`;
        icon.style.background = '#10b981';
        icon.onclick = () => toggleEditMode(expenseId);

        // Change delete button to cancel (X) button
        const cancelBtn = document.getElementById(`delete-btn-${expenseId}`);
        cancelBtn.innerHTML = `<path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" fill="none"></path>`;
        cancelBtn.style.background = '#ef4444'; // Changed from '#6b7280' to red
        cancelBtn.onclick = () => cancelEdit(expenseId);
        cancelBtn.title = 'Cancel changes';
        cancelBtn.style.display = 'block';

        // Initialize tracking if not already done
        if (!expenseEdits[expenseId]) {
            expenseEdits[expenseId] = {
                originalAmount: parseFloat(expense.amount),
                originalNote: expense.note || '',
                originalType: expense.type,
                originalDate: expense.date,
                originalBilled: expense.billed,
                billed: expense.billed
            };
        }
    }

    updateSaveButton();
}

function cancelEdit(expenseId) {
    const container = document.getElementById(`edit-container-${expenseId}`);
    const icon = document.getElementById(`edit-icon-${expenseId}`);
    const deleteBtn = document.getElementById(`delete-btn-${expenseId}`);
    const expenseItem = document.querySelector(`[data-id="${expenseId}"]`);

    // Remove from edited set and clear edits
    editedExpenses.delete(expenseId);
    delete expenseEdits[expenseId];

    // Exit edit mode
    expenseItem.classList.remove('edit-mode');

    // Restore original static elements from DB data
    const expense = filteredExpenses.find(e => e.id == expenseId);
    const amountEl = expenseItem.querySelector('.expense-amount');
    const noteEl = expenseItem.querySelector('.expense-note');
    const typeEl = expenseItem.querySelector('.expense-type');
    const dateEl = expenseItem.querySelector('.expense-date');
    const billedStatusEl = expenseItem.querySelector('.billed-status');

    // Reset to original DB values
    amountEl.innerHTML = `₹${parseFloat(expense.amount).toFixed(2)}`;
    amountEl.dataset.original = expense.amount;

    noteEl.innerHTML = expense.note || 'No description';
    noteEl.dataset.original = expense.note || '';

    typeEl.innerHTML = expense.type;
    typeEl.dataset.original = expense.type;

    dateEl.innerHTML = formatDate(expense.date);
    dateEl.dataset.original = expense.date;

    // Reset billing status
    billedStatusEl.innerHTML = expense.billed ?
        '<span class="billed-badge">BILLED</span>' :
        '<span style="color: #ef4444; font-size: 0.7rem; font-weight: 600;">UNBILLED</span>';
    billedStatusEl.dataset.billed = expense.billed;

    // Reset toggle to original state
    const toggle = container.querySelector('.billed-toggle');
    if (expense.billed) {
        toggle.classList.add('active');
    } else {
        toggle.classList.remove('active');
    }

    // Hide toggle and restore delete button
    container.style.display = 'none';
    deleteBtn.style.display = 'block';

    // Restore original delete button
    deleteBtn.innerHTML = `
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,2h4a2,2 0 0,1 2,2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            `;
    deleteBtn.style.background = '#ef4444';
    deleteBtn.onclick = () => deleteFilteredExpense(expenseId);
    deleteBtn.title = 'Delete expense';

    // Switch back to pencil icon
    icon.innerHTML = `
                <path d="m18 2 4 4-14 14H4v-4L18 2z"></path>
                <path d="M14.5 5.5 18.5 9.5"></path>
            `;
    icon.style.background = '#667eea';
    icon.onclick = () => toggleEditMode(expenseId);

    updateSaveButton();
}

function toggleBillingStatus(expenseId) {
    const toggle = document.querySelector(`#edit-container-${expenseId} .billed-toggle`);
    const originalBilledStatus = document.querySelector(`[data-id="${expenseId}"] .billed-status`).dataset.billed === 'true';
    const isActive = toggle.classList.contains('active');
    const newStatus = !isActive;

    toggle.classList.toggle('active');

    // Track the change
    if (!expenseEdits[expenseId]) {
        const expenseItem = document.querySelector(`[data-id="${expenseId}"]`);
        expenseEdits[expenseId] = {
            originalAmount: parseFloat(expenseItem.querySelector('.expense-amount').dataset.original),
            originalNote: expenseItem.querySelector('.expense-note').dataset.original,
            originalType: expenseItem.querySelector('.expense-type').dataset.original,
            originalDate: expenseItem.querySelector('.expense-date').dataset.original,
            originalBilled: originalBilledStatus
        };
    }
    expenseEdits[expenseId].billed = newStatus;

    // Check if anything has changed from original
    const hasChanges = newStatus !== expenseEdits[expenseId].originalBilled ||
        (expenseEdits[expenseId].amount !== undefined && expenseEdits[expenseId].amount !== expenseEdits[expenseId].originalAmount) ||
        (expenseEdits[expenseId].note !== undefined && expenseEdits[expenseId].note !== expenseEdits[expenseId].originalNote) ||
        (expenseEdits[expenseId].type !== undefined && expenseEdits[expenseId].type !== expenseEdits[expenseId].originalType) ||
        (expenseEdits[expenseId].date !== undefined && expenseEdits[expenseId].date !== expenseEdits[expenseId].originalDate);

    if (hasChanges) {
        editedExpenses.add(expenseId);
    } else {
        editedExpenses.delete(expenseId);
    }

    updateSaveButton();
}

function updateSaveButton() {
    const saveBtn = document.querySelector('.expense-list-container .save-changes-btn');
    if (saveBtn) {
        const hasActualChanges = editedExpenses.size > 0;
        saveBtn.style.display = hasActualChanges ? 'block' : 'none';
    }
}

async function saveAllChanges() {
    try {
        for (const [expenseId, changes] of Object.entries(expenseEdits)) {
            const updateData = {};

            if (changes.amount !== changes.originalAmount) updateData.amount = changes.amount;
            if (changes.note !== changes.originalNote) updateData.note = changes.note;
            if (changes.type !== changes.originalType) updateData.type = changes.type;
            if (changes.date !== changes.originalDate) updateData.date = changes.date;
            if (changes.billed !== changes.originalBilled) updateData.billed = changes.billed;

            if (Object.keys(updateData).length > 0) {
                const { error } = await supabase
                    .from('expenses')
                    .update(updateData)
                    .eq('id', expenseId)
                    .eq('user_id', currentUser.id);

                if (error) throw error;
            }
        }

        // Clear edit state
        editedExpenses.clear();
        expenseEdits = {};
        updateSaveButton();

        // Refresh displays
        applyDateFilter();
        await loadExpenses();
        await updateStatistics();
        await updateBudgetDisplay();
        await checkBudgetWarnings();

        showNotification('Changes saved successfully!', 'success');
    } catch (error) {
        showNotification('Failed to save changes: ' + error.message, 'error');
    }
}

async function loadUserBudget() {
    try {
        const istNow = getISTDate();
        const currentMonth = istNow.getMonth() + 1;
        const currentYear = istNow.getFullYear();

        const { data, error } = await supabase
            .from('user_budgets')
            .select('monthly_billed_budget, monthly_unbilled_budget')
            .eq('user_id', currentUser.id)
            .eq('budget_month', currentMonth)
            .eq('budget_year', currentYear);

        if (error) {
            console.error('Budget query error:', error);
            monthlyBilledBudget = 0;
            monthlyUnbilledBudget = 0;
        } else if (data && data.length > 0) {
            monthlyBilledBudget = data[0].monthly_billed_budget || 0;
            monthlyUnbilledBudget = data[0].monthly_unbilled_budget || 0;
        } else {
            monthlyBilledBudget = 0;
            monthlyUnbilledBudget = 0;
        }
        updateBudgetHeader();
    } catch (error) {
        console.error('Failed to load budget:', error);
        monthlyBilledBudget = 0;
        monthlyUnbilledBudget = 0;
        updateBudgetHeader();
    }
}

// Update setBudget function
document.getElementById('budget-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    try {
        const newBilledBudget = parseFloat(document.getElementById('billed-budget-amount').value) || 0;
        const newUnbilledBudget = parseFloat(document.getElementById('unbilled-budget-amount').value) || 0;

        if (newBilledBudget === monthlyBilledBudget && newUnbilledBudget === monthlyUnbilledBudget) {
            showNotification('Please make changes to update the budgets.', 'error');
            return;
        }

        if (newBilledBudget < 0 || newUnbilledBudget < 0) {
            showNotification('Budget amounts cannot be negative.', 'error');
            return;
        }

        const istNow = getISTDate();
        const currentMonth = istNow.getMonth() + 1;
        const currentYear = istNow.getFullYear();

        const { error } = await supabase
            .from('user_budgets')
            .upsert([{
                user_id: currentUser.id,
                monthly_billed_budget: newBilledBudget,
                monthly_unbilled_budget: newUnbilledBudget,
                budget_month: currentMonth,
                budget_year: currentYear
            }], {
                onConflict: 'user_id,budget_month,budget_year' // Match the new constraint
            });

        if (error) throw error;

        monthlyBilledBudget = newBilledBudget;
        monthlyUnbilledBudget = newUnbilledBudget;
        budgetWarningShown = { billed: false, unbilled: false };

        await updateBudgetDisplay();
        updateBudgetHeader();

        const budgetBtn = document.querySelector('.budget-tracker h3 + .btn');
        if (budgetBtn) budgetBtn.textContent = 'Update Budget';

        closeBudgetModal();
        showNotification(`${getCurrentMonthName()} budgets updated successfully!`, 'success');
    } catch (error) {
        console.error('Budget update error:', error);
        showNotification('Failed to update budget: ' + error.message, 'error');
    }
});

// Edit Profile Functions
function showEditProfile() {
    // Reset modal content completely
    document.getElementById('edit-profile-alert').innerHTML = '';
    document.getElementById('save-profile-btn').style.display = 'none';

    document.getElementById('edit-profile-modal').style.display = 'block';

    // Populate current values fresh
    const displayName = currentUser.user_metadata?.display_name ||
        currentUser.user_metadata?.name ||
        currentUser.user_metadata?.full_name ||
        '';

    document.getElementById('profile-name').value = displayName;
    document.getElementById('profile-email').value = currentUser.email;

    // Remove any existing event listeners
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');

    nameInput.oninput = null;
    emailInput.oninput = null;

    // Add fresh event listeners
    nameInput.oninput = emailInput.oninput = checkProfileChanges;

    nameInput.focus();
}

function closeEditProfileModal() {
    document.getElementById('edit-profile-modal').style.display = 'none';
    document.getElementById('edit-profile-form').reset();
    document.getElementById('edit-profile-alert').innerHTML = '';
    document.getElementById('save-profile-btn').style.display = 'none';
}

function checkProfileChanges() {
    const currentName = currentUser.user_metadata?.display_name ||
        currentUser.user_metadata?.name ||
        currentUser.user_metadata?.full_name ||
        '';

    const newName = document.getElementById('profile-name').value.trim();
    const newEmail = document.getElementById('profile-email').value.trim();
    const currentEmail = currentUser.email;

    const nameChanged = newName !== currentName;
    const emailChanged = newEmail !== currentEmail;

    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.style.display = (nameChanged || emailChanged) ? 'block' : 'none';
}

async function handleEditProfile(e) {
    e.preventDefault();

    const currentName = currentUser.user_metadata?.display_name ||
        currentUser.user_metadata?.name ||
        currentUser.user_metadata?.full_name ||
        '';

    const newName = document.getElementById('profile-name').value.trim();
    const newEmail = document.getElementById('profile-email').value.trim();
    const currentEmail = currentUser.email;

    const nameChanged = newName !== currentName;
    const emailChanged = newEmail !== currentEmail;

    if (!nameChanged && !emailChanged) {
        closeEditProfileModal();
        return;
    }

    try {
        // Handle name change
        if (nameChanged) {
            const { error } = await supabase.auth.updateUser({
                data: {
                    display_name: newName,
                    name: newName,
                    full_name: newName
                }
            });

            if (error) throw error;

            // Update display immediately
            document.getElementById('user-name').textContent = `Welcome, ${newName}!`;
            document.getElementById('user-avatar').textContent = newName.charAt(0).toUpperCase();
        }

        // Handle email change - Supabase will send verification to OLD email when "Secure email change" is ON
        if (emailChanged) {
            // Store pending change for reference
            localStorage.setItem('pendingEmailChange', JSON.stringify({
                oldEmail: currentEmail,
                newEmail: newEmail,
                timestamp: Date.now()
            }));

            // Use Supabase's built-in email change with redirect to current domain
            const { error } = await supabase.auth.updateUser(
                { email: newEmail },
                {
                    emailRedirectTo: `${window.location.origin}?type=email_change`
                }
            );

            if (error) throw error;

            showAlert('edit-profile-alert',
                `Email change verification sent to your current email and old email. Please check both your email and click the verification link to complete the change.`,
                'success');

            setTimeout(async () => {
                await supabase.auth.signOut();
                currentUser = null;
                closeEditProfileModal();
                showSignIn();
                showNotification('Signed out. Check your email for verification link.', 'info', 5000);
            }, 5000);

            return;
        }

        // If only name changed
        if (nameChanged && !emailChanged) {
            showAlert('edit-profile-alert', 'Name updated successfully!', 'success');
            setTimeout(() => {
                closeEditProfileModal();
                showNotification('Profile updated successfully!', 'success');
            }, 1500);
        }

    } catch (error) {
        showAlert('edit-profile-alert', error.message, 'error');
    }
}

// Handle email change confirmation when user clicks verification link
async function handleEmailChangeConfirmation() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const type = urlParams.get('type');

    if (type === 'email_change' && token) {
        try {
            // Verify the email change token
            const { data, error } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: 'email_change'
            });

            if (error) throw error;

            // Get pending change info
            const pendingChange = JSON.parse(localStorage.getItem('pendingEmailChange') || '{}');

            // Clear pending change immediately
            localStorage.removeItem('pendingEmailChange');

            // Sign out from all sessions to force re-login with new email
            await supabase.auth.signOut();

            // Clear all auth-related storage
            localStorage.removeItem('supabase.auth.token');
            const projectId = supabaseUrl.split('//')[1]?.split('.')[0];
            if (projectId) {
                localStorage.removeItem(`sb-${projectId}-auth-token`);
            }

            // Reset application state
            currentUser = null;
            isPasswordResetFlow = false;

            // Show success and redirect to sign in
            showNotification(`Email successfully changed! Please sign in with your new email address.`, 'success');
            showSignIn();

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);

        } catch (error) {
            console.error('Email change verification error:', error);
            showNotification('Email verification failed. Please try the process again.', 'error');

            // Clean URL and show sign in
            window.history.replaceState({}, document.title, window.location.pathname);
            showSignIn();
        }
    }
}

// Close modal when clicking outside
window.onclick = function (event) {
    const addTypeModal = document.getElementById('add-type-modal');
    const visualizationModal = document.getElementById('visualization-modal');
    const changePasswordModal = document.getElementById('change-password-modal');
    const budgetModal = document.getElementById('budget-modal');
    const editProfileModal = document.getElementById('edit-profile-modal');

    if (event.target === addTypeModal) {
        closeAddTypeModal();
    }
    if (event.target === visualizationModal) {
        closeVisualizationModal();
    }
    if (event.target === changePasswordModal && !isPasswordResetFlow) {
        closeChangePasswordModal();
    }
    if (event.target === budgetModal) {
        closeBudgetModal();
    }
    if (event.target === editProfileModal) {
        closeEditProfileModal();
    }
    if (event.target === document.getElementById('delete-type-modal')) {
        closeDeleteTypeModal();
    }
    if (event.target === document.getElementById('edit-type-modal')) {
        closeEditTypeModal();
    }
    if (event.target === document.getElementById('search-modal')) {
        closeSearchModal();
    }
    if (event.target === document.getElementById('insights-modal')) {
        closeInsightsModal();
    }

}

function toggleFormBilling() {
    const toggle = document.getElementById('form-billed-toggle');
    const isActive = toggle.classList.contains('active');
    toggle.classList.toggle('active');

    // Update hidden checkbox for form submission
    const checkbox = document.getElementById('billed');
    checkbox.checked = toggle.classList.contains('active');
}
