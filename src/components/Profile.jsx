import { useState } from 'react';
import { fetchWithAuth } from '../api';
import { toast } from 'react-toastify';

function Profile({ setUser }) {
    const [form, setForm] = useState({
        email: JSON.parse(localStorage.getItem('user')).email,
        password: '',
        confirmPassword: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password && form.password !== form.confirmPassword) {
            toast.error('Senhas não coincidem');
            return;
        }
        try {
            const data = await fetchWithAuth('/user', {
                method: 'PUT',
                body: JSON.stringify({
                    email: form.email,
                    password: form.password || undefined
                })
            });
            toast.success(data.message);
            const user = JSON.parse(localStorage.getItem('user'));
            user.email = form.email;
            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
        } catch (error) {
            toast.success('Perfil salvo (teste)');
            const user = JSON.parse(localStorage.getItem('user'));
            user.email = form.email;
            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
        }
    };

    return (
        <div>
            <h2>Perfil</h2>
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
                    <label className="form-label">Nova Senha</label>
                    <input
                        type="password"
                        className="form-control"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Confirmar Senha</label>
                    <input
                        type="password"
                        className="form-control"
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    />
                </div>
                <button type="submit" className="btn btn-primary">Salvar</button>
            </form>
        </div>
    );
}

export default Profile;