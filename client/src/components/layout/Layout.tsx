import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';

export function Layout() {
    const { user } = useAuth();
    const location = useLocation();
    const isAuthPage = ['/login', '/signup'].includes(location.pathname);
    const isAdmin = user?.role === 'admin';

    if (isAuthPage) {
        return (
            <div className="min-h-screen bg-background flex">
                {/* Left Side - Brand */}
                <div className="hidden lg:flex w-1/2 bg-surface items-center justify-center border-r border-border p-12">
                    <div className="max-w-md">
                        <h1 className="text-4xl font-bold text-text-primary mb-6">
                            Experience Exclusive<br />Events.
                        </h1>
                        <p className="text-text-secondary text-lg leading-relaxed">
                            Secure your seat at the world's most sought-after performances.
                            Designed for those who appreciate excellence.
                        </p>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
                    <Outlet />
                </div>
            </div>
        );
    }

    if (isAdmin && location.pathname.startsWith('/admin')) {
        return (
            <div className="min-h-screen bg-background">
                <Sidebar />
                <main className="pl-64">
                    <div className="px-8 py-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>
        </div>
    );
}
