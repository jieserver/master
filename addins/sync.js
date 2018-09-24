/**
 * sync status between two or more masters
 * Message is stored in the Sync.payload
 */
var fs = require('fs')
var path = require('path')
var axios = require('axios')
var _ = require('lodash')
var Express = require('express')

var {logger,md5,packgz,unpackgz,saveConfig,ipDisc} = require('../commons')
var { port,interval,payload} = require('../config').sync
var lastSend = null
const $log = logger.Sync 

const tempPath = './temp/addins.pkg'

function handler(dep){
    $log.info('launching')
    dep.app.use('/addins.pkg',Express.static('./tmep/addins.pkg'))

    packgz('./addins',tempPath,false).then(r=>{
        return md5(fs.createReadStream(tempPath))
    }).then(r=>{
        if(r == payload.addinsMD5) return
        payload.addinsMD5 = r
    }).then(e=>ipDisc())
    .then(addr=>{
        payload.baseUrl = `http://${addr}:${dep.port}`
        saveConfig()
    })
    
    var udp = require('dgram').createSocket('udp4')
    udp.on('message',(d,i)=>{
        var msg = JSON.parse(d.toString())
        if(msg.addinsMD5 && payload.addinsMD5 != msg.addinsMD5){
            axios(`${msg.baseUrl}/addins.pkg`,{responseType:'stream'})
            .then(res=>{
                return new Promise((s,j)=>res.data.pipe(fs.createWriteStream(tempPath)).on('finish',s))
            }).then(res=>{
                unpackgz(tempPath,'./addins')
            }).catch(e=>$log.error(e))
        }
    }).bind({port,exclusive:true},e=>{
        udp.setBroadcast(true)
        setInterval($=>{
            if(_.isEqual(lastSend,payload)) return;
            $log.info('payload:',payload)
            udp.send(JSON.stringify(payload),port,'255.255.255.255')
            lastSend = _.cloneDeep(payload)
        },interval)
    })
    handler.prototype.broadcast = (msg)=>{
        udp.send(JSON.stringify(msg),port,'255.255.255.255')
    }
}
handler.dependence = 'httpServer.js'
module.exports = handler
