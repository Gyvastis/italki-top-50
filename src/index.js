const fetch = require('node-fetch');
const Promise = require('bluebird');
const openDb = require('./db');

const FetchTeacherIds = () => fetch("https://api.italki.com/api/v2/teachers", {
    "headers": {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/json;charset=utf-8",
    },
    "referrer": "https://www.italki.com/",
    "body": "{\"teach_language\":{\"language\":\"ukrainian\"},\"page_size\":30,\"user_timezone\":\"Europe/Kiev\",\"page\":1}",
    "method": "POST",
    "mode": "cors"
}).then(res => res.json()).then(({data}) => data.map(dataItem => dataItem.user_info.user_id));

const FetchTeacher = teacherId => fetch(`https://api.italki.com/api/v2/teacher/${teacherId}`, {
    "headers": {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0",
    },
    "method": "GET",
}).then(res => res.json()).then(({data}) => data);

(async () => {
    const topTeacherIds = await FetchTeacherIds(); 
    let teachers = [];

    await Promise.map(topTeacherIds, teacherId => FetchTeacher(teacherId).then(data => {
        teachers.push({
            teacherId,
            name: data.user_info.nickname,
            minPrice: data.course_info.min_price / 100,
            position: topTeacherIds.indexOf(teacherId) + 1,
            lessons: data.teacher_statistics.finished_session,
            isPro: data.user_info.is_pro,
            isOnline: data.user_info.is_online,
            rating: data.teacher_info.overall_rating,
        });
    }), {
        concurrency: 3,
    })

    teachers = teachers.sort(function(x, y) {
        if (x.position < y.position) {
            return -1;
        }
        if (x.position > y.position) {
            return 1;
        }

        return 0;
    });

    console.log(teachers, Object.keys(teachers).length, topTeacherIds.indexOf(9185087) + 1);

    const db = openDb();
    const insertMany = db.transaction((stmt, items) => {
        for (const item of items) stmt.run(item);
    });

    const date = new Date();
    date.setSeconds(0);
    date.setMilliseconds(0);
    const teachersInsert = db.prepare('INSERT INTO teachers (teacherId, position, lessons, isPro, isOnline, createdAt) VALUES (:teacherId, :position, :lessons, :isPro, :isOnline, :createdAt)');
    insertMany(teachersInsert, teachers.map(teacher => ({
        ...teacher,
        createdAt: date.toISOString(),
    })));
})();