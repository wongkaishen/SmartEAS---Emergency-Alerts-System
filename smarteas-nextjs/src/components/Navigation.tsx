'use client';

import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Home, Map, Warning, BugReport } from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: <Home /> },
    { href: '/map', label: 'Map View', icon: <Map /> },
    { href: '/test', label: 'API Test', icon: <BugReport /> },
  ];

  return (
    <AppBar position="static" sx={{ bgcolor: '#d32f2f', mb: 0 }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Warning sx={{ mr: 1 }} />
          <Typography variant="h6" component="div">
            SmartEAS Emergency Alert System
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.href}
              component={Link}
              href={item.href}
              color="inherit"
              startIcon={item.icon}
              sx={{
                backgroundColor: pathname === item.href ? 'rgba(255,255,255,0.2)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
