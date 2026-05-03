import './global.css';

export const metadata = {
  title: 'KeyNest',
  description: 'Encrypted credential manager portfolio project',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
