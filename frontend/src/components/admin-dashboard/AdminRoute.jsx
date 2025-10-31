import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import AdminLogin from './components/admin-dashboard/AdminLogin';
import AdminDashboard from './components/admin-dashboard/AdminDashboard';
import AdminRoute from './components/admin-dashboard/AdminRoute';

// Import other components as needed
// import Home from './components/Home';
// import NotFound from './components/NotFound';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* Protected Admin Routes - wrapped with AdminRoute */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            {/* Add more protected admin routes here */}
            {/* <Route path="users" element={<AdminUsers />} /> */}
            {/* <Route path="settings" element={<AdminSettings />} /> */}
            
            {/* Default redirect from /admin to /admin/dashboard */}
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
          
          {/* Other routes */}
          {/* <Route path="/" element={<Home />} /> */}
          {/* <Route path="*" element={<NotFound />} /> */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;