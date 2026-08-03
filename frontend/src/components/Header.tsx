import { Link, NavLink } from 'react-router-dom'
import { Train, Ticket, MapPin } from 'lucide-react'

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'text-primary' : 'text-body hover:text-heading'
  }`

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-sm">
            <Train className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-heading">
            Ceylon<span className="text-primary">Rail</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <NavLink to="/" className={navLinkClass} end>
            <MapPin className="h-4 w-4" /> Book Now
          </NavLink>
          <NavLink to="/" className={navLinkClass} end>
            <Ticket className="h-4 w-4" /> My Tickets
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

export default Header
