import React from 'react'
import Header from './Header'

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Header />
      <main>{children}</main>
    </div>
  )
}

export default Layout