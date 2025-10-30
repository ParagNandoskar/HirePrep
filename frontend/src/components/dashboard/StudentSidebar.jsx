import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  HiHome, 
  HiUser, 
  HiDocumentText, 
  HiBriefcase, 
  HiClipboardList, 
  HiClock, 
  HiVideoCamera,
  HiChartBar,
  HiStar,
  HiLightBulb
} from 'react-icons/hi'

const StudentSidebar = () => {
  const location = useLocation()

  const navItems = [
    {
      name: 'Dashboard',
      href: '/student-dashboard',
      icon: HiHome,
      current: location.pathname === '/student-dashboard'
    },
    {
      name: 'Profile Management',
      href: '/student-dashboard/profile',
      icon: HiUser,
      current: location.pathname === '/student-dashboard/profile'
    },
    {
      name: 'Resume Management',
      href: '/student-dashboard/resume',
      icon: HiDocumentText,
      current: location.pathname === '/student-dashboard/resume'
    },
    {
      name: 'Explore Jobs',
      href: '/student-dashboard/explore-jobs',
      icon: HiBriefcase,
      current: location.pathname === '/student-dashboard/explore-jobs'
    },
    {
      name: 'Your Applications',
      href: '/student-dashboard/applications',
      icon: HiClipboardList,
      current: location.pathname === '/student-dashboard/applications'
    },
    {
      name: 'Interview History',
      href: '/student-dashboard/interview-history',
      icon: HiClock,
      current: location.pathname === '/student-dashboard/interview-history'
    },
    {
      name: 'Live Interview',
      href: '/student-dashboard/live-interview',
      icon: HiVideoCamera,
      current: location.pathname === '/student-dashboard/live-interview'
    },
    {
      name: 'Results & Analytics',
      href: '/student-dashboard/results',
      icon: HiChartBar,
      current: location.pathname === '/student-dashboard/results'
    },
    {
      name: 'Leaderboard',
      href: '/student-dashboard/leaderboard',
      icon: HiStar,
      current: location.pathname === '/student-dashboard/leaderboard'
    },
    {
      name: 'Recommendations',
      href: '/student-dashboard/recommendations',
      icon: HiLightBulb,
      current: location.pathname === '/student-dashboard/recommendations'
    }
  ]

  return (
    <nav className="mt-6 px-3">
      <div className="space-y-1">
        {navItems.map((item) => {
          const IconComponent = item.icon
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-3 py-3 text-sm font-medium rounded-full transition-all duration-200 hover:scale-105 ${
                item.current
                  ? 'bg-secondary text-white shadow-lg'
                  : 'text-gray-600 hover:bg-primary  hover:shadow-md'
              }`}
            >
              <IconComponent
                className={`mr-3 h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                  item.current ? 'text-white' : 'text-gray-400 '
                }`}
              />
              {item.name}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default StudentSidebar