const util = require('util')
const mysql = require('mysql')
const pool = mysql.createPool({
    host: 'localhost',
    user: 'huayhub',
    password: 'Oa0c4!g8',
    database: 'huayhub'
})

pool.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed.')
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has too many connections.')
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Database connection was refused.')
        }
    }

    if (connection) connection.release()

    return
})

pool.query = util.promisify(pool.query)

module.exports = pool