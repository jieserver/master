var Express = require('express')
var path = require('path')
var fs = require('fs')
var _ = require('lodash')
var log4js = require('log4js')

var {logger,wallhaven} = require('../commons')
const { port,static } = require('../config').httpServer
const $log = logger.HttpServer

var app = new Express()

Object.keys(static).forEach(k=>{
    app.use(k,Express.static(path.resolve(static[k])))
})
app.use(log4js.connectLogger($log))
.use('/npmsrc/\*.js',(req,res)=>res.end(fs.readFileSync(require.resolve(req.params[0]))))
.use('/markdown/*',(req,res)=>{
    res.end(`setTimeout(e=>document.getElementById('content').innerHTML = 
        marked(\`${fs.readFileSync(path.resolve(req.params[0]))}\`),500)`)
})
.use('/mm',(req,res)=>wallhaven().then(d=>res.append('name',_.last(d.urls[0].split('/'))).end(d.full)))
.use('/restart',(req,res)=>{
    res.end('ok')
    setTimeout(() => {
        process.exit(1)
    }, 500);
})
function handler(){
    $log.info('launching at:',port)
    handler.prototype.app = app
    handler.prototype.http = app.listen(port)
    handler.prototype.port = port
}

module.exports = handler