const { logger } = require('./commons')

var fs = require('fs')
var cluster = require('cluster')
var _ = require('lodash')
const configs = require('./config')
var {workerNum,excludeAddins} = configs.main
const { fork,spawn } = require('child_process') 

if (cluster.isMaster) {
    logger.Master.info(`Master ${process.pid} is running`);
    //cluster.setupMaster({ silent: true })

    // if(!process.argv[2]){
    //     spawn('node',[__filename,'master'],{detached: true,stdio: 'ignore'}).unref()
    //     //process.exit(1)
    // }
      
    // Fork workers.
    for (let i = 0; i < workerNum; i++) {
        (function circle(){
            return cluster.fork().on('exit',circle)
        })()
    }
  
    cluster.on('exit', (worker, code, signal) => {
        logger.Master.warn(`PID:${worker.process.pid} died`);
    });
    process.on('SIGINT', () => {
        Object.keys(cluster.workers).forEach(k=>{
            cluster.workers[k].kill()
        })
        setTimeout(e=>process.exit(1),100)
    });
  } else {
    function depRun(rq,excl){
        if(_.includes(excl,rq)) return
        var Addin = require('./addins/'+rq)
        if(Addin.running) return Addin.running
        if(!Addin.dependence) return Addin.running = new Addin()
        var dep = depRun(Addin.dependence,excl)
        if(dep) return  Addin.running = new Addin(dep) 
    }
    //load addins
    var addins = fs.readdirSync('./addins')
    addins.forEach(md=>{
        try{
            depRun(md,excludeAddins)
        }catch(error){
            logger.Worker.error(md,error)
        }
    })

    //watching addins forlder,exit process wait 1s
    setTimeout(e=>{
        var ch = require('chokidar').watch(['./addins','./config'],{ignoreInitial:true,interval:1000})
        ch.on('all',_.debounce((e,d)=>{
            logger.Worker.info(e,d)
            process.exit(1)
        },1000))
    },1000)

    logger.Worker.info(`PID:${process.pid} started`);
  }
