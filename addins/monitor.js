var {logger} = require('../commons')
var path = require('path')
var $log = logger.Monitor

function handler(){
    setInterval(o=>{
        $log.debug('pid:',process.pid,'memory:',process.memoryUsage().rss/(1024),'cpu:',process.cpuUsage().user)
    },1000)
}

module.exports = handler