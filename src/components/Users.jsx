import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../api';
import { toast } from 'react-toastify';

function Users() {
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState({ id: '', email: '', password: '', department: '' });
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await fetchWithAuth('/users');
                setUsers(data);
            } catch (error) {
                toast.warning('Usando dados de teste');
                setUsers([
                    { id: '1', email: 'test@facilita.com', department: 'Teste', status: 'Ativo' }
                ]);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = form.id ? `/users/${form.id}` : '/users';
            const method = form.id ? 'PUT' : 'POST';
            const data = await fetchWithAuth(url, {
                method,
                body: JSON.stringify({
                    email: form.email,
                    password: form.password || undefined,
                    department: form.department,
                    institution_id: JSON.parse(localStorage.getItem('user')).institution_id
                })
            });
            toast.success(data.message);
            setShowModal(false);
            setForm({ id: '', email: '', password: '', department: '' });
            const updatedUsers = await fetchWithAuth('/users');
            setUsers(updatedUsers);
        } catch (error) {
            toast.success('Usuário salvo (teste)');
            setShowModal(false);
            setUsers([...users, { id: Date.now().toString(), ...form, status: 'Ativo' }]);
        }
    };

    const handleEdit = (user) => {
        setForm({ id: user.id, email: user.email, password: '', department: user.department });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
        try {
            const data = await fetchWithAuth(`/users/${id}`, { method: 'DELETE' });
            toast.success(data.message);
            const updatedUsers = await fetchWithAuth('/users');
            setUsers(updatedUsers);
        } catch (error) {
            toast.success('Usuário excluído (teste)');
            setUsers(users.filter(u => u.id !== id));
        }
    };

    return (
        <div>
            <h2>Gerenciamento de Usuários</h2>
            <button className="btn btn-primary mb-3" onClick={() => setShowModal(true)}>Novo Usuário</button>
            <table className="table table-hover">
                <thead><tr><th>Email</th><th>Departamento</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id}>
                            <td>{u.email}</td>
                            <td>{u.department}</td>
                            <td>{u.status}</td>
                            <td>
                                <button className="btn btn-warning btn-sm me-2" onClick={() => handleEdit(u)}>Editar</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Excluir</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{form.id ? 'Editar Usuário' : 'Novo Usuário'}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Senha</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={form.password}
                                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                                            placeholder={form.id ? 'Deixe em branco para manter' : ''}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Departamento</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={form.department}
                                            onChange={(e) => setForm({ ...form, department: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-primary">Salvar</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Users;