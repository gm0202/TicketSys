import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-background/80 backdrop-blur-sm sticky top-0 z-50 border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 justify-between items-center">
                    <div className="flex items-center gap-8">
                        <Link to="/" className="text-lg font-bold tracking-tight text-text-primary">
                            TICKET<span className="text-primary">SYS</span>
                        </Link>
                        <div className="hidden md:flex gap-6">
                            <Link to="/" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                                Shows
                            </Link>
                            <Link to="/my-bookings" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                                My Bookings
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {user.isAuthenticated ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-text-secondary">{user.email}</span>
                                <button
                                    onClick={handleLogout}
                                    className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
                                >
                                    Sign out
                                </button>
                                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-4">
                                <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                                    Log in
                                </Link>
                                <Link to="/signup" className="text-sm font-medium text-primary hover:text-primary-dark transition-colors">
                                    Sign up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
