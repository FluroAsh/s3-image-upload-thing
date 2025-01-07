export default function Layout({ children }: { children: React.ReactNode }) {
  // TODO: Add an error boundary for this layout/route
  return <div className="p-4">{children}</div>
}
