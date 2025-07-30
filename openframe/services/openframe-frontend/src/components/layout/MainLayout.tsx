import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Button, 
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetClose
} from '@flamingo/ui-kit/components/ui';
import { 
  MenuIcon,
  UserIcon,
  SunIcon,
  MoonIcon
} from '@flamingo/ui-kit/components/icons';
import { cn } from '@flamingo/ui-kit/utils';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/hooks/useTheme';

interface MenuItem {
  label: string;
  path?: string;
  children?: MenuItem[];
}

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const authStore = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Integrated Tools']);

  const menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard'
    },
    {
      label: 'Devices',
      path: '/devices'
    },
    {
      label: 'Integrated Tools',
      children: [
        {
          label: 'Remote Monitoring & Management',
          path: '/rmm'
        },
        {
          label: 'Remote Access and Control',
          path: '/rac'
        },
        {
          label: 'Mobile Device Management',
          path: '/mdm'
        }
      ]
    },
    {
      label: 'Infrastructure',
      path: '/tools'
    },
    {
      label: 'Monitoring',
      path: '/monitoring'
    },
    {
      label: 'Settings',
      path: '/settings'
    },
    {
      label: 'SSO Configuration',
      path: '/sso'
    },
    {
      label: 'API Keys',
      path: '/api-keys'
    }
  ];

  const toggleSubmenu = (label: string) => {
    setExpandedMenus(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  const handleLogout = async () => {
    try {
      await authStore.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const isActive = item.path && location.pathname.startsWith(item.path);
    const isExpanded = expandedMenus.includes(item.label);
    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      return (
        <div key={item.label} className="mb-1">
          <button
            onClick={() => toggleSubmenu(item.label)}
            className={cn(
              "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              "hover:bg-ods-bg-subtle hover:text-ods-text-primary",
              "text-ods-text-secondary",
              isExpanded && "bg-ods-bg-subtle text-ods-text-primary"
            )}
          >
            <span>{item.label}</span>
            <span 
              className={cn(
                "text-xs transition-transform inline-block",
                isExpanded && "rotate-180"
              )}
            >
              ▼
            </span>
          </button>
          {isExpanded && item.children && (
            <div className="mt-1 ml-4">
              {item.children.map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.path}
        to={item.path!}
        onClick={() => setMenuOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mb-1",
          level > 0 && "ml-4",
          isActive
            ? "bg-ods-accent text-ods-bg-primary font-semibold"
            : "text-ods-text-secondary hover:bg-ods-bg-subtle hover:text-ods-text-primary"
        )}
      >
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-ods-bg-primary">
      {/* Navbar */}
      <nav className="border-b border-ods-border bg-ods-card">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                  >
                    <MenuIcon className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <SheetHeader className="border-b border-ods-border px-6 py-4">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="text-lg font-semibold">Navigation</SheetTitle>
                      <SheetClose asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <span className="text-lg">×</span>
                        </Button>
                      </SheetClose>
                    </div>
                  </SheetHeader>
                  <div className="px-4 py-6">
                    <nav className="space-y-1">
                      {menuItems.map(item => renderMenuItem(item))}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
              
              <div className="flex items-center">
                <span className="text-xl font-bold">
                  Open<span className="text-ods-accent">Frame</span>
                </span>
                <span className="text-ods-text-secondary mx-2">@</span>
                <span className="text-ods-text-secondary text-sm">Dashboard</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
              >
                {theme === 'dark' ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/profile')}
              >
                <UserIcon className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="hidden sm:inline-flex"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <div className="flex flex-1">
        <aside className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex w-64 flex-col">
            <div className="flex flex-1 flex-col overflow-y-auto bg-ods-card border-r border-ods-border">
              <nav className="flex-1 space-y-1 px-4 py-6">
                {menuItems.map(item => renderMenuItem(item))}
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};