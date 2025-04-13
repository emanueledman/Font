:root {
    --orange: #ff6f47;
    --red: #ff4d4f;
    --green: #52c41a;
    --blue: #1890ff;
    --purple: #722ed1;
    --teal: #13c2c2;
    --gray-50: #fafafa;
    --gray-100: #f4f4f5;
    --gray-200: #e4e4e7;
    --gray-400: #a1a1aa;
    --gray-800: #27272a;
    --white: #ffffff;
    --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
    background-color: var(--gray-50);
    color: var(--gray-800);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
}

/* Layout */
.main-content {
    min-height: 100vh;
    transition: margin-left 0.3s ease;
    padding-bottom: 60px; /* Espaço para nav-mobile */
}

.main-content.full {
    margin-left: 0;
}

/* Login Page */
.login-wrapper {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gray-50);
    padding: 1.5rem;
}

.login-container {
    width: 100%;
    max-width: 420px;
    background: var(--white);
    border-radius: 12px;
    padding: 2rem;
    box-shadow: var(--shadow-md);
}

.login-header {
    text-align: center;
    margin-bottom: 2rem;
}

.login-logo {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--blue);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.login-title {
    font-size: 1.5rem;
    font-weight: 500;
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-800);
    margin-bottom: 0.5rem;
    display: block;
}

.form-control {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--gray-200);
    border-radius: 8px;
    font-size: 0.9375rem;
    transition: border-color 0.2s;
}

.form-control:focus {
    border-color: var(--blue);
    outline: none;
}

.form-error {
    color: var(--red);
    font-size: 0.75rem;
    margin-top: 0.25rem;
}

.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.9375rem;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    gap: 0.5rem;
}

.btn-primary {
    background: var(--blue);
    color: var(--white);
}

.btn-primary:hover {
    background: #40a9ff;
}

.btn-block {
    width: 100%;
}

/* Sidebar */
.sidebar {
    background: var(--white);
    width: 72px;
    transition: width 0.3s ease;
    border-right: 1px solid var(--gray-200);
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    z-index: 1000;
}

.sidebar.active {
    width: 240px;
}

.logo {
    padding: 1.5rem 1rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--blue);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-bottom: 1px solid var(--gray-200);
}

.logo i {
    font-size: 1.5rem;
}

.menu {
    list-style: none;
    padding: 1rem 0;
    flex-grow: 1;
}

.menu li {
    margin: 0.5rem 0;
}

.menu a {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    color: var(--gray-800);
    text-decoration: none;
    border-radius: 8px;
    margin: 0 0.5rem;
    transition: all 0.2s ease;
}

.menu a:hover {
    background: var(--gray-100);
}

.menu a.active {
    background: var(--blue);
    color: var(--white);
}

.menu a i {
    font-size: 1.25rem;
    width: 24px;
    text-align: center;
}

.menu a.active i {
    color: var(--white);
}

.menu a span {
    opacity: 0;
    transition: opacity 0.2s;
}

.sidebar.active .menu a span {
    opacity: 1;
}

/* Header */
.header {
    background: var(--white);
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 12px;
    box-shadow: var(--shadow-sm);
    margin-bottom: 1.5rem;
}

.menu-toggle {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--gray-800);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 8px;
    transition: background 0.2s;
}

.menu-toggle:hover {
    background: var(--gray-100);
}

.menu-toggle:focus {
    outline: 2px solid var(--blue);
}

#section-title {
    font-size: 1.5rem;
    font-weight: 500;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.875rem;
}

#logout-btn {
    background: var(--red);
    color: var(--white);
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
}

#logout-btn:hover {
    background: #ff7875;
}

/* Login Section */
.login-section {
    background: var(--white);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: var(--shadow-sm);
    max-width: 420px;
    margin: 0 auto 1.5rem;
}

.login-section h2 {
    font-size: 1.5rem;
    font-weight: 500;
    margin-bottom: 1.5rem;
}

.login-section .form-group input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--gray-200);
    border-radius: 8px;
    font-size: 0.9375rem;
}

.login-section .form-group input:focus {
    border-color: var(--blue);
    outline: none;
}

.login-section button {
    width: 100%;
    padding: 0.75rem;
    background: var(--blue);
    color: var(--white);
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
}

.login-section button:hover {
    background: #40a9ff;
}

.error {
    color: var(--red);
    font-size: 0.875rem;
    margin-top: 0.5rem;
    text-align: center;
}

/* Content Sections */
.content-section {
    display: none;
    background: var(--white);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: var(--shadow-sm);
    margin-bottom: 1.5rem;
}

.content-section.active {
    display: block;
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.section-header h2 {
    font-size: 1.25rem;
    font-weight: 500;
}

.controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.controls input {
    padding: 0.75rem 1rem;
    border: 1px solid var(--gray-200);
    border-radius: 8px;
    font-size: 0.9375rem;
    min-width: 200px;
}

.controls input:focus {
    border-color: var(--blue);
    outline: none;
}

.controls button {
    padding: 0.75rem 1.5rem;
    background: var(--blue);
    color: var(--white);
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.controls button:hover {
    background: #40a9ff;
}

/* Dashboard Grid */
.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
}

.dashboard-card {
    border-radius: 12px;
    padding: 1rem;
    box-shadow: var(--shadow-sm);
    color: var(--white);
    text-align: center;
}

.dashboard-card.card-orange {
    background: var(--orange);
}

.dashboard-card.card-red {
    background: var(--red);
}

.dashboard-card.card-green {
    background: var(--green);
}

.dashboard-card.card-purple {
    background: var(--purple);
}

.dashboard-card h3 {
    font-size: 0.875rem;
    font-weight: 400;
    margin-bottom: 0.5rem;
}

.dashboard-card p {
    font-size: 1.5rem;
    font-weight: 700;
}

/* Tables */
.table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.9375rem;
    background: var(--white);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
}

.table th,
.table td {
    padding: 1rem;
    text-align: left;
}

.table th {
    background: var(--gray-50);
    font-weight: 500;
    color: var(--gray-800);
}

.table td {
    border-top: 1px solid var(--gray-100);
}

.table tbody tr:hover {
    background: var(--gray-100);
}

/* Badges */
.badge {
    display: inline-flex;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--white);
}

.badge.open {
    background: var(--green);
}

.badge.full {
    background: var(--red);
}

/* Table Action Buttons */
.table button {
    background: var(--blue);
    color: var(--white);
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.table button:hover {
    background: #40a9ff;
}

/* Chart Container */
.chart-container {
    width: 100%;
    height: 320px;
    background: var(--white);
    border-radius: 12px;
    padding: 1rem;
    box-shadow: var(--shadow-sm);
}

/* Loader */
.loader {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    display: none;
}

.loader.active {
    display: flex;
}

.spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--gray-200);
    border-top-color: var(--blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* DataTables Overrides */
.dataTable {
    margin: 0 !important;
}

.dataTable thead th {
    border-bottom: none;
}

.dataTable tbody td {
    border-top: none;
}

/* Mobile Navigation */
.nav-mobile {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background: var(--white);
    border-top: 1px solid var(--gray-200);
    padding: 0.5rem 0;
    z-index: 1000;
    display: flex;
    justify-content: space-around;
}

.nav-mobile a {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    color: var(--gray-400);
    text-decoration: none;
    font-size: 0.75rem;
}

.nav-mobile a.active {
    color: var(--blue);
}

.nav-mobile a i {
    font-size: 1.25rem;
    margin-bottom: 0.25rem;
}

/* Responsive */
@media (max-width: 991px) {
    .sidebar {
        left: -72px;
    }

    .sidebar.active {
        left: 0;
        width: 240px;
    }

    .main-content {
        margin-left: 0;
    }

    .main-content.full {
        margin-left: 0;
    }

    .sidebar {
        display: none;
    }

    .nav-mobile {
        display: flex;
    }

    .header .menu-toggle {
        display: none;
    }
}

@media (max-width: 767px) {
    .dashboard-grid {
        grid-template-columns: 1fr;
    }

    .section-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .controls {
        width: 100%;
    }

    .controls input {
        width: 100%;
        min-width: 0;
    }
}