import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import Container from '../ui/Container'
import { HiMenu, HiX, HiUser, HiLogout } from 'react-icons/hi'
import { useAuth } from '../../context/AuthContext'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    setIsProfileMenuOpen(false)
  }

  const getDashboardLink = () => {
    return user?.role === 'candidate' ? '/student-dashboard' : '/employer-dashboard'
  }

  return (
    <nav className="bg-white shadow-sm relative">
      <Container>
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3 p-1">
              <img src="/logo.png" alt="HirePrep Logo" className="w-full h-full rounded-full object-contain" />
            </div>
            <span className="text-xl sm:text-2xl lg:text-3xl font-semibold text-primary">HirePrep</span>
          </div>
          
          {/* Desktop Navigation (omitted for brevity) */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link to="/" className="text-primary hover:text-primary px-3 py-2 text-lg lg:text-xl font-medium transition-all duration-300 ease-in-out rounded-lg transform hover:scale-105 relative hover:underline decoration-2 underline-offset-4">
                Home
              </Link>
              <Link to="/about" className="text-text-light hover:text-secondary px-3 py-2 text-lg lg:text-xl font-medium transition-all duration-300 ease-in-out rounded-lg transform hover:scale-105 relative hover:underline decoration-2 underline-offset-4">
                About
              </Link>
              <Link to="/features" className="text-text-light hover:text-secondary px-3 py-2 text-lg lg:text-xl font-medium transition-all duration-300 ease-in-out rounded-lg transform hover:scale-105 relative hover:underline decoration-2 underline-offset-4">
                Features
              </Link>
              <Link to="/contact" className="text-text-light hover:text-secondary px-3 py-2 text-lg lg:text-xl font-medium transition-all duration-300 ease-in-out rounded-lg transform hover:scale-105 relative hover:underline decoration-2 underline-offset-4">
                Contact
              </Link>
            </div>
          </div>
          
          {/* Desktop Auth Section (omitted for brevity) */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 text-text-light hover:text-primary px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <HiUser className="h-5 w-5" />
                  <span className="text-lg font-medium">
                    {user?.profile?.firstName || user?.profile?.companyName || user?.email}
                  </span>
                </button>
                
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <Link
                        to={getDashboardLink()}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <HiLogout className="inline h-4 w-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="text-text-light hover:text-primary px-3 py-2 text-lg lg:text-xl font-medium transition-all duration-300 ease-in-out rounded-lg transform hover:scale-105 relative hover:underline decoration-2 underline-offset-4">
                  Login
                </Link>
                <Link to="/signup">
                  <Button size='lg' variant='secondary'>
                    <span className='text-lg lg:text-xl'>SignUp</span>
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Menu (omitted for brevity) */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-primary hover:text-white hover:bg-primary focus:outline-none focus:text-white focus:bg-primary transition-all duration-300 ease-in-out p-2 rounded-lg transform hover:scale-110 active:scale-95"
              aria-label="Toggle mobile menu"
            >
              {isMenuOpen ? (
                <HiX className="h-6 w-6" />
              ) : (
                <HiMenu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50">
            <div className="px-4 py-4 space-y-4">
              <Link 
                to="/" 
                className="block text-primary hover:text-primary py-3 px-2 text-lg font-medium transition-all duration-300 ease-in-out border-b border-gray-100 rounded-lg transform hover:scale-105 hover:underline decoration-2 underline-offset-4"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/about" 
                className="block text-text-light hover:text-secondary py-3 px-2 text-lg font-medium transition-all duration-300 ease-in-out border-b border-gray-100 rounded-lg transform hover:scale-105 hover:underline decoration-2 underline-offset-4"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link 
                to="/features" 
                className="block text-text-light hover:text-secondary py-3 px-2 text-lg font-medium transition-all duration-300 ease-in-out border-b border-gray-100 rounded-lg transform hover:scale-105 hover:underline decoration-2 underline-offset-4"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </Link>
              <Link 
                to="/contact" 
                className="block text-text-light hover:text-secondary py-3 px-2 text-lg font-medium transition-all duration-300 ease-in-out border-b border-gray-100 rounded-lg transform hover:scale-105 hover:underline decoration-2 underline-offset-4"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              
              {/* Mobile Auth Section - FIX APPLIED HERE */}
              <div className="pt-4 space-y-3">
                {isAuthenticated ? (
                  <>
                    <Link to={getDashboardLink()} onClick={() => setIsMenuOpen(false)}>
                      <Button size='lg' variant='outline' className="w-full">
                        <span className='text-lg'>Dashboard</span>
                      </Button>
                    </Link>
                    {/* FIX: Changed outer button to a div */}
                    <div onClick={handleLogout} className="w-full"> 
                      <Button size='lg' variant='secondary' className="w-full">
                        <span className='text-lg'>Logout</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                      <Button size='lg' variant='outline' className="w-full">
                        <span className='text-lg'>Login</span>
                      </Button>
                    </Link>
                    <Link to="/signup" onClick={() => setIsMenuOpen(false)}>
                      <Button size='lg' variant='secondary' className="w-full">
                        <span className='text-lg'>SignUp</span>
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Container>
    </nav>
  )
}

export default Header