import { Link } from 'react-router-dom'
import { Train, Mail, Phone } from 'lucide-react'

function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 text-white">
              <Train className="h-4 w-4" />
            </span>
            <span className="font-bold text-heading">
              Ceylon<span className="text-primary">Rail</span>
            </span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-body">
            <Link to="/" className="transition-colors hover:text-primary">Book Tickets</Link>
            <Link to="/" className="transition-colors hover:text-primary">Routes</Link>
            <Link to="/" className="transition-colors hover:text-primary">Help Center</Link>
            <Link to="/" className="transition-colors hover:text-primary">Contact</Link>
          </nav>

          {/* Contact */}
          <div className="flex flex-col items-center gap-1 text-sm text-body sm:items-end">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> support@ceylonrail.lk
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> +94 11 2 123 456
            </span>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-body">
          © {new Date().getFullYear()} CeylonRail. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default Footer
