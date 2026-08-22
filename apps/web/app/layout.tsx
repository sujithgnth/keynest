import './global.css';

export const metadata = {
  title: 'KeyNest (WIP) — encrypted credential vault',
  description:
    'A work-in-progress educational credential vault. Use synthetic test credentials only.',
  robots: {
    index: false,
    follow: false,
  },
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
