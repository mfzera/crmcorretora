import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Sentry } from '@/infra/sentry';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Algo deu errado
            </h1>
            <p className="text-muted-foreground text-sm">
              Ocorreu um erro inesperado. Recarregue a página ou volte ao início.
            </p>
          </div>

          {import.meta.env.DEV && (
            <pre className="text-left text-xs bg-muted p-3 rounded-md overflow-auto max-h-40 text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={this.handleReload} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Recarregar
            </Button>
            <Button variant="outline" onClick={this.handleHome} className="gap-2">
              <Home className="w-4 h-4" />
              Voltar ao início
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
