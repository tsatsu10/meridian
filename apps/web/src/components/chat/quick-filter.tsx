// Phase 2.2: Quick Filter Component for in-channel message filtering
import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search,
  X,
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickFilterProps {
  onFilterChange: (query: string) => void
  className?: string
  placeholder?: string
}

export function QuickFilter({ onFilterChange, className, placeholder = "Filter messages..." }: QuickFilterProps) {
  const [query, setQuery] = useState('')
  const [isActive, setIsActive] = useState(false)

  const handleChange = (value: string) => {
    setQuery(value)
    setIsActive(value.length > 0)
    onFilterChange(value)
  }

  const clearFilter = () => {
    setQuery('')
    setIsActive(false)
    onFilterChange('')
  }

  if (!isActive) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setIsActive(true)}
        className={cn("text-gray-500 hover:text-gray-700", className)}
      >
        <Filter className="w-4 h-4" />
      </Button>
    )
  }

  return (
    <div className={cn("flex items-center gap-2 max-w-sm", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="pl-7 pr-7 h-8 text-xs"
          autoFocus
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilter}
            className="absolute right-0 top-0 h-8 w-8 p-0 hover:bg-transparent"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      {query && (
        <Badge variant="secondary" className="text-xs">
          Filtering
        </Badge>
      )}
    </div>
  )
}