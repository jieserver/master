const { logger } = require('../commons')
const $log = logger.Proxy

function handler(){
    $log.info('launching')
}
module.exports = handler