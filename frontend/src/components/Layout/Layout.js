import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Home, 
  User, 
  Briefcase, 
  Users, 
  FileText, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';
import { logout } from '../../store/slices/authSlice';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const getNavItems = () => {
    if (!user) return [];
    
    if (user.role === 'candidate') {
      return [
        { label: 'Dashboard', path: '/candidate/dashboard', icon: Home },
        { label: 'Profile', path: '/candidate/profile', icon: User },
        { label: 'Resume', path: '/candidate/resume', icon: FileText },
        { label: 'Jobs', path: '/jobs', icon: Briefcase },
      ];
    } else if (user.role === 'company') {
      return [
        { label: 'Dashboard', path: '/company/dashboard', icon: Home },
        { label: 'Profile', path: '/company/profile', icon: User },
        { label: 'Jobs', path: '/company/jobs', icon: Briefcase },
        { label: 'Candidates', path: '/company/candidates', icon: Users },
      ];
    }
    
    return [];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="text-2xl font-bold text-blue-600 hover:text-blue-700"
              >
                HirePrep
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {user ? (
                <>
                  {navItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        <IconComponent size={18} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                  
                  <div className="flex items-center space-x-4 ml-6 pl-6 border-l border-gray-200">
                    <span className="text-sm text-gray-700">
                      {user.email}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/jobs')}
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Jobs
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Register
                  </button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-700 hover:text-blue-600"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              {user ? (
                <>
                  {navItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                      >
                        <IconComponent size={18} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                  
                  <div className="border-t border-gray-200 pt-4 pb-3">
                    <div className="px-3 text-sm text-gray-500 mb-3">
                      {user.email}
                    </div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 text-gray-700 hover:text-red-600 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                    >
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      navigate('/jobs');
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                  >
                    Jobs
                  </button>
                  <button
                    onClick={() => {
                      navigate('/login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      navigate('/register');
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-blue-600 text-white hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
