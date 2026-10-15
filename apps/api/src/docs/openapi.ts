import { Router } from 'express';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Hydraulic Engineering Academy API',
    version: '1.0.0',
    description:
      'High-performance production REST API for Course Management, Video Delivery (Bunny Stream TUS), and Razorpay payments.',
    contact: {
      name: 'Engineering Support',
      email: 'support@hydrauliccourse.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000/api/v1',
      description: 'Local Development Server',
    },
    {
      url: 'https://api.hydrauliccourse.com/api/v1',
      description: 'Production API',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Standard access token passed as `Authorization: Bearer <token>`',
      },
      CookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refresh_token',
        description: 'HttpOnly SameSite=Lax refresh token cookie',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Invalid input parameters' },
            },
          },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          slug: { type: 'string', example: 'industrial-hydraulics-masterclass' },
          title: { type: 'string', example: 'Industrial Hydraulics Masterclass' },
          description: { type: 'string' },
          pricePaise: { type: 'integer', example: 149900 },
          compareAtPricePaise: { type: 'integer', example: 299900 },
          currency: { type: 'string', example: 'INR' },
          status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
          validityDays: { type: 'integer', nullable: true },
          allowRenewals: { type: 'boolean', example: true },
        },
      },
      Section: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'Hydraulic Pumps & Motors' },
          position: { type: 'integer', example: 1 },
          isPublished: { type: 'boolean', example: true },
        },
      },
      Lesson: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          sectionId: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'Axial Piston Pump Disassembly' },
          description: { type: 'string', nullable: true },
          position: { type: 'integer', example: 1 },
          durationSeconds: { type: 'integer', example: 745 },
          isFreePreview: { type: 'boolean', example: false },
          isPublished: { type: 'boolean', example: true },
          status: { type: 'string', enum: ['PROCESSING', 'READY', 'FAILED'] },
        },
      },
      UploadTicket: {
        type: 'object',
        properties: {
          uploadUrl: { type: 'string', example: 'https://video.bunnycdn.com/tusupload' },
          libraryId: { type: 'string', example: '12345' },
          videoId: { type: 'string', format: 'uuid' },
          authorizationSignature: { type: 'string', example: 'd3b07384d113edec...' },
          authorizationExpire: { type: 'integer', example: 1729000000 },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check probe',
        tags: ['System'],
        responses: {
          200: { description: 'Service operational' },
        },
      },
    },
    '/ready': {
      get: {
        summary: 'Readiness probe',
        tags: ['System'],
        responses: {
          200: { description: 'Databases & Redis operational' },
          503: { description: 'Dependencies degraded' },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register a new student account (Zero-enumeration timing equalized)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 10 },
                  name: { type: 'string' },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Registration request acknowledged' },
          400: { description: 'Validation error or common password' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate user with email and Argon2id password',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful or 2FA required' },
          401: { description: 'Invalid credentials' },
          429: { description: 'Brute-force lockout active' },
        },
      },
    },
    '/courses': {
      get: {
        summary: 'List published courses in public catalog',
        tags: ['Public Catalog'],
        responses: {
          200: {
            description: 'List of published courses with lesson count and duration',
          },
        },
      },
    },
    '/courses/{slug}': {
      get: {
        summary: 'Get course curriculum (Strict zero-leakage of paid video IDs)',
        tags: ['Public Catalog'],
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Course details and published curriculum' },
          404: { description: 'Course not found' },
        },
      },
    },
    '/admin/products': {
      get: {
        summary: 'List all products (Admin only, 2FA required)',
        tags: ['Admin Courses'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'All products including drafts' },
          403: { description: 'Admin or 2FA enrollment missing' },
        },
      },
      post: {
        summary: 'Create a new course product',
        tags: ['Admin Courses'],
        security: [{ BearerAuth: [] }],
        responses: {
          201: { description: 'Product created' },
        },
      },
    },
    '/admin/products/{id}/publish': {
      post: {
        summary: 'Publish course product to public catalog',
        tags: ['Admin Courses'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Product published' },
        },
      },
    },
    '/admin/lessons/{id}/upload-ticket': {
      post: {
        summary: 'Generate Bunny Stream TUS upload authorization ticket for direct browser upload',
        tags: ['Admin Video'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Direct TUS upload authorization ticket',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/UploadTicket' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/webhooks/bunny': {
      post: {
        summary: 'Bunny Stream encoding webhook endpoint (HMAC-SHA256 verified)',
        tags: ['Webhooks'],
        parameters: [
          {
            name: 'X-BunnyStream-Signature',
            in: 'header',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['VideoLibraryId', 'VideoGuid', 'Status'],
                properties: {
                  VideoLibraryId: { type: 'integer' },
                  VideoGuid: { type: 'string', format: 'uuid' },
                  Status: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Webhook processed' },
          401: { description: 'Invalid signature' },
        },
      },
    },
  },
};

export const docsRouter = Router();

// Serve raw OpenAPI JSON
docsRouter.get('/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(openApiSpec, null, 2));
});

// Serve interactive Swagger UI HTML
docsRouter.get('/', (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Hydraulic Academy API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.11.0/favicon-32x32.png" sizes="32x32" />
  <style>
    body { margin: 0; background: #0f172a; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { background: #ffffff; padding: 24px; border-radius: 8px; margin: 24px auto; max-width: 1200px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});
