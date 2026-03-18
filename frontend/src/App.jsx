import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import AdminLogin from './components/admin-dashboard/AdminLogin';
import AdminDashboard from './components/admin-dashboard/AdminDashboard';
import AdminRoute from './components/admin-dashboard/AdminRoute';
import UserRoute from './components/UserRoute';
import UserDashboard from './components/user-dashboard/UserDashboard';

// Handle redirects for legacy routes
const RedirectHandler = () => {
  const { user } = useAuth();
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
};

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Admin Login Route (Redirects to unified login page) */}
        <Route path="/admin/login" element={<Navigate to="/login?admin=true" replace />} />
        
        {/* Protected User Routes */}
        <Route element={<UserRoute />}>
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
        
        {/* Protected Admin Routes */}
        <Route path="/admin">
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route element={<AdminRoute />}>
            <Route path="dashboard" element={<AdminDashboard />} />
          </Route>
        </Route>
        
        {/* Catch-all route for unknown paths */}
        <Route path="*" element={<RedirectHandler />} />
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;
