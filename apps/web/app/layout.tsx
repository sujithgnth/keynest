import './global.css';

export const metadata = {
  title: 'KeyNest — encrypted credential vault',
  description: 'A local-first encrypted credential vault.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
