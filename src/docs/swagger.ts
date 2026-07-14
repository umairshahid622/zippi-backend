import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import type { Application, Request, Response } from 'express'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Zippi Backend API',
      version: '1.0.0',
      description: 'API documentation for the Zippi backend service.',
    },
    servers: [{ url: '/api' }],
    tags: [
      { name: 'Auth', description: 'Authentication and session routes' },
      { name: 'Workspaces', description: 'Workspace CRUD, invites, and members' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)

export const setupSwagger = (app: Application): void => {
  app.use('/docs', swaggerUi.serve)
  app.get('/docs', swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  }))

  app.get('/docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })
}
