const openDb = require('./db');

(async () => {
    const db = openDb();
    db.prepare('DROP TABLE IF EXISTS teachers').run();
    db.prepare('CREATE TABLE IF NOT EXISTS teachers (teacherId INTEGER, position INTEGER, lessons INTEGER, isPro INTEGER, isOnline INTEGER, rating FLOAT, createdAt TEXT);').run();
    db.prepare('CREATE INDEX idx_teachers_teacher ON teachers (teacherId)').run();
})();