/* styles.css */
:root {
    --primary: #3b82f6;
    --primary-dark: #1d4ed8;
    --secondary: #64748b;
    --success: #22c55e;
    --warning: #f59e0b;
    --danger: #ef4444;
    --info: #06b6d4;
    --light: #f9fafb;
    --dark: #1f2937;
    --sidebar-bg: #111827;
    --card-bg: #ffffff;
    --border: #e5e7eb;
    --text: #111827;
    --text-light: #6b7280;
    --shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
    --radius: 10px;
    --transition: 0.25s ease;
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  
  body {
    background: var(--light);
    color: var(--text);
    font-size: 16px;
  }
  
  /* Layout */
  .admin-panel {
    display: flex;
    min-height: 100vh;
  }
  
  /* Sidebar */
  .sidebar {
    width: 280px;
    background: var(--sidebar-bg);
    color: white;
    padding: 24px 16px;
    position: fixed;
    height: 100vh;
    overflow-y: auto;
    transition: var(--transition);
  }
  
  .sidebar-toggle {
    display: none;
    background: var(--primary);
    border: none;
    color: white;
    padding: 8px;
    border-radius: 50%;
    cursor: pointer;
    position: absolute;
    right: -16px;
    top: 24px;
  }
  
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 32px;
  }
  
  .brand i {
    font-size: 1.75rem;
    color: var(--primary);
  }
  
  .brand h2 {
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius);
    margin-bottom: 32px;
  }
  
  .avatar {
    width: 48px;
    height: 48px;
    background: var(--primary);
    border-radius: 50%;
    display: grid;
    place-items: center;
  }
  
  .avatar i {
    font-size: 1.5rem;
    color: white;
  }
  
  .user-details h3 {
    font-size: 1rem;
    font-weight: 500;
  }
  
  .user-details p {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
  }
  
  nav a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    border-radius: 8px;
    margin-bottom: 4px;
    transition: var(--transition);
  }
  
  nav a i {
    font-size: 1.25rem;
    width: 24px;
    text-align: center;
  }
  
  nav a:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
  
  nav a.active {
    background: var(--primary);
    color: white;
  }
  
  nav a.logout {
    color: var(--danger);
    margin-top: auto;
  }
  
  /* Main Content */
  .main-content {
    flex: 1;
    margin-left: 280px;
    padding: 24px;
  }
  
  header {
    background: var(--card-bg);
    padding: 16px 24px;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 24px;
    z-index: 10;
    margin-bottom: 24px;
  }
  
  header h1 {
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .date-time {
    font-size: 0.875rem;
    color: var(--text-light);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .search-bar {
    background: var(--light);
    padding: 8px 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .search-bar input {
    background: none;
    border: none;
    font-size: 0.875rem;
    color: var(--text);
    outline: none;
  }
  
  /* Sections */
  .section {
    display: none;
  }
  
  .section.active {
    display: block;
  }
  
  /* Stats */
  .stats-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 24px;
    margin-bottom: 32px;
  }
  
  .stat-card {
    background: var(--card-bg);
    border-radius: var(--radius);
    padding: 24px;
    box-shadow: var(--shadow);
    display: flex;
    align-items: center;
    gap: 16px;
    transition: var(--transition);
  }
  
  .stat-card:hover {
    transform: translateY(-4px);
  }
  
  .stat-icon {
    width: 56px;
    height: 56px;
    background: var(--primary);
    border-radius: 12px;
    display: grid;
    place-items: center;
  }
  
  .stat-icon i {
    font-size: 1.75rem;
    color: white;
  }
  
  .stat-info h3 {
    font-size: 1.75rem;
    font-weight: 600;
  }
  
  .stat-info p {
    font-size: 0.875rem;
    color: var(--text-light);
  }
  
  /* Tables */
  .table-container {
    background: var(--card-bg);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 24px;
    margin-bottom: 32px;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th, td {
    padding: 16px;
    text-align: left;
  }
  
  th {
    background: var(--light);
    font-weight: 600;
    font-size: 0.875rem;
  }
  
  td {
    border-top: 1px solid var(--border);
    font-size: 0.875rem;
  }
  
  tr:hover {
    background: var(--light);
  }
  
  .status {
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .status-pendente { background: var(--warning); color: white; }
  .status-chamado { background: var(--primary); color: white; }
  .status-atendido { background: var(--success); color: white; }
  .status-cancelado { background: var(--danger); color: white; }
  
  /* Buttons */
  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition);
  }
  
  .btn-primary {
    background: var(--primary);
    color: white;
  }
  
  .btn-primary:hover {
    background: var(--primary-dark);
  }
  
  .btn-secondary {
    background: var(--secondary);
    color: white;
  }
  
  .btn-secondary:hover {
    background: var(--text-light);
  }
  
  /* Forms */
  .form-group {
    margin-bottom: 24px;
  }
  
  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 8px;
  }
  
  .form-group input,
  .form-group select {
    width: 100%;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.875rem;
  }
  
  .form-group input:focus,
  .form-group select:focus {
    border-color: var(--primary);
    outline: none;
  }
  
  /* Reports */
  .report-container {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 32px;
  }
  
  .report-filters {
    background: var(--card-bg);
    padding: 24px;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }
  
  .report-chart {
    background: var(--card-bg);
    padding: 24px;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    height: 400px;
  }
  
  /* Responsive */
  @media (max-width: 1024px) {
    .sidebar {
      width: 80px;
      padding: 16px;
    }
  
    .sidebar .brand h2,
    .sidebar .user-details,
    .sidebar nav a span {
      display: none;
    }
  
    .sidebar nav a {
      justify-content: center;
      padding: 12px;
    }
  
    .sidebar-toggle {
      display: block;
    }
  
    .main-content {
      margin-left: 80px;
    }
  }
  
  @media (max-width: 768px) {
    .stats-container {
      grid-template-columns: 1fr;
    }
  
    .report-container {
      grid-template-columns: 1fr;
    }
  
    .report-chart {
      height: 300px;
    }
  }