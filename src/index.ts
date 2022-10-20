import NodeApplication from './app';
import { AddressInfo } from 'net';

require('dotenv').config();

console.log('Initializing app...');

const nodeApp = new NodeApplication();
nodeApp.init();

const app = nodeApp.getExpressApp();

var server = app.listen(process.env.PORT || 3001, () => {
  const { port } = server.address() as AddressInfo;
  console.log(`Express server listening on http://localhost:${port}`);
});
