const log4js = require('log4js')
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const crypto = require('crypto')
const {Readable} = require('stream')
const axios = require('axios')
const dgram = require('dgram')
const _ = require('lodash')

const cfgFile = path.resolve('config')
var configs = require(cfgFile)
var origConfigs = _.cloneDeep(configs)

log4js.configure(configs.log4js)
const logger = new Proxy({},{ get:(t,k,r)=>log4js.getLogger(k) })

module.exports = {
    configs,
    log4js,
    logger,
    saveConfig(){
        !_.isEqual(configs,origConfigs) &&
        fs.writeFileSync(cfgFile,'module.exports = ' + JSON.stringify(configs, null, 2))
    },
    ipDisc(){
        return new Promise((res,rej)=>{
            const udp = dgram.createSocket('udp4')
            const port = 9999+Math.random()*55536|0
            udp.on('message',(e,i)=>udp.close(c=>res(i.address)))
            .bind({port,exclusive:true},e=>{
                udp.setBroadcast(true);
                udp.send('e',port,'255.255.255.255')
            })
        })
    },
    md5(data){
        var hash = crypto.createHash('md5')
        if(data instanceof Readable){
            return new Promise((res,rej)=>{
                data.on('data',d=>hash.update(d))
                .on('end',d=>res(hash.digest('hex')))
            })
        }else{
            hash.update(data)
            return Promise.resolve(hash.digest('hex'))
        }
    },
    packgz(folder,packFile,useZip,withRoot){
        function eachFile(fd,rd,fjson){
            fjson = fjson || {};
            rd && (fjson[rd] = -1);
            var files = fs.readdirSync(fd);
            for(var file of files){
                var filePath = path.join(fd,file);
                var stat = fs.statSync(filePath);
                var k = path.join(rd || '',file);
                if(stat.isDirectory()) eachFile(filePath,k,fjson);
                if(stat.isFile()) fjson[k] = stat.size;
            }
            return fjson;
        }
        var basename = path.basename(folder);
        var dirname = path.dirname(folder);
        var filesInfo = eachFile(folder,withRoot ? basename : null);
    
        var headString = JSON.stringify(filesInfo);
        var size = headString.length;
        var buff = Buffer.alloc(57 + size,' ');
        buff.write(size.toString());
        buff.write(headString,57);
        fs.writeFileSync(packFile,buff);
        var rw = new Promise((res)=>process.nextTick(res));
        for(var f in filesInfo){
            if(filesInfo[f] > 0){
                ((cf)=> rw = rw.then((r)=>new Promise((res,rej)=>fs.createReadStream(path.join(withRoot ? dirname : folder,cf)).pipe(fs.createWriteStream(packFile,{flags:'a'}).on('finish',res).on('error',rej))))
                )(f);
            }
        }
        return useZip ? rw.then(()=>new Promise((res,rej)=>fs.createReadStream(packFile).pipe(zlib.createGzip()).pipe(fs.createWriteStream(packFile+'.gz').on('finish',res).on('error',rej)))) : rw;
    },
    unpackgz(p,d,z){
        fs.existsSync(d) || fs.mkdirSync(d);
        var rdFix = '.guz'+(100000*Math.random()|0);
        var rw = z ? new Promise((res,rej)=>{ fs.createReadStream(p).pipe(zlib.createGunzip()).pipe(fs.createWriteStream(p+=rdFix).on('finish',res).on('error',rej))})
                    : new Promise((res,rej)=>{ fs.createReadStream(p).pipe(fs.createWriteStream(p+=rdFix).on('finish',res).on('error',rej))});
        return rw.then(()=>{
            var fd = fs.openSync(p,'r');
            function rb(s){ var r = Buffer.alloc(s);fs.readSync(fd,r,0,s);return r;}
            var s = parseInt(rb(57));
            var h = JSON.parse(rb(s).toString());
            for(var f in h){
                var fp = path.join(d,f);
                h[f] == -1 ? (fs.existsSync(fp) || fs.mkdirSync(fp)) : fs.writeFileSync(fp,rb(h[f]));
            }
            fs.closeSync(fd);
            fs.unlinkSync(p);
        });
    },
    wallhaven(){
        var i = 0
        var urlThumb = 'https://alpha.wallhaven.cc/wallpapers/thumb/small/th'
        var urlFull = 'https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven'
        function gg(res,rej){
            var thumb,mid = 690900 * Math.random()|0,thUrl = `${urlThumb}-${mid}.jpg`
            return axios.get(thUrl,{ responseType:'arraybuffer',time:3000 })
            .then(r=>{
                thumb = r.data
                return axios.get(`${urlFull}-${mid}.jpg`,{ responseType:'arraybuffer',time:30000 })
                    .catch(e=>axios.get(`${urlFull}-${mid}.png`,{ responseType:'arraybuffer',time:30000 }))
            }).then(r=>{
                res({
                    full:r.data,
                    thumb,
                    urls:[r.config.url,thUrl],
                    type:r.headers['content-type']
                })
            }).catch(e=>{
                ++i>10 ? rej(e) : gg(res,rej)
            })
        }
        return new Promise(gg);
    }
}

Object.defineProperty(global, '__stack', {
    get: function(){
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack){ return stack; };
        var err = new Error;
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
    }
});
Object.defineProperty(global, '__fline', {
    get: function(){
        return `\n${__stack[1].getFileName()}:${__stack[1].getLineNumber()}`
    }
})