# 💰 Personal Expense Tracker

A modern, responsive web application for tracking personal expenses with advanced analytics, budget management, and secure cloud synchronization.

## ✨ Features

### 🔐 Authentication & Security
- **Secure User Authentication** - Email/password login with Supabase Auth
- **Password Reset** - Forgot password functionality
- **Session Management** - Automatic login/logout with secure sessions
- **Data Privacy** - User-specific data isolation and encryption

### 💳 Expense Management
- **Quick Expense Entry** - Add expenses with amount, type, date, and notes
- **Custom Categories** - Create and manage personalized expense types
- **Billing Status** - Track reimbursable vs personal expenses
- **Date Display** - Beautiful date formatting (e.g., "Wednesday, 20th July 2025")
- **Expense History** - View, search, and delete expense records
- **Edit Mode** - Toggle billing status directly from analytics view

### 📊 Analytics & Visualization
- **Interactive Charts** - Pie, bar, line, and doughnut charts
- **Date Range Filtering** - Analyze expenses for specific periods
- **Billing Status Filters** - View billed vs unbilled expenses
- **Real-time Statistics** - Monthly totals, expense counts, and summaries
- **Data Export** - Export filtered data to CSV format
- **Inline Editing** - Edit expense billing status from analytics view

### 💰 Budget Management
- **Monthly Budget Setting** - Set and track monthly spending limits
- **Visual Progress Bar** - See budget utilization at a glance
- **Smart Alerts** - Warnings when approaching or exceeding budget
- **Remaining Balance** - Real-time calculation of remaining budget
- **Cloud Sync** - Budget data synchronized across devices

### 🎨 User Experience
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Dark/Light Theme** - Toggle between themes with persistent preference
- **Modern UI** - Beautiful gradients, animations, and smooth transitions
- **Offline Ready** - Service worker for basic offline functionality
- **Fast Performance** - Optimized loading and smooth interactions

### ☁️ Cloud Features
- **Real-time Sync** - Data synchronized across all devices
- **Backup & Security** - Automatic cloud backup with Supabase
- **Multi-device Access** - Access your data from anywhere
- **Data Persistence** - Never lose your expense data

## 🚀 Live Demo

**[View Live Application](https://myexpensetracker-sameer.netlify.app/)**

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Charts**: Chart.js
- **Deployment**: Netlify
- **Styling**: Custom CSS with modern design principles

## 🏗️ Installation & Setup

### Prerequisites
- Modern web browser
- Internet connection for cloud features

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/sdukesameer/myExpenseTracker.git
   cd myExpenseTracker
   ```

2. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start local server**
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

4. **Open in browser**
   Navigate to `http://localhost:8000`

### Supabase Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Create required tables**:

   ```sql
   -- Expenses table
   CREATE TABLE expenses (
     id SERIAL PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     amount DECIMAL(10,2) NOT NULL,
     type VARCHAR(100) NOT NULL,
     note TEXT,
     date DATE NOT NULL,
     billed BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Expense types table
   CREATE TABLE expense_types (
     id SERIAL PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     name VARCHAR(100) NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     UNIQUE(user_id, name)
   );

   -- User budgets table
   CREATE TABLE user_budgets (
     id SERIAL PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
     monthly_budget DECIMAL(10,2) NOT NULL DEFAULT 0,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **Set up Row Level Security (RLS)**:
   ```sql
   -- Enable RLS
   ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
   ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;
   ALTER TABLE user_budgets ENABLE ROW LEVEL SECURITY;

   -- Create policies
   CREATE POLICY "Users can manage their own expenses" ON expenses
     FOR ALL USING (auth.uid() = user_id);

   CREATE POLICY "Users can manage their own types" ON expense_types
     FOR ALL USING (auth.uid() = user_id);

   CREATE POLICY "Users can manage their own budget" ON user_budgets
     FOR ALL USING (auth.uid() = user_id);
   ```

## 🚀 Deployment

### Netlify Deployment

1. **Fork this repository** on GitHub
2. **Connect your repository** to Netlify
3. **Set environment variables** in Netlify dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Deploy** - Netlify will automatically build and deploy using `netlify.toml`

### Manual Deployment

1. **Update environment variables** in `index.html` (replace placeholders)
2. **Upload files** to your web server
3. **Configure HTTPS** for security

## 📖 Usage Guide

### Getting Started
1. **Sign up** for a new account or **sign in** with existing credentials
2. **Set your monthly budget** using the "Set Budget" button
3. **Add expense types** that match your spending categories
4. **Start tracking expenses** with the expense form

### Adding Expenses
1. Fill in the expense details (amount, type, note, date)
2. Check "billed" if the expense will be reimbursed
3. Click "Add Expense" to save

### Viewing Analytics
1. Click "📊 Analytics" to open the analytics modal
2. Set date ranges and filters
3. Switch between chart types (pie, bar, line, doughnut)
4. Edit billing status inline by clicking the pencil icon
5. Export data to CSV for external analysis

### Budget Management
1. Set your monthly budget amount
2. Monitor the progress bar and remaining balance
3. Receive alerts when approaching limits

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Style
- Use modern JavaScript (ES6+)
- Follow existing code formatting
- Add comments for complex logic
- Test thoroughly before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Q: Can't sign in or sign up?**
A: Check your internet connection and ensure Supabase credentials are correct.

**Q: Data not syncing?**
A: Verify you're signed in and have an active internet connection.

**Q: Charts not displaying?**
A: Ensure you have expense data and try refreshing the page.

**Q: Budget not saving?**
A: Make sure you're logged in and the budget amount is valid.

### Getting Help
- 📧 **Email**: [sdukesameer@gmail.com](mailto:sdukesameer@gmail.com)
- 🐛 **Issues**: [GitHub Issues](https://github.com/sdukesameer/myExpenseTracker/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/sdukesameer/myExpenseTracker/discussions)

## 🎯 Roadmap

- [ ] **Mobile App** - React Native version
- [ ] **Receipt Scanning** - OCR integration for automatic expense entry
- [ ] **Recurring Expenses** - Automatic expense creation for subscriptions
- [ ] **Advanced Categories** - Nested categories and detailed insights
- [ ] **Export Options** - PDF reports and Excel export
- [ ] **Multi-currency** - Support for different currencies
- [ ] **Shared Budgets** - Family/team expense tracking
- [ ] **Expense Splitting** - Split expenses among multiple people
- [ ] **Bank Integration** - Automatic transaction import
- [ ] **AI Insights** - Smart spending analysis and recommendations

## 🙏 Acknowledgments

- **Supabase** - For excellent backend-as-a-service
- **Chart.js** - For beautiful and responsive charts
- **Netlify** - For seamless deployment and hosting
- **Contributors** - Thanks to all who help improve this project

## 📊 Project Stats

- **⭐ Stars**: Give this project a star if you find it helpful!
- **🍴 Forks**: Fork to contribute or customize for your needs
- **🐛 Issues**: Report bugs or request features
- **📈 Version**: 1.0.0 - Initial Release

---

**⭐ Star this repository if you find it helpful!**

Made with ❤️ by [MD SAMEER](https://github.com/sdukesameer)

## 🔗 Links

- [Live Demo](https://myexpensetracker-sameer.netlify.app/)
- [GitHub Repository](https://github.com/sdukesameer/myExpenseTracker)
- [Supabase](https://supabase.com)
- [Netlify](https://netlify.com)
