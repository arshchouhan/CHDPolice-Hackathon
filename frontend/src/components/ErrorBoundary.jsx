/**
 * Error Boundary Component
 * 
 * A React component that catches JavaScript errors anywhere in its child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the whole application.
 */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to the console
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // You can also log the error to an error reporting service
    if (window.showErrorNotification) {
      window.showErrorNotification('Component Error', error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
          <h3 className="text-red-400 font-medium mb-2">Something went wrong</h3>
          <p className="text-gray-300 text-sm mb-3">{this.state.error && this.state.error.toString()}</p>
          
          {this.props.fallback ? (
            this.props.fallback
          ) : (
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              Try again
            </button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Export the component
window.ErrorBoundary = ErrorBoundary;
