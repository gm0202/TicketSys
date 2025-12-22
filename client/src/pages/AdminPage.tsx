import { useAuth } from '../context/AuthContext';
import { ShowForm } from '../components/ShowForm';
import { useNavigate } from 'react-router-dom';

export function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const blocked = user.role !== 'admin';

  if (blocked) {
    return (
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-lg">
        Admin access required.
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Create New</h1>
        <p className="text-text-secondary mt-1">Add a new show or event to the catalog.</p>
      </div>

      <ShowForm onSuccess={() => navigate('/admin/shows')} />
    </>
  );
}
