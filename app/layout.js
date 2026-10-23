import './globals.css';

export const metadata = {
  title: 'YT Downloader',
  description: 'Minimalist media extractor',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0a0f0d] text-white">
        {children}
      </body>
    </html>
  );
}