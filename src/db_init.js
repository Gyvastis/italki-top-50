const openDb = require('./db');

(async () => {
    const db = openDb();
    db.prepare('DROP TABLE IF EXISTS teachers').run();
    db.prepare('CREATE TABLE IF NOT EXISTS teachers (teacherId INTEGER, position INTEGER, instantNow INTEGER, lessons INTEGER, students INTEGER, trialPrice INTEGER, minPrice INTEGER, isPro INTEGER, isNew INTEGER, isOnline INTEGER, rating REAL, availabilityHours INTEGER, createdAt TEXT);').run();
    db.prepare('CREATE INDEX idx_teachers_teacher ON teachers (teacherId)').run();
})();