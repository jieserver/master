const { logger,saveConfig } = require('../commons')
const cfg = require('../config').cule
const $log = logger.Cule

const path = require('path')
const _ = require('lodash')
const Forever = require('forever-monitor').Monitor

function handler(){
    $log.info('launching')
    var cules = _.map(cfg.forks,(p,k)=>{
        var i = 0
        p.sourceDir = path.resolve(p.sourceDir)
        var cule = new Forever('index.js',p)
        cule.on('watch:restart',e=>$log.warn(k,'restart'))
        cule.on('message',m=>$log.debug('get:',k,m,++i))
        cule.start()
        p.pid = cule.child.pid
        return cule
    })
    //外部中断
    process.on('SIGINT',e=>{
        $log.debug('SIGINT','kill all')
        cules.forEach(ch=>ch.stop())
    })
    //自动退出
    process.on('exit',e=>{
        $log.debug('exit','kill all')
        cules.forEach(ch=>ch.stop())
    })
}
module.exports = handler