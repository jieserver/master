let dgram = require('dgram');
let server = dgram.createSocket('udp4');
server.on('error', (err) => {   
  console.log(`server error:\n${err.stack}`);
  server.close();
});
server.on('message', (msg, rinfo) => {    
  console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
});
server.on('listening', () => {    
  var address = server.address();    
  console.log(`server listening ${address.address}:${address.port}`);
});
server.bind({port:9000,exclusive:true});