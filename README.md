# 💰 My Expense Tracker

A comprehensive, feature-rich expense tracking web application built with vanilla JavaScript and Supabase backend. Track your daily expenses with advanced analytics, budget management, data visualization, and intelligent insights.

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge)](https://your-demo-url.com)
[![GitHub Stars](https://img.shields.io/github/stars/sdukesameer/myExpenseTracker?style=for-the-badge)](https://github.com/sdukesameer/myExpenseTracker)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

## ✨ Key Highlights

- **🔐 Complete User Authentication System** with secure password reset & email change
- **💰 Advanced Budget Management** with separate billed/unbilled tracking
- **📊 Rich Data Visualization** with 4 different chart types
- **🔍 Powerful Search & Filtering** with real-time expense search
- **📈 Spending Insights & Analytics** with trend analysis
- **🎨 Modern Responsive UI** with dark/light theme toggle
- **📱 Mobile-First Design** optimized for all devices
- **📤 Smart Data Export** with CSV download and budget summaries
- **⚡ Real-Time Updates** with instant notifications

## 🚀 Feature Overview

### 🔐 **Authentication & Security**
- **Complete Auth Flow** - Sign up, sign in, email verification, password reset
- **Secure Email Change** - Verification sent to both old and new email addresses
- **Password Management** - Change password with validation and forced reset support
- **Profile Management** - Edit display name and email with real-time validation
- **Session Management** - Auto-login, secure logout from all devices
- **Security Features** - Row Level Security, input sanitization, CSRF protection

### 💳 **Expense Management** 
- **Quick Entry Form** - Add expenses with amount, type, date, notes, and billing status
- **Inline Editing** - Edit expense details directly in the list with real-time validation
- **Bulk Operations** - Save multiple expense edits simultaneously
- **Billed/Unbilled Toggle** - Track reimbursable vs personal expenses
- **Smart Validation** - Amount limits (₹1 to ₹10,00,000), required fields, character limits
- **Auto-prefill** - SMS integration support for automatic amount entry
- **Delete Protection** - Confirmation dialogs for destructive actions

### 🏷️ **Category Management**
- **Custom Expense Types** - Add, edit, delete, and manage expense categories
- **Default Categories** - Pre-populated with common expense types for new users
- **Usage Validation** - Prevents deletion of categories in use
- **Type Statistics** - Track spending by category with visual breakdowns

### 📊 **Advanced Analytics & Visualization**
- **Multiple Chart Types**:
  - **Pie Charts** - Category distribution
  - **Doughnut Charts** - Enhanced category visualization
  - **Line Charts** - Cumulative expense trends over time
  - **Bar Charts** - Category comparisons (vertical)
  - **Horizontal Bar Charts** - Alternative category view
  - **Bubble Charts** - Amount vs frequency analysis
- **Interactive Filtering**:
  - Date range selection with calendar picker
  - Billing status filter (All/Billed/Unbilled)
  - Category-specific filtering
  - Real-time chart updates
- **Chart Interactivity** - Hover effects, tooltips, and responsive design

### 💰 **Comprehensive Budget Management**
- **Separate Budgets** - Independent tracking for billed and unbilled expenses
- **Monthly Budget Setting** - Set different budgets for each month
- **Visual Progress Bars** - Color-coded progress indicators (green/orange/red)
- **Smart Alerts** - Notifications at 90% and 100% budget usage
- **Budget Analytics** - Remaining balance calculations with percentages
- **Historical Budgets** - Month-by-month budget tracking
- **Export Integration** - Budget information included in CSV exports

### 🔍 **Search & Discovery**
- **Real-Time Search** - Instant search across all expense fields
- **Multi-field Search** - Search by note, category, amount, or date
- **Search Results** - Highlighted matches with total calculations
- **Quick Access** - Searchable expense history with no date limitations

### 📈 **Spending Insights**
- **Monthly Comparisons** - Current vs previous month analysis
- **Trend Analysis** - Percentage change calculations
- **Category Rankings** - Top spending categories identification
- **Daily Averages** - Average daily spending with monthly projections
- **Transaction Analytics** - Average per transaction, highest/lowest expenses
- **Spending Patterns** - Expense frequency and amount correlation

### 🎨 **Modern User Interface**
- **Responsive Design** - Optimized for desktop, tablet, and mobile
- **Dark/Light Themes** - Toggle with persistent user preference
- **Smooth Animations** - Micro-interactions and hover effects
- **Loading States** - Spinner and progressive loading indicators
- **Modern Typography** - Inter font for enhanced readability
- **Gradient Designs** - Beautiful color gradients throughout the interface
- **Notification System** - Toast notifications for user feedback

### 📤 **Data Export & Backup**
- **Comprehensive CSV Export** - All expense data with filtering support
- **Smart Filename Generation** - Date range and filter-based naming
- **Budget Integration** - Budget information included in monthly exports
- **Flexible Exports** - Custom date ranges, billing status, and category filtering
- **Data Totals** - Automatic calculation summaries in exports

### 🏗️ **Technical Features**
- **Progressive Web App** - Installable with offline capabilities
- **Real-time Updates** - Instant data synchronization
- **Error Handling** - Comprehensive error management with user feedback
- **Input Validation** - Client and server-side validation
- **Data Sanitization** - XSS protection and input cleaning
- **Performance Optimization** - Efficient queries and caching strategies

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL + Auth + Real-time subscriptions)
- **Charts**: Chart.js v3 for interactive data visualization
- **Styling**: Custom CSS with CSS Grid, Flexbox, and CSS Variables
- **Authentication**: Supabase Auth with email verification
- **Database**: PostgreSQL with Row Level Security (RLS)
- **PWA**: Web App Manifest for native app experience

## 📱 Installation & Setup

### Prerequisites
- Modern web browser with JavaScript enabled
- Supabase account for backend services

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/sdukesameer/myExpenseTracker.git
   cd myExpenseTracker
   ```

2. **Set up Supabase Backend**
   - Create a new project at [Supabase](https://supabase.com)
   - Run the SQL setup script (see Database Schema below)
   - Get your project URL and anon key from Settings > API

3. **Configure Environment Variables**
   ```javascript
   // Update in your HTML file or use environment variables
   const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL';
   const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
   ```

4. **Deploy**
   - Upload to your web server
   - Or use GitHub Pages, Netlify, Vercel for instant deployment

## 🗄️ Database Schema

### Complete Supabase Setup

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Expenses table
CREATE TABLE expenses (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0 AND amount <= 1000000),
    type TEXT NOT NULL,
    note TEXT,
    date DATE NOT NULL,
    billed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense Types table
CREATE TABLE expense_types (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- User Budgets table (Updated schema)
CREATE TABLE user_budgets (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_billed_budget DECIMAL(10,2) NOT NULL DEFAULT 0,
    monthly_unbilled_budget DECIMAL(10,2) NOT NULL DEFAULT 0,
    budget_month INTEGER NOT NULL CHECK (budget_month >= 1 AND budget_month <= 12),
    budget_year INTEGER NOT NULL CHECK (budget_year >= 2020),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, budget_month, budget_year)
);

-- User Profiles table
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    requires_password_reset BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_expenses_user_id_date ON expenses(user_id, date DESC);
CREATE INDEX idx_expenses_user_id_type ON expenses(user_id, type);
CREATE INDEX idx_expenses_user_id_billed ON expenses(user_id, billed);
CREATE INDEX idx_expense_types_user_id ON expense_types(user_id);
CREATE INDEX idx_user_budgets_user_month_year ON user_budgets(user_id, budget_year, budget_month);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Expenses policies
CREATE POLICY "Users can manage own expenses" ON expenses 
    FOR ALL USING (auth.uid() = user_id);

-- Expense types policies
CREATE POLICY "Users can manage own expense types" ON expense_types 
    FOR ALL USING (auth.uid() = user_id);

-- User budgets policies
CREATE POLICY "Users can manage own budgets" ON user_budgets 
    FOR ALL USING (auth.uid() = user_id);

-- User profiles policies
CREATE POLICY "Users can manage own profile" ON user_profiles 
    FOR ALL USING (auth.uid() = user_id);
```

### Default Data Insertion

```sql
-- Function to create default expense types for new users
CREATE OR REPLACE FUNCTION create_default_expense_types()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO expense_types (user_id, name)
    VALUES 
        (NEW.id, 'Food'),
        (NEW.id, 'Transportation'),
        (NEW.id, 'Entertainment'),
        (NEW.id, 'Utilities'),
        (NEW.id, 'Shopping'),
        (NEW.id, 'Healthcare'),
        (NEW.id, 'Education'),
        (NEW.id, 'Other');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create default types for new users
CREATE TRIGGER create_default_types_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_expense_types();
```

## 🎯 Usage Guide

### Getting Started
1. **Sign Up** - Create account with email verification
2. **Add First Expense** - Use the quick entry form
3. **Set Monthly Budget** - Configure billed/unbilled budgets
4. **Explore Analytics** - View charts and insights

### Adding Expenses
1. Enter amount (₹1 - ₹10,00,000)
2. Select or add expense category
3. Add descriptive note (required, max 500 chars)
4. Set date (defaults to today in IST)
5. Toggle billed/unbilled status
6. Click "Add Expense"

### Managing Categories
- **Add New**: Click "+" next to type dropdown
- **Delete Unused**: Click "Manage Types" → Delete
- **Edit Existing**: Click "Manage Types" → Edit
- **Auto-complete**: Type-ahead suggestions

### Budget Tracking
1. Click "Set Budget" in budget section
2. Set separate amounts for billed/unbilled
3. Monitor with visual progress bars
4. Receive alerts at 90% and 100%
5. View monthly budget history

### Analytics & Insights
1. Click "Analytics" button
2. Set date range and filters
3. Switch between chart types
4. Export data for external analysis
5. View spending insights and trends

### Advanced Features
- **Search**: Use global search for quick expense lookup
- **Bulk Edit**: Edit multiple expenses and save together
- **Theme Toggle**: Switch between light/dark modes
- **Profile**: Update name, email, and password
- **Export**: Download filtered data with budget info

## 🚀 Deployment Options

### GitHub Pages
1. Enable Pages in repository settings
2. Select source branch (main/gh-pages)
3. Access via username.github.io/repository-name

### Netlify
1. Connect GitHub repository
2. Build command: (none - static site)
3. Publish directory: `/` (root)
4. Configure environment variables

### Vercel
1. Import project from GitHub
2. Configure build settings
3. Add environment variables
4. Deploy automatically on push

### Custom Server
1. Upload files to web server
2. Ensure HTTPS for PWA features
3. Configure proper MIME types
4. Enable gzip compression

## 🔧 Configuration

### Environment Variables
```javascript
// Required Supabase configuration
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';

// Optional configurations
const isDarkMode = localStorage.getItem('darkMode') === 'true';
```

### PWA Configuration
Update `manifest.json` with your app details:
```json
{
  "name": "My Expense Tracker",
  "short_name": "ExpenseTracker",
  "description": "Track your expenses efficiently",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#667eea",
  "background_color": "#ffffff"
}
```

## 📊 Features in Detail

### Chart Types & Analytics
- **Pie Chart**: Category distribution overview
- **Doughnut Chart**: Enhanced category visualization with center text
- **Line Chart**: Cumulative expense trends with gradient fill
- **Bar Chart**: Vertical category comparison
- **Horizontal Bar**: Alternative category layout
- **Bubble Chart**: Amount vs frequency correlation analysis

### Budget Management
- **Independent Tracking**: Separate budgets for billed/unbilled expenses
- **Visual Feedback**: Color-coded progress bars (green → orange → red)
- **Smart Notifications**: Alerts at 90% usage and budget exceeded
- **Historical Data**: Month-by-month budget tracking
- **Export Integration**: Budget summaries in CSV exports

### Search Capabilities
- **Real-time Search**: Instant results as you type
- **Multi-field**: Search notes, categories, amounts, dates
- **Flexible Matching**: Partial matches and case-insensitive
- **Result Summaries**: Total count and amount calculations

### Data Export Features
- **Smart Naming**: Automatic filename based on filters
- **Comprehensive Data**: All expense fields with proper formatting
- **Budget Integration**: Monthly budget information included
- **Flexible Filtering**: Date range, billing status, category filters
- **Summary Calculations**: Totals and remaining budgets

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes following code style
4. Test thoroughly on multiple devices
5. Submit pull request with detailed description

### Development Guidelines
- **Code Style**: Follow existing patterns and naming conventions
- **Comments**: Add meaningful comments for complex logic
- **Testing**: Test on different browsers and screen sizes
- **Documentation**: Update README for new features
- **Performance**: Consider impact on load times and responsiveness

### Code Structure
```
├── index.html          # Main HTML file
├── styles.css          # CSS styles and themes
├── script.js           # Core JavaScript functionality
├── manifest.json       # PWA configuration
├── icons/             # App icons for PWA
└── README.md          # Documentation
```

## 🐛 Troubleshooting

### Common Issues
1. **Login Problems**: Check Supabase URL and keys
2. **Chart Not Loading**: Verify Chart.js CDN link
3. **Date Issues**: Ensure proper timezone handling (IST)
4. **Export Problems**: Check browser compatibility for downloads
5. **PWA Not Installing**: Requires HTTPS and manifest.json

### Browser Compatibility
- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support (iOS 12+)
- **Edge**: Full support
- **Mobile**: Optimized for all modern mobile browsers

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend as a Service
- [Chart.js](https://www.chartjs.org) - Beautiful charts
- [Inter Font](https://rsms.me/inter) - Modern typography
- JavaScript community for inspiration and best practices

## 📞 Support & Contact

- 🐛 [Report Issues](https://github.com/sdukesameer/myExpenseTracker/issues)
- 💡 [Feature Requests](https://github.com/sdukesameer/myExpenseTracker/issues/new)
- 📧 [Email Developer](mailto:sdukesameer@gmail.com)
- 💼 [LinkedIn Profile](https://www.linkedin.com/in/sdukesameer)

## 🌟 Show Your Support

Give a ⭐ if this project helped you manage your expenses better!

**Share with friends and colleagues who need better expense tracking!**

---

**Made with ❤️ by [MD SAMEER](https://www.linkedin.com/in/sdukesameer)**

*"Take control of your finances with intelligent expense tracking"*
