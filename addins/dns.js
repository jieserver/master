const { logger } = require('../commons')
const $log = logger.DNS

function handler(){
    $log.info('launching')
}
module.exports = handler