import React, { useState } from 'react';

export const Tooltip: React.FC<{
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}> = ({ content, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-50 pointer-events-none px-3 py-1.5 text-xs font-medium text-slate-100 bg-slate-800 border border-slate-700 rounded-lg shadow-xl whitespace-normal max-w-xs text-center transition-all ${positionStyles[position]}`}
        >
          {content}
        </div>
      )}
    </div>
  );
};
