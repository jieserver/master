let cluster = require('cluster');
if (cluster.isMaster) {
    // Here is in master process
    let cpus = require('os').cpus().length;
    console.log(`Master PID: ${process.pid}, CPUs: ${cpus}`); 
    // Fork workers.    
    for (var i = 0; i < cpus; i++) {
        var worker = cluster.fork();
        worker.on('error',e=>console.log(e))
    }    
    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`); 
    });
    cluster.on('error',e=>console.log(e))
} else { 
    // Here is in Worker process
    console.log(`Worker PID: ${process.pid}`);
    //require('./tcpapp.js');
    require('./udpapp.js'); //uncomment if you need a udp server
}
