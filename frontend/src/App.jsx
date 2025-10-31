import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import AdminDashboard from './components/admin-dashboard/AdminDashboard';
import AdminRoute from './components/AdminRoute';

// Handle redirects for legacy routes
const RedirectHandler = () => {
  const { admin } = useAuth();
  return <Navigate to={"/login"} replace />;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      
      {/* Handle legacy /admin/login route */}
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      
      {/* Protected Admin Routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>
      
      {/* Catch-all route for unknown paths */}
      <Route path="*" element={<RedirectHandler />} />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
