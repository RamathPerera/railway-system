import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import type { Station } from '../types'

interface SearchableSelectProps {
  options: Station[]
  value: string
  onChange: (value: string) => void
  label?: React.ReactNode
  placeholder?: string
  disabled?: boolean
}

function SearchableSelect({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select an option',
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find((option) => option.id === value)

  // Close the dropdown when clicking outside.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter options by the typed query (case-insensitive).
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((option) => option.name.toLowerCase().includes(q))
  }, [options, query])

  const handleSelect = (id: string) => {
    onChange(id)
    setIsOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      {label && <div className="mb-1">{label}</div>}

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setIsOpen((open) => !open)
          setQuery('')
        }}
        className="input-field flex items-center justify-between gap-2 text-left"
      >
        <span className={selected ? 'text-heading' : 'text-slate-400'}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search..."
              className="w-full bg-transparent text-sm text-heading placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <ul className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">No matching stations</li>
            )}
            {filteredOptions.map((option) => {
              const isSelected = option.id === value
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 ${
                      isSelected
                        ? 'bg-indigo-50 font-medium text-indigo-700'
                        : 'text-heading hover:bg-slate-50'
                    }`}
                  >
                    <span>{option.name}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-indigo-600" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default SearchableSelect
