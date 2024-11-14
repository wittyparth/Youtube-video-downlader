import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import axios from 'axios'
import DownloadForm from '../src/components/DownloadForm'

// Mock axios
vi.mock('axios')

describe('DownloadForm', () => {
  beforeEach(() => {
    // Reset axios mocks before each test
    vi.resetAllMocks()
    render(<DownloadForm />)
  })

  it('renders the form correctly', () => {
    expect(screen.getByPlaceholderText(/youtube.com/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveTextContent(/Download Video/)
  })

  it('shows error for invalid URL', async () => {
    const input = screen.getByPlaceholderText(/youtube.com/i)
    const button = screen.getByRole('button')

    fireEvent.change(input, { target: { value: 'invalid-url' } })
    fireEvent.click(button)

    expect(await screen.findByText(/Please enter a valid YouTube URL/i)).toBeInTheDocument()
  })

  it('handles successful download', async () => {
    // Mock successful health check and download
    axios.get.mockResolvedValueOnce({ data: { status: 'ok' } }) // Health check
    axios.mockResolvedValueOnce({ // Download request
      data: new Blob(['test'], { type: 'video/mp4' }),
      headers: {
        'content-disposition': 'attachment; filename="video.mp4"'
      }
    })

    const input = screen.getByPlaceholderText(/youtube.com/i)
    const button = screen.getByRole('button')

    fireEvent.change(input, { 
      target: { value: 'https://www.youtube.com/watch?v=valid-id' } 
    })
    fireEvent.click(button)

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/health'))
    })
  })

  it('handles server error', async () => {
    // Mock failed health check
    axios.get.mockRejectedValueOnce(new Error('Server error'))

    const input = screen.getByPlaceholderText(/youtube.com/i)
    const button = screen.getByRole('button')

    fireEvent.change(input, { 
      target: { value: 'https://www.youtube.com/watch?v=valid-id' } 
    })
    fireEvent.click(button)

    expect(await screen.findByText(/Cannot connect to server/i)).toBeInTheDocument()
  })

  it('handles rate limiting', async () => {
    // Mock rate limit response
    axios.get.mockResolvedValueOnce({ data: { status: 'ok' } }) // Health check
    axios.mockRejectedValueOnce({ 
      response: { status: 429 }
    })

    const input = screen.getByPlaceholderText(/youtube.com/i)
    const button = screen.getByRole('button')

    fireEvent.change(input, { 
      target: { value: 'https://www.youtube.com/watch?v=valid-id' } 
    })
    fireEvent.click(button)

    expect(await screen.findByText(/Too many requests/i)).toBeInTheDocument()
  })
})