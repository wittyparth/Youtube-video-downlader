import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import ytdl from '@distube/ytdl-core'
import logger from './logger.js'

const app = express()
const port = process.env.PORT || 5000
const MAX_VIDEO_DURATION = 3600 // 1 hour in seconds

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-production-domain.com' 
    : 'http://localhost:5173'
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
app.use(limiter)

app.use(express.json())

// Validate YouTube URL
const isValidYouTubeUrl = (url) => {
  try {
    const urlObj = new URL(url)
    return ['youtube.com', 'www.youtube.com', 'youtu.be'].includes(urlObj.hostname)
  } catch {
    return false
  }
}

app.get('/download', async (req, res) => {
  const startTime = Date.now()
  const { url } = req.query
  
  try {
    if (!url) {
      return res.status(400).json({ message: 'URL is required' })
    }

    if (!isValidYouTubeUrl(url)) {
      return res.status(400).json({ message: 'Invalid YouTube URL' })
    }

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ message: 'Invalid YouTube video URL' })
    }

    const info = await ytdl.getInfo(url)
    
    // Check video duration
    const duration = parseInt(info.videoDetails.lengthSeconds)
    if (duration > MAX_VIDEO_DURATION) {
      return res.status(400).json({ 
        message: 'Video is too long. Maximum duration is 1 hour.' 
      })
    }

    // Check video availability
    if (info.videoDetails.isPrivate) {
      return res.status(403).json({ message: 'This video is private' })
    }

    // Get the best available format
    const format = ytdl.chooseFormat(info.formats, { 
      quality: 'highest',
      filter: 'audioandvideo'
    })

    if (!format) {
      return res.status(400).json({ 
        message: 'No suitable format found for this video' 
      })
    }

    const sanitizedTitle = info.videoDetails.title.replace(/[^\w\s-]/g, '')
    res.header('Content-Disposition', `attachment; filename="${sanitizedTitle}.mp4"`)
    res.header('Content-Type', 'video/mp4')

    const stream = ytdl(url, { format })
    
    // Handle stream events
    stream.on('error', (error) => {
      logger.error('Stream error:', { error, url })
      if (!res.headersSent) {
        res.status(500).json({ message: 'Streaming error occurred' })
      }
    })

    stream.on('end', () => {
      const duration = Date.now() - startTime
      logger.info('Download completed', { 
        url, 
        duration,
        videoTitle: info.videoDetails.title
      })
    })

    // Pipe the video stream to response
    stream.pipe(res)

  } catch (error) {
    logger.error('Download error:', { error, url })
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Failed to download video',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
})

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err)
  res.status(500).json({ message: 'Internal server error' })
})

// Start server
const server = app.listen(port, () => {
  logger.info(`Server running at http://localhost:${port}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

export default app // For testing