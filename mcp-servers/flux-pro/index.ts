#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import Replicate from 'replicate'
import fs from 'fs'
import https from 'https'
import path from 'path'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
})

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath)
    https.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlink(filepath, () => {})
      reject(err)
    })
  })
}

const server = new Server(
  {
    name: 'flux-pro-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_image_flux_pro',
        description: 'Generate high-quality realistic images using Flux Pro 1.1. Best for historical figures, portraits, and realistic photography. Less restrictive than DALL-E.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Detailed description of the image to generate. For best results, include style, lighting, composition details.',
            },
            output_path: {
              type: 'string',
              description: 'Full file path where the generated image should be saved (e.g., /path/to/output.png)',
            },
            aspect_ratio: {
              type: 'string',
              description: 'Aspect ratio for the image',
              enum: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '9:21'],
              default: '1:1',
            },
            output_format: {
              type: 'string',
              description: 'Output image format',
              enum: ['png', 'jpg', 'webp'],
              default: 'png',
            },
          },
          required: ['prompt', 'output_path'],
        },
      },
      {
        name: 'generate_image_flux_dev',
        description: 'Generate images using Flux Dev (faster, cheaper alternative to Pro). Good for quick iterations and testing.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Detailed description of the image to generate',
            },
            output_path: {
              type: 'string',
              description: 'Full file path where the generated image should be saved',
            },
            aspect_ratio: {
              type: 'string',
              description: 'Aspect ratio for the image',
              enum: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '9:21'],
              default: '1:1',
            },
            output_format: {
              type: 'string',
              description: 'Output image format',
              enum: ['png', 'jpg', 'webp'],
              default: 'png',
            },
          },
          required: ['prompt', 'output_path'],
        },
      },
    ],
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  if (!args) {
    throw new Error('No arguments provided')
  }

  try {
    if (name === 'generate_image_flux_pro') {
      const { prompt, output_path, aspect_ratio = '1:1', output_format = 'png' } = args as {
        prompt: string
        output_path: string
        aspect_ratio?: string
        output_format?: string
      }

      console.error(`Generating image with Flux Pro 1.1...`)
      console.error(`Prompt: ${prompt}`)

      const output = await replicate.run('black-forest-labs/flux-1.1-pro', {
        input: {
          prompt,
          aspect_ratio,
          output_format,
          output_quality: 90,
          safety_tolerance: 2, // More permissive for historical figures
        },
      })

      const imageUrl = Array.isArray(output) ? output[0] : output
      if (typeof imageUrl !== 'string') {
        throw new Error('Unexpected output format from Replicate')
      }

      // Ensure directory exists
      const dir = path.dirname(output_path)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      await downloadImage(imageUrl, output_path)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              output_path,
              image_url: imageUrl,
              message: `Image successfully generated and saved to ${output_path}`,
            }),
          },
        ],
      }
    }

    if (name === 'generate_image_flux_dev') {
      const { prompt, output_path, aspect_ratio = '1:1', output_format = 'png' } = args as {
        prompt: string
        output_path: string
        aspect_ratio?: string
        output_format?: string
      }

      console.error(`Generating image with Flux Dev...`)
      console.error(`Prompt: ${prompt}`)

      const output = await replicate.run('black-forest-labs/flux-dev', {
        input: {
          prompt,
          aspect_ratio,
          output_format,
          output_quality: 90,
        },
      })

      const imageUrl = Array.isArray(output) ? output[0] : output
      if (typeof imageUrl !== 'string') {
        throw new Error('Unexpected output format from Replicate')
      }

      // Ensure directory exists
      const dir = path.dirname(output_path)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      await downloadImage(imageUrl, output_path)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              output_path,
              image_url: imageUrl,
              message: `Image successfully generated and saved to ${output_path}`,
            }),
          },
        ],
      }
    }

    throw new Error(`Unknown tool: ${name}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: errorMessage,
          }),
        },
      ],
      isError: true,
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Flux Pro MCP Server running on stdio')
}

main().catch((error) => {
  console.error('Server error:', error)
  process.exit(1)
})
