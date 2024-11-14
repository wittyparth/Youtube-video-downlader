import React from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import DownloadForm from './components/DownloadForm'
import Instructions from './components/Instructions'
import Footer from './components/Footer'

export default function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0F0F0F] text-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <DownloadForm />
            <Instructions />
          </div>
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  )
}