'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-2 rounded-xl bg-muted/50 w-[104px] h-9" />
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border">
      <button
        onClick={() => setTheme('light')}
        className={cn(
          'p-1.5 rounded-lg transition-all duration-200',
          theme === 'light'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="Light mode"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          'p-1.5 rounded-lg transition-all duration-200',
          theme === 'dark'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="Dark mode"
      >
        <Moon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={cn(
          'p-1.5 rounded-lg transition-all duration-200',
          theme === 'system'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="System"
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  );
}
