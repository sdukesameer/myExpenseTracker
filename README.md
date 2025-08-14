# 💰 Expense Tracker

A modern, full-featured expense tracking web application built with vanilla JavaScript and Supabase backend. Track your daily expenses with beautiful visualizations, budget management, and real-time analytics.

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge)](https://your-demo-url.com)
[![GitHub Stars](https://img.shields.io/github/stars/sdukesameer/myExpenseTracker?style=for-the-badge)](https://github.com/sdukesameer/myExpenseTracker)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

## ✨ Features

### 🔐 **User Management**
- **Secure Authentication** - Sign up, sign in, password reset with email verification
- **Profile Management** - Edit profile details, change passwords, secure email updates
- **Session Management** - Auto-login, secure logout from all devices

### 💳 **Expense Management** 
- **Quick Entry** - Add expenses with amount, type, date, notes, and billing status
- **Smart Categorization** - Custom expense types with add/delete functionality
- **Edit & Delete** - Inline editing of expense details with real-time validation
- **Billing Tracking** - Toggle between billed/unbilled status for better organization

### 📊 **Analytics & Visualization**
- **Interactive Charts** - Pie, bar, line, and doughnut charts with Chart.js
- **Date Filtering** - Filter expenses by custom date ranges
- **Billing Analytics** - Separate analytics for billed vs unbilled expenses
- **Real-time Stats** - Monthly totals, expense counts, and category breakdowns

### 💰 **Budget Management**
- **Monthly Budgets** - Set and track monthly spending limits
- **Progress Tracking** - Visual progress bars with color-coded warnings
- **Smart Alerts** - Notifications when approaching or exceeding budget limits
- **Remaining Balance** - Real-time calculation of remaining budget

### 📱 **Modern UI/UX**
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Dark/Light Theme** - Toggle between themes with persistent preference
- **Smooth Animations** - Micro-interactions and hover effects
- **Progressive Web App** - Install as native app with offline capabilities

### 📈 **Data Export**
- **CSV Export** - Download filtered expense data for external analysis
- **Date Range Export** - Export specific time periods
- **Billing Status Export** - Separate exports for billed/unbilled expenses

## 🚀 Quick Start

### Prerequisites
- Web browser with JavaScript enabled
- Supabase account (for backend services)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sdukesameer/myExpenseTracker.git
   cd myExpenseTracker
   ```

2. **Set up Supabase**
   - Create a new project at [Supabase](https://supabase.com)
   - Create the required tables (see Database Schema below)
   - Get your project URL and anon key

3. **Configure environment**
   ```javascript
   // Update these variables in the HTML file
   const supabaseUrl = 'YOUR_SUPABASE_URL';
   const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
   ```

4. **Deploy**
   - Upload files to your web server
   - Or use GitHub Pages, Netlify, Vercel for quick deployment

## 🗄️ Database Schema

### Required Supabase Tables

```sql
-- Users table (handled by Supabase Auth)

-- Expenses table
CREATE TABLE expenses (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL,
    note TEXT,
    date DATE NOT NULL,
    billed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense Types table
CREATE TABLE expense_types (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- User Budgets table
CREATE TABLE user_budgets (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_budget DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Profiles table
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    requires_password_reset BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Expenses policies
CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);

-- Expense types policies
CREATE POLICY "Users can view own types" ON expense_types FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own types" ON expense_types FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own types" ON expense_types FOR DELETE USING (auth.uid() = user_id);

-- User budgets policies
CREATE POLICY "Users can manage own budget" ON user_budgets FOR ALL USING (auth.uid() = user_id);

-- User profiles policies  
CREATE POLICY "Users can manage own profile" ON user_profiles FOR ALL USING (auth.uid() = user_id);
```

## 🎯 Usage

### Adding Expenses
1. Fill in the expense form with amount, type, and date
2. Add optional notes for better tracking
3. Set billing status (billed/unbilled)
4. Click "Add Expense" to save

### Managing Categories
- Click the "+" button next to expense type to add custom categories
- Click the "-" button to delete unused categories
- Default categories are provided for new users

### Viewing Analytics
1. Click "📊 Edit / Analytics" button
2. Set date range filters
3. Choose billing status filter
4. Switch between different chart types
5. Export data as CSV for external analysis

### Budget Tracking
1. Click "Set Budget" in the budget section
2. Enter your monthly budget amount
3. Monitor progress with the visual progress bar
4. Receive alerts when approaching limits

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Charts**: Chart.js for data visualization
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: Custom CSS with CSS Grid and Flexbox
- **PWA**: Web App Manifest for installable app experience

## 🎨 Features in Detail

### Theme System
- Automatic dark/light mode toggle
- Persistent theme preference
- Smooth transitions between themes

### Responsive Design
- Mobile-first approach
- Optimized touch targets for mobile
- Adaptive layouts for different screen sizes

### Data Validation
- Client-side form validation
- Amount limits (₹1 to ₹1,000,000)
- Required field validation
- Email format validation

### Security Features
- Row Level Security (RLS) in Supabase
- Secure password reset flow
- Email verification for account changes
- Session management with automatic cleanup

## 🚀 Deployment

### GitHub Pages
```bash
# Enable GitHub Pages in repository settings
# Point to main branch or docs folder
```

### Netlify
1. Connect your GitHub repository
2. Set build command: (none needed for static site)
3. Set publish directory: `/` or root
4. Deploy

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Contribution Guidelines
- Follow existing code style
- Add comments for complex logic
- Test on multiple devices/browsers
- Update documentation for new features

## 🐛 Known Issues

- Date picker may show different formats on different browsers
- Export functionality requires modern browser support
- PWA features require HTTPS for full functionality

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for backend services
- [Chart.js](https://www.chartjs.org) for visualization
- [Inter Font](https://rsms.me/inter) for typography

## 📞 Support

- 🐛 [Report Bug](https://github.com/sdukesameer/myExpenseTracker/issues)
- 💡 [Request Feature](https://github.com/sdukesameer/myExpenseTracker/issues)
- 📧 [Contact Developer](mailto:your-email@example.com)

---

⭐ **Star this repository if it helped you track your expenses better!**

Made with ❤️ by [MD SAMEER](https://www.linkedin.co.in/sdukesameer)
