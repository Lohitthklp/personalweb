import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'lohithpr',
  description: 'Portfolio of Lohith Prasanna Teja Kakumanu, an applied AI engineer building production-ready LLM systems, data platforms, and machine learning solutions.',
  keywords: 'Lohith Prasanna Teja Kakumanu, Applied AI Engineer, Data Scientist, LLM, AI Systems, MLOps, Portfolio',
  icons: {
    icon: '/icons/brand-mark.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&family=Roboto:wght@400;500;700&display=swap"
        />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js" defer />
      </head>
      <body>{children}</body>
    </html>
  )
}
