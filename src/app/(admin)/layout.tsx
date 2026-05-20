export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#F5F0E8', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
