import { Component, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    console.error("ErrorBoundary", error);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="p-6">
        <Card className="rounded-xl p-8 text-center max-w-md mx-auto">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {this.state.error?.message ?? "Unexpected error"}
          </p>
          <Button className="mt-4" onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </Card>
      </div>
    );
  }
}
