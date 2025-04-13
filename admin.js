/* styles.css */
:root {
    --primary-gradient: linear-gradient(135deg, #4B0082, #00D4FF);
    --secondary-gradient: linear-gradient(135deg, #FF007A, #FFD700);
    --bg-dark: #1E1E2F;
    --bg-light: #F5F7FA;
    --glass-bg: rgba(255, 255, 255, 0.1);
    --glass-border: rgba(255, 255, 255, 0.2);
    --text-primary: #E0E0E0;
    --text-secondary: #A0A0A0;
    --accent-neon: #FF007A;
    --shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    --transition: all 0.3s ease-in-out;
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Inter', 'Poppins', sans-serif;
  }
  
  body {
    background: var(--bg-dark);
    color: var(--text-primary);
    overflow-x: hidden;
  }
  
  /* Admin Panel Layout */
  .admin-panel {
    display: flex;
    min-height: 100vh;
  }
  
  /* Sidebar */
  .sidebar {
    width: 300px;
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border-right: 1px solid var(--glass-border);
    padding: 20px;
    position: fixed;
    height: 100vh;
    transition: width 0.5s ease;
    z-index: 1000;
  }
  
  .sidebar.collapsed {
    width: 80px;
  }
  
  .sidebar-toggle {
    position: absolute;
    top: 20px;
    right: -15px;
    background: var(--primary-gradient);
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    cursor: pointer;
    color: white;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .brand {
    display: flex;
    align-items: center;
    margin-bottom: 40px;
  }
  
  .brand-logo {
    width: 40px;
    height: 40px;
    background: var(--primary-gradient);
    border-radius: 10px;
    margin-right: 10px;
    animation: pulse 2s infinite;
  }
  
  .brand h2 {
    font-size: 1.5rem;
    font-weight: 600;
    display: inline-block;
  }
  
  .brand h2 span {
    display: block;
    font-size: 0.9rem;
    color: var(--text-secondary);
    opacity: 0;
    transition: var(--transition);
  }
  
  .brand:hover h2 span {
    opacity: 1;
  }
  
  .user-info {
    display: flex;
    align-items: center;
    margin-bottom: 30px;
    position: relative;
  }
  
  .avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--primary-gradient);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 15px;
    position: relative;
    overflow: hidden;
  }
  
  .avatar::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, transparent 60%, var(--accent-neon) 70%);
    opacity: 0.5;
  }
  
  .avatar i {
    font-size: 1.8rem;
    color: white;
  }
  
  .user-details h3 {
    font-size: 1.1rem;
    font-weight: 500;
  }
  
  .user-details p {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }
  
  .sidebar nav a {
    display: flex;
    align-items: center;
    padding: 15px;
    color: var(--text-primary);
    text-decoration: none;
    margin: 5px 0;
    border-radius: 8px;
    transition: var(--transition);
    position: relative;
    overflow: hidden;
  }
  
  .sidebar nav a i {
    font-size: 1.2rem;
    margin-right: 15px;
    width: 20px;
    text-align: center;
  }
  
  .sidebar nav a span {
    font-size: 1rem;
  }
  
  .sidebar nav a:hover {
    background: var(--glass-bg);
    transform: translateX(5px);
  }
  
  .sidebar nav a.active {
    background: var(--primary-gradient);
    box-shadow: var(--shadow);
  }
  
  .sidebar nav a.active::after {
    content: '';
    position: absolute;
    right: 0;
    width: 4px;
    height: 100%;
    background: var(--accent-neon);
  }
  
  .sidebar.collapsed nav a span {
    display: none;
  }
  
  .sidebar.collapsed .brand h2,
  .sidebar.collapsed .user-details {
    display: none;
  }
  
  /* Main Content */
  .main-content {
    flex-grow: 1;
    margin-left: 300px;
    padding: 20px;
    transition: margin-left 0.5s ease;
  }
  
  .main-content.collapsed {
    margin Valentino: 80px;
  }
  
  header {
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    padding: 15px 30px;
    border-radius: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 20px;
    z-index: 100;
    margin-bottom: 20px;
  }
  
  header h1 {
    font-size: 1.8rem;
    font-weight: 600;
    background: var(--primary-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  
  .search-bar {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 8px 15px;
    display: flex;
    align-items: center;
  }
  
  .search-bar input {
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 0.9rem;
    outline: none;
  }
  
  .search-bar i {
    color: var(--text-secondary);
    margin-right: 10px;
  }
  
  .notification-bell {
    position: relative;
    cursor: pointer;
  }
  
  .notification-bell i {
    font-size: 1.2rem;
  }
  
  .notification-bell::after {
    content: '3';
    position: absolute;
    top: -5px;
    right: -5px;
    background: var(--accent-neon);
    color: white;
    font-size: 0.7rem;
    padding: 2px 5px;
    border-radius: 50%;
  }
  
  /* Sections */
  .section {
    display: none;
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
  }
  
  .section.active {
    display: block;
    animation: fadeIn 0.5s ease;
  }
  
  /* Stats Cards */
  .stats-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
  }
  
  .stat-card {
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    transition: var(--transition);
    transform: perspective(1000px);
  }
  
  .stat-card:hover {
    transform: perspective(1000px) translateZ(20px);
    box-shadow: var(--shadow);
  }
  
  .stat-icon {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: var(--primary-gradient);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 15px;
  }
  
  .stat-icon i {
    font-size: 1.5rem;
    color: white;
  }
  
  .stat-info h3 {
    font-size: 2rem;
    font-weight: 600;
  }
  
  .stat-info p {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
  
  /* Tables */
  .table-container {
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border-radius: 12px;
    padding: 20px;
    overflow-x: auto;
  }
  
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }
  
  table th, table td {
    padding: 15px;
    text-align: left;
  }
  
  table th {
    background: var(--glass-bg);
    font-weight: 600;
    color: var(--text-primary);
    position: sticky;
    top: 0;
  }
  
  table td {
    border-bottom: 1px solid var(--glass-border);
  }
  
  table tr {
    transition: var(--transition);
  }
  
  table tr:hover {
    background: var(--glass-bg);
    transform: scale(1.01);
  }
  
  /* Buttons */
  .btn {
    padding: 10px 20px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition);
    border: none;
    background: var(--primary-gradient);
    color: white;
  }
  
  .btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow);
  }
  
  /* Forms */
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-group label {
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 8px;
    display: block;
  }
  
  .form-group input,
  .form-group select {
    width: 100%;
    padding: 12px;
    border: none;
    background: var(--glass-bg);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 1rem;
    transition: var(--transition);
  }
  
  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--accent-neon);
  }
  
  /* Animations */
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  /* Responsive */
  @media (max-width: 992px) {
    .sidebar {
      width: 80px;
    }
  
    .sidebar .brand h2,
    .sidebar .user-details,
    .sidebar nav a span {
      display: none;
    }
  
    .main-content {
      margin-left: 80px;
    }
  }
  
  @media (max-width: 768px) {
    .stats-container {
      grid-template-columns: 1fr;
    }
  }