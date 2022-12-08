import NodeApplication from './app';
import awsServerlessExpress = require('aws-serverless-express');
import awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');

console.log('Initializing app...');

const nodeApp = new NodeApplication();
nodeApp.init();

const app = nodeApp.getExpressApp();
app.use(awsServerlessExpressMiddleware.eventContext());

const binaryMimeTypes = [
  'application/octet-stream',
  'font/eot',
  'font/opentype',
  'font/otf',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'text/comma-separated-values',
];
const server = awsServerlessExpress.createServer(app, null, binaryMimeTypes);

exports.handler = (event, context) => {
  if (event.requestContext && event.requestContext.http){
    event.path =event.requestContext.http.path;
    event.httpMethod = event.requestContext.http.method;
  }
  if (event.requestContext && event.requestContext.stage) {
    event.path = event.path.replace('/' + event.requestContext.stage, '');
  }
  awsServerlessExpress.proxy(server, event, context);
}
