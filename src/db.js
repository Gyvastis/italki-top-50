const Database = require('better-sqlite3');

let db;

module.exports = () => {
    if(!db){
        db = new Database('./sqlite.db', { verbose: console.log });
        process.on('exit', () => db.close());
    }

    return db;
};