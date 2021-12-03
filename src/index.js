const fetch = require('node-fetch');
const Promise = require('bluebird');
const openDb = require('./db');

const FetchTeacherIds = (page) => fetch("https://api.italki.com/api/v2/teachers", {
    "headers": {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/json;charset=utf-8",
    },
    "referrer": "https://www.italki.com/",
    "body": `{\"teach_language\":{\"language\":\"ukrainian\"},\"page_size\":50,\"user_timezone\":\"Europe/Kiev\",\"page\":${page}}`,
    "method": "POST",
    "mode": "cors"
}).then(res => res.json()).then(({data}) => data.map(dataItem => dataItem.user_info.user_id));

const FetchTeacher = teacherId => fetch(`https://api.italki.com/api/v2/teacher/${teacherId}`, {
    "headers": {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0",
    },
    "method": "GET",
}).then(res => res.json()).then(({data}) => data);

const FetchSimpleSchedule = teachedId => fetch(`https://api.italki.com/api/v2/teacher/${teachedId}/simple_schedule?user_timezone=Europe/Kiev&closest_available_datetime_type=1`, {
    "headers": {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0",
    },
    "method": "GET",
}).then(res => res.json()).then(({data}) => data);

function date_diff_minutes(dateString) {
    const diff = Math.abs(new Date() - new Date(dateString));
    return Math.floor((diff/1000)/60);
}

(async () => {
    const topTeacherIds = [...await FetchTeacherIds(1), ...await FetchTeacherIds(2)];
    let teachers = [];

    await Promise.map(topTeacherIds, teacherId => FetchTeacher(teacherId).then(data => {
        teachers[topTeacherIds.indexOf(teacherId)] = {
            teacherId,
            name: data.user_info.nickname,
            trialPrice: parseInt(data.course_info.trial_price / 100),
            minPrice: parseInt(data.course_info.min_price / 100),
            position: topTeacherIds.indexOf(teacherId) + 1,
            isPro: data.user_info.is_pro,
            isNew: data.teacher_info.is_new,
            isOnline: date_diff_minutes(data.user_info.last_login_time) < 30 ? 1 : 0,
            instantNow: data.teacher_info.instant_now,
            lessons: data.teacher_info.session_count,
            students: data.teacher_info.student_count,
            rating: parseFloat(data.teacher_info.overall_rating),
        };
    }), {
        concurrency: 3,
    })

    await Promise.map(topTeacherIds, teacherId => FetchSimpleSchedule(teacherId).then(data => {
        teachers[topTeacherIds.indexOf(teacherId)].availabilityHours = data.available_schedule.map(schedule => schedule.reduce(function (a, b) {
            return a + b;
        }, 0)).reduce(function (a, b) {
            return a + b;
        }, 0);
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
    const teachersInsert = db.prepare('INSERT INTO teachers (teacherId, position, trialPrice, minPrice, instantNow, lessons, students, rating, availabilityHours, isPro, isNew, isOnline, createdAt) VALUES (:teacherId, :position, :trialPrice, :minPrice, :instantNow, :lessons, :students, :rating, :availabilityHours, :isPro, :isNew, :isOnline, :createdAt)');
    insertMany(teachersInsert, teachers.map(teacher => ({
        ...teacher,
        createdAt: date.toISOString(),
    })));
})();