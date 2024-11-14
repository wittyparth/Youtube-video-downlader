import React, { useState, useCallback } from 'react'
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid'
import axios from 'axios'

const API_URL = import.meta.env.PROD 
  ? 'https://your-production-api.com' 
  : 'http://localhost:5000'

const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

export default function DownloadForm() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validateUrl = useCallback((url) => {
    try {
      const urlObj = new URL(url)
      return ['youtube.com', 'www.youtube.com', 'youtu.be'].includes(urlObj.hostname)
    } catch {
      return false
    }
  }, [])

  const downloadWithRetry = useCallback(async (url, retries = 0) => {
    try {
      const response = await axios({
        url: `${API_URL}/download?url=${encodeURIComponent(url)}`,
        method: 'GET',
        responseType: 'blob',
        timeout: 300000, // 5 minutes
        onDownloadProgress: (progressEvent) => {
          // Handle download progress if needed
          console.log('Download progress:', progressEvent.loaded)
        }
      })

      const filename = response.headers['content-disposition']
        ?.split('filename=')[1]
        ?.replace(/"/g, '') || 'video.mp4'

      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
      return true
    } catch (err) {
      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)))
        return downloadWithRetry(url, retries + 1)
      }
      throw err
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!validateUrl(url)) {
      setError('Please enter a valid YouTube URL')
      setLoading(false)
      return
    }

    try {
      // Check server health first
      await axios.get(`${API_URL}/health`)
      await downloadWithRetry(url)
    } catch (err) {
      console.error('Download error:', err)
      if (err.code === 'ECONNREFUSED' || !err.response) {
        setError('Cannot connect to server. Please try again later.')
      } else if (err.response?.status === 429) {
        setError('Too many requests. Please wait a few minutes and try again.')
      } else {
        setError(err.response?.data?.message || 'Failed to download video')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-[#282828] p-6 rounded-lg shadow-lg">
        <label htmlFor="url" className="block text-sm font-medium mb-2">
          YouTube Video URL
        </label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full px-4 py-3 bg-[#1F1F1F] text-white rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none"
          required
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'url-error' : undefined}
        />
      </div>

      {error && (
        <div 
          id="url-error"
          role="alert"
          className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center space-x-2 transition duration-200 disabled:opacity-50"
        aria-busy={loading}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
        ) : (
          <>
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span>Download Video</span>
          </>
        )}
      </button>
    </form>
  )
}