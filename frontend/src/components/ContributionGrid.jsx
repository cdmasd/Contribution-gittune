import React from 'react';

function ContributionGrid({ contributions, playingWeekIndex }) {
  // We expect a flat array of 364 days.
  // We need to render 52 columns (weeks) and 7 rows (days).
  // In CSS grid, we can use grid-auto-flow: column to lay them out top-to-bottom, left-to-right.

  const getColorClass = (count) => {
    if (count === 0) return 'bg-gray-800';
    if (count >= 1 && count <= 3) return 'bg-green-800';
    if (count >= 4 && count <= 9) return 'bg-green-500';
    return 'bg-green-300';
  };

  return (
    <div className="flex justify-center p-4">
      <div 
        className="grid gap-1"
        style={{ 
          gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
          gridAutoFlow: 'column' 
        }}
      >
        {contributions && contributions.length > 0 ? (
          contributions.map((c, i) => {
            const weekIndex = Math.floor(i / 7);
            const isPlaying = weekIndex === playingWeekIndex;
            return (
              <div 
                key={i} 
                className={`w-3 h-3 rounded-sm ${getColorClass(c.count)} transition-all duration-100 ${isPlaying ? 'ring-2 ring-white scale-125' : ''}`}
                title={`${c.count} contributions on ${c.date || 'unknown date'}`}
              ></div>
            );
          })
        ) : (
          // Empty state placeholder
          Array.from({ length: 364 }).map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-sm bg-gray-800"></div>
          ))
        )}
      </div>
    </div>
  );
}

export default ContributionGrid;
