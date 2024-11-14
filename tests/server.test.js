import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import ytdl from '@distube/ytdl-core'
import app from '../server/index.js'

// Mock ytdl-core
vi.mock('@distube/ytdl-core', () => ({
  default: {
    validateURL: vi.fn(),
    getInfo: vi.fn(),
    chooseFormat: vi.fn(),
    downloadFromInfo: vi.fn()
  }
}))

describe('Server endpoints', () => {
  let server

  beforeAll(() => {
    server = app.listen(0)
  })

  afterAll((done) => {
    server.close(done)
  })

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const response = await request(server).get('/health')
      expect(response.status).toBe(200)
      expect(response.body.status).toBe('ok')
      expect(response.body.timestamp).toBeDefined()
    })
  })

  describe('GET /download', () => {
    it('should return 400 if no URL provided', async () => {
      const response = await request(server).get('/download')
      expect(response.status).toBe(400)
      expect(response.body.message).toBe('URL is required')
    })

    it('should return 400 for invalid YouTube URL', async () => {
      const response = await request(server)
        .get('/download')
        .query({ url: 'https://invalid-url.com' })
      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Invalid YouTube URL')
    })

    it('should return 400 for non-existent video ID', async () => {
      ytdl.validateURL.mockReturnValueOnce(true)
      ytdl.getInfo.mockRejectedValueOnce(new Error('Video unavailable'))

      const response = await request(server)
        .get('/download')
        .query({ url: 'https://youtube.com/watch?v=invalid-id' })
      expect(response.status).toBe(500)
    })

    it('should handle private videos correctly', async () => {
      ytdl.validateURL.mockReturnValueOnce(true)
      ytdl.getInfo.mockResolvedValueOnce({
        videoDetails: {
          isPrivate: true,
          lengthSeconds: '100'
        }
      })

      const response = await request(server)
        .get('/download')
        .query({ url: 'https://youtube.com/watch?v=private-video' })
      expect(response.status).toBe(403)
      expect(response.body.message).toBe('This video is private')
    })

    it('should handle videos that are too long', async () => {
      ytdl.validateURL.mockReturnValueOnce(true)
      ytdl.getInfo.mockResolvedValueOnce({
        videoDetails: {
          isPrivate: false,
          lengthSeconds: '7200' // 2 hours
        }
      })

      const response = await request(server)
        .get('/download')
        .query({ url: 'https://youtube.com/watch?v=long-video' })
      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Video is too long. Maximum duration is 1 hour.')
    })
  })
})