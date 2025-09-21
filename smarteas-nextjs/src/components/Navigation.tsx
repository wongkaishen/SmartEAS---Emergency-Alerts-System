'use client';

import { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Home, Map, Warning } from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: '/', label: 'Home', icon: <Home /> },
    { href: '/map', label: 'Emergency Map', icon: <Map /> },
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
                backgroundColor: mounted && pathname === item.href ? 'rgba(255,255,255,0.2)' : 'transparent',
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
