import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react'

interface State {
  failed: boolean
}

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info)
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <main className="grid min-h-screen place-items-center bg-[#eef1df] px-6">
          <section className="max-w-lg text-center">
            <p className="font-mono text-sm uppercase tracking-widest text-[#8c2f23]">Error de terminal</p>
            <h1 className="mt-3 text-4xl font-bold">No pudimos mostrar esta pagina</h1>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="mt-6 bg-[#0b4b3f] px-5 py-3 font-semibold text-white"
            >
              Volver al inicio
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
