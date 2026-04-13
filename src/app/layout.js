export const metadata = {
  title: 'Control de Gastos',
  description: 'App para Nacho',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}