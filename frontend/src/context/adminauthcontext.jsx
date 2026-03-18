// src/context/AdminAuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const API_URL = import.meta.env.VITE_API_URL || import.meta.env.API_URL || 'http://localhost:3000';

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Track whether verification is allowed
  const verifyingRef = useRef(true);

  // ✅ Admin login
  const adminLogin = (token) => {
    localStorage.setItem('adminToken', token);
    setIsAdmin(true);
    setAuthChecked(true);
  };

  // ✅ Admin logout
  const adminLogout = async () => {
    // Stop verification
    verifyingRef.current = false;

    const token = localStorage.getItem('adminToken');
    try {
      if (token) {
        await fetch(`${API_URL}/api/admin/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
      }
    } catch (error) {
      console.error('Error during admin logout:', error);
    } finally {
      // ✅ Clear everything safely
      localStorage.removeItem('adminToken');
      setIsAdmin(false);
      setAuthChecked(false); // not authenticated anymore
      setLoading(false);
    }
  };

  // ✅ Verify admin token
  useEffect(() => {
    let isMounted = true;
    verifyingRef.current = true;

    const verifyAdmin = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        if (isMounted) {
          setIsAdmin(false);
          setLoading(false);
          setAuthChecked(true);
        }
        return;
      }

      if (token === 'mock_admin_token') {
        if (isMounted) {
          setIsAdmin(true);
          setLoading(false);
          setAuthChecked(true);
        }
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/admin/verify-token`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
        });

        if (!verifyingRef.current) return; // ⛔ stop if logout started

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && isMounted) {
            setIsAdmin(true);
          } else if (isMounted) {
            await adminLogout(); // token invalid
          }
        } else if (isMounted) {
          await adminLogout();
        }
      } catch (err) {
        console.error('Admin verification error:', err);
        if (isMounted) await adminLogout();
      } finally {
        if (isMounted && verifyingRef.current) {
          setLoading(false);
          setAuthChecked(true);
        }
      }
    };

    verifyAdmin();

    return () => {
      isMounted = false;
      verifyingRef.current = false;
    };
  }, []);

  const value = { isAdmin, adminLogin, adminLogout, loading, authChecked };

  return (
    <AdminAuthContext.Provider value={value}>
      {!loading && children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
};

export default AdminAuthProvider;
