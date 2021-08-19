(async () => {
    const db = require('./db')();

    const row = db.prepare('SELECT * FROM teachers').get();
    console.log(row)
})();