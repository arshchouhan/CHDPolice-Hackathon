import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './components/Login';
import Signup from './components/Signup';
import UserDashboard from './components/user-dashboard/UserDashboard';
import Dashboard from './components/user-dashboard/Dashboard';
import UrlSandbox from './components/UrlSandbox';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './components/admin-dashboard/AdminLogin';
import AdminRoute from './components/admin-dashboard/AdminRoute';
import AdminDashboard from './components/admin-dashboard';
import './App.css';
import './assets/css/user-dashboard.css';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer 
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/url-sandbox" element={<ProtectedRoute><UrlSandbox /></ProtectedRoute>} />
          
          {/* Admin routes */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        
          {/* Protected user routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <UserDashboard>
                  <Dashboard />
                </UserDashboard>
              </ProtectedRoute>
            }
          />
          
          {/* Default route - redirects to dashboard if authenticated, otherwise to login */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
