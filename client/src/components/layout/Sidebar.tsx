import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navigation = [
    { name: 'Dashboard', href: '/admin' },
    { name: 'Approvals', href: '/admin/approvals' },
    { name: 'Shows', href: '/admin/shows' },
];

export function Sidebar() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    return (
        <div className="flex w-64 flex-col fixed inset-y-0 bg-background border-r border-border">
            <div className="flex h-16 shrink-0 items-center px-6 border-b border-border">
                <span className="text-lg font-bold tracking-tight text-text-primary">TICKET<span className="text-primary">SYS</span></span>
            </div>
            <nav className="flex flex-1 flex-col px-6 py-6 gap-1">
                <span className="label-premium px-2">Admin</span>
                {navigation.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        end={item.href === '/admin'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive
                                ? 'bg-surface text-primary'
                                : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'
                            }`
                        }
                    >
                        {item.name}
                    </NavLink>
                ))}
            </nav>
            <div className="p-6 border-t border-border">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold text-text-secondary">
                        AD
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-text-primary">Admin User</span>
                        <button
                            onClick={() => {
                                logout();
                                navigate('/login');
                            }}
                            className="text-xs text-text-secondary hover:text-red-400 text-left transition-colors"
                        >
                            Log out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
