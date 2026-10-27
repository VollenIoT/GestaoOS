import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React Component:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private copyErrorToClipboard = () => {
    const errorDetails = `[ERRO NA INTERFACE]:\n${this.state.error?.name || 'Error'}: ${this.state.error?.message || 'Sem mensagem'}\n\n[STACK TRACE]:\n${this.state.error?.stack || 'Sem stack'}\n\n[COMPONENT STACK]:\n${this.state.errorInfo?.componentStack || 'Sem component stack'}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(errorDetails).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 3000);
      }).catch(() => {
        prompt('Copie o código do erro abaixo (Ctrl+C):', errorDetails);
      });
    } else {
      prompt('Copie o código do erro abaixo (Ctrl+C):', errorDetails);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', background: '#fee2e2', color: '#991b1b', fontFamily: 'sans-serif', height: '100vh', overflow: 'auto', zIndex: 99999, position: 'relative' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>⚠️ Ocorreu um erro ao renderizar esta tela:</h1>
          <p style={{ fontWeight: 'bold', fontSize: '15px' }}>{this.state.error?.message}</p>
          <pre style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #f87171', overflowX: 'auto', fontSize: '12px', marginTop: '12px', userSelect: 'all' }}>
            {this.state.error?.stack || this.state.error?.message}
          </pre>
          <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            <button
              onClick={this.copyErrorToClipboard}
              style={{ background: '#2563eb', color: '#ffffff', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {this.state.copied ? '✅ Código do Erro Copiado!' : '📋 Copiar Código do Erro'}
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.reload();
              }}
              style={{ background: '#dc2626', color: '#ffffff', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
