import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  HiHome, 
  HiUser, 
  HiBriefcase, 
  HiClipboardList, 
  HiCalendar, 
  HiChartBar,
  HiStar,
  HiOfficeBuilding,
  HiUserGroup
} from 'react-icons/hi'

const EmployerSidebar = () => {
  const location = useLocation()

  const navItems = [
    {
      name: 'Dashboard',
      href: '/employer-dashboard',
      icon: HiHome,
      current: location.pathname === '/employer-dashboard'
    },
    {
      name: 'Profile Management',
      href: '/employer-dashboard/profile',
      icon: HiUser,
      current: location.pathname === '/employer-dashboard/profile'
    },
    {
      name: 'Job Management',
      href: '/employer-dashboard/job-management',
      icon: HiBriefcase,
      current: location.pathname === '/employer-dashboard/job-management'
    },
    {
      name: 'Applications Review',
      href: '/employer-dashboard/applications',
      icon: HiClipboardList,
      current: location.pathname === '/employer-dashboard/applications'
    },
    {
      name: 'Interview Scheduling',
      href: '/employer-dashboard/interview-scheduling',
      icon: HiCalendar,
      current: location.pathname === '/employer-dashboard/interview-scheduling'
    },
    {
      name: 'Candidate Analytics',
      href: '/employer-dashboard/analytics',
      icon: HiChartBar,
      current: location.pathname === '/employer-dashboard/analytics'
    },
    {
      name: 'Leaderboard Management',
      href: '/employer-dashboard/leaderboard',
      icon: HiStar,
      current: location.pathname === '/employer-dashboard/leaderboard'
    },
    {
      name: 'Company Profile',
      href: '/employer-dashboard/company',
      icon: HiOfficeBuilding,
      current: location.pathname === '/employer-dashboard/company'
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
                  ? 'bg-secondary text-white shadow-lg '
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

export default EmployerSidebar