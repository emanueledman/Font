import { Link } from 'react-router-dom';

function Sidebar({ onLogout }) {
    return (
        <div className="sidebar">
            <div className="text-center mb-4">
                <img src="/logo.png" alt="Logo" width="100" />
            </div>
            <Link to="/dashboard" className="nav-link"><i className="bi bi-house"></i> Dashboard</Link>
            <Link to="/queues" className="nav-link"><i className="bi bi-list-task"></i> Filas</Link>
            <Link to="/call" className="nav-link"><i className="bi bi-megaphone"></i> Chamada</Link>
            <Link to="/reports" className="nav-link"><i className="bi bi-bar-chart"></i> Relatórios</Link>
            <Link to="/users" className="nav-link"><i className="bi bi-people"></i> Usuários</Link>
            <Link to="/settings" className="nav-link"><i className="bi bi-gear"></i> Configurações</Link>
            <Link to="/profile" className="nav-link"><i className="bi bi-person"></i> Perfil</Link>
            <a href="#" onClick={onLogout} className="nav-link"><i className="bi bi-box-arrow-right"></i> Sair</a>
        </div>
    );
}

export default Sidebar;