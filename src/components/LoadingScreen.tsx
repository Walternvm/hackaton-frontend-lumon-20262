export function LoadingScreen({ message = 'Cargando...' }: { message?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#eef1df] px-6">
      <div className="text-center" role="status">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#a9b7a1] border-t-[#0b4b3f]" />
        <p className="mt-4 font-mono text-sm uppercase tracking-[0.2em] text-[#0b4b3f]">
          {message}
        </p>
      </div>
    </main>
  )
}
