// Mention Autocomplete - @mention user suggestions

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface MentionAutocompleteProps {
  searchTerm: string;
  teamMembers: TeamMember[];
  onSelect: (member: TeamMember) => void;
  position: { top: number; left: number };
}

/**
 * MentionAutocomplete - Dropdown for @mentioning team members
 * 
 * Appears when user types @ followed by characters.
 * Filters team members by name or email.
 */
export function MentionAutocomplete({
  searchTerm,
  teamMembers,
  onSelect,
  position,
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter members by search term
  const filteredMembers = teamMembers.filter((member) => {
    const search = searchTerm.toLowerCase();
    return (
      member.name.toLowerCase().includes(search) ||
      member.email.toLowerCase().includes(search)
    );
  });

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredMembers.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredMembers[selectedIndex]) {
          onSelect(filteredMembers[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredMembers, selectedIndex, onSelect]);

  if (filteredMembers.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute z-50 bg-popover border rounded-md shadow-lg p-1 min-w-[250px] max-h-[200px] overflow-auto"
      style={{
        top: position.top,
        left: position.left,
      }}
      role="listbox"
      aria-label="Mention suggestions"
    >
      {filteredMembers.map((member, index) => (
        <button
          key={member.id}
          onClick={() => onSelect(member)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded text-left transition-colors',
            'hover:bg-accent',
            selectedIndex === index && 'bg-accent'
          )}
          role="option"
          aria-selected={selectedIndex === index}
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {member.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{member.name}</p>
            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
          </div>

          {selectedIndex === index && (
            <span className="text-xs text-muted-foreground">↵</span>
          )}
        </button>
      ))}
    </div>
  );
}

