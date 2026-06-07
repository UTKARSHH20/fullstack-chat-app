import { Component } from 'react';
import { ShieldAlert } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-base-200">
          <div className="max-w-md w-full bg-base-100 p-8 rounded-2xl shadow-xl border border-error/20 flex flex-col items-center text-center">
            <div className="bg-error/10 p-4 rounded-full mb-6">
              <ShieldAlert className="w-12 h-12 text-error" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Oops! Something went wrong.</h1>
            <p className="text-base-content/70 mb-6">
              An unexpected error occurred in the application. We have logged the issue and are looking into it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary w-full"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-6 w-full text-left bg-base-300 p-4 rounded-lg overflow-x-auto">
                <p className="text-error font-mono text-xs whitespace-pre-wrap">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
