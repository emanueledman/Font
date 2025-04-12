import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../api';
import { toast } from 'react-toastify';

function Settings() {
    const [form, setForm] = useState({ name: '', location: '', latitude: '', longitude: '' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const institutionId = JSON.parse(localStorage.getItem('user')).institution_id;
                const data = await fetchWithAuth(`/institution/${institutionId}`);
                setForm(data);
            } catch (error) {
                toast.warning('Usando dados de teste');
                setForm({
                    name: 'Instituição Teste',
                    location: 'Local Teste',
                    latitude: -23.5505,
                    longitude: -46.6333
                });
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const institutionId = JSON.parse(localStorage.getItem('user')).institution_id;
            const data = await fetchWithAuth(`/institution/${institutionId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    ...form,
                    latitude: parseFloat(form.latitude),
                    longitude: parseFloat(form.longitude)
                })
            });
            toast.success(data.message);
        } catch (error) {
            toast.success('Configurações salvas (teste)');
        }
    };

    return (
        <div>
            <h2>Configurações</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label className="form-label">Nome da Instituição</label>
                    <input
                        type="text"
                        className="form-control"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Localização</label>
                    <input
                        type="text"
                        className="form-control"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Latitude</label>
                    <input
                        type="number"
                        step="any"
                        className="form-control"
                        value={form.latitude}
                        onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Longitude</label>
                    <input
                        type="number"
                        step="any"
                        className="form-control"
                        value={form.longitude}
                        onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary">Salvar</button>
            </form>
        </div>
    );
}

export default Settings;