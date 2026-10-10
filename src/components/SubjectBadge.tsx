import React from 'react';
import { Category } from '@/lib/types';

interface SubjectBadgeProps {
  code: string;
  category: Category;
  size?: 'sm' | 'md';
}

const colorTokens: Record<Category, { bg: string; dot: string; text: string; border: string }> = {
  'CS & Dev': {
    bg: '#D9E1F1',
    border: '#274CB1',
    text: '#1E3A8A',
    dot: '#1E3A8A'
  },
  'Languages': {
    bg: '#FDD5DA',
    border: '#9E1842',
    text: '#881337',
    dot: '#881337'
  },
  'Humanities': {
    bg: '#FDEAE2',
    border: '#994716',
    text: '#78350F',
    dot: '#78350F'
  },
  'Mathematics': {
    bg: '#CBC2F7',
    border: '#5B24B1',
    text: '#4C1D95',
    dot: '#4C1D95'
  }
};

export const SubjectBadge: React.FC<SubjectBadgeProps> = ({ code, category, size = 'md' }) => {
  const token = colorTokens[category] || colorTokens['CS & Dev'];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      style={{
        backgroundColor: token.bg,
        color: token.text,
        borderColor: `${token.border}40`
      }}
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border transition ${sizeClasses}`}
    >
      <span
        style={{ backgroundColor: token.dot }}
        className="w-1.5 h-1.5 rounded-full"
      />
      {code}
    </span>
  );
};