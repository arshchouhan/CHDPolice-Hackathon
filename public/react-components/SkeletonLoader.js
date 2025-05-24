// SkeletonLoader.js - Modern UI skeleton loading component
class SkeletonLoader extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="skeleton-dashboard animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-300/20 rounded-lg"></div>
            <div className="h-6 w-48 bg-gray-300/20 rounded"></div>
          </div>
          <div className="h-10 w-32 bg-gray-300/20 rounded-lg"></div>
        </div>
        
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50">
              <div className="flex justify-between items-center mb-4">
                <div className="h-5 w-24 bg-gray-300/20 rounded"></div>
                <div className="w-8 h-8 bg-gray-300/20 rounded-full"></div>
              </div>
              <div className="h-8 w-20 bg-gray-300/20 rounded mb-2"></div>
              <div className="h-4 w-32 bg-gray-300/20 rounded"></div>
            </div>
          ))}
        </div>
        
        {/* Email Connection Status Skeleton */}
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="h-6 w-48 bg-gray-300/20 rounded"></div>
            <div className="h-8 w-32 bg-gray-300/20 rounded-lg"></div>
          </div>
          <div className="h-4 w-3/4 bg-gray-300/20 rounded mb-3"></div>
          <div className="h-4 w-2/3 bg-gray-300/20 rounded"></div>
        </div>
        
        {/* Emails List Skeleton */}
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50">
          <div className="flex justify-between items-center mb-6">
            <div className="h-6 w-36 bg-gray-300/20 rounded"></div>
            <div className="flex space-x-3">
              <div className="h-8 w-24 bg-gray-300/20 rounded-lg"></div>
              <div className="h-8 w-24 bg-gray-300/20 rounded-lg"></div>
            </div>
          </div>
          
          {/* Email Items Skeleton */}
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border-b border-gray-700/30 py-4">
              <div className="flex justify-between items-center mb-2">
                <div className="h-5 w-48 bg-gray-300/20 rounded"></div>
                <div className="h-6 w-20 bg-gray-300/20 rounded-full"></div>
              </div>
              <div className="h-4 w-full bg-gray-300/20 rounded mb-2"></div>
              <div className="h-4 w-2/3 bg-gray-300/20 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

// Register component
window.SkeletonLoader = SkeletonLoader;
