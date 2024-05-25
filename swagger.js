const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'care-dac',
        description: 'This is API documentation of Care-dac Project',
    },
    host: '13.236.182.225:8000/api/v1',
    // host: 'localhost:8000/api/v1',
    securityDefinitions: {
        ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'Authorization',
        },
    },
    security: [
        {
            ApiKeyAuth: [],
        },
    ],
};

const documentationFile = './swagger-documentation.json';
const routes = ['./src/routes/index.routes.js'];

swaggerAutogen(documentationFile, routes, doc);
