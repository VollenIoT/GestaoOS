import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React Component:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', background: '#fee2e2', color: '#991b1b', fontFamily: 'sans-serif', height: '100vh', overflow: 'auto', zIndex: 99999, position: 'relative' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>⚠️ Ocorreu um erro ao renderizar esta tela:</h1>
          <p style={{ fontWeight: 'bold', fontSize: '15px' }}>{this.state.error?.message}</p>
          <pre style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #f87171', overflowX: 'auto', fontSize: '12px', marginTop: '12px' }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={{ marginTop: '16px', background: '#dc2626', color: '#ffffff', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
