const moment = require('moment');

function secondsToTime(seconds) {
    const duration = moment.duration(seconds, 'seconds');
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();

    // Format the time as "h:mm"
    const formattedTime = moment({ hour: hours, minute: minutes }).format('h:mm');

    return formattedTime;
}

// calculate Age from DOB
function calculateAge(dateOfBirth) {
    const today = moment();
    const birthDate = moment(dateOfBirth, 'YYYY-MM-DD');
    return today.diff(birthDate, 'years');
}

// calculate Time difference from two different parameters
function calculateTimeDifference(startDateTime, endDateTime) {
    const startDate = moment(startDateTime);
    const endDate = moment(endDateTime);

    // Calculate the time difference in milliseconds
    const timeDifferenceMs = endDate.diff(startDate);

    // Convert milliseconds to hours
    const timeDifferenceHours = moment.duration(timeDifferenceMs).asSeconds();

    return secondsToTime(timeDifferenceHours);
}

function timeDifference(startDateTime, endDateTime) {
    const startDate = moment(startDateTime);
    const endDate = moment(endDateTime);

    // Calculate the time difference in milliseconds
    const timeDifferenceMs = endDate.diff(startDate);

    // Convert milliseconds to hours
    const timeDifferenceHours = moment.duration(timeDifferenceMs).asHours();

    return timeDifferenceHours;
}

// find date only from date and time
function extractDateWithMoment(dateString) {
    // Parse the date string using moment
    const parsedDate = moment.utc(dateString, 'YYYY-MM-DD HH:mm');

    // Format the date in "YYYY-MM-DD" format
    const extractedDate = parsedDate.format('YYYY-MM-DD');

    return extractedDate;
}

function getNext7Days() {
    const dates = [];

    for (let i = 0; i < 7; i++) {
        const currentDate = moment().add(i, 'days');
        const formattedDate = currentDate.format('DD/MM/YYYY');
        const dayName = currentDate.format('ddd').toLowerCase(); // 'dddd' gives the full day name

        dates.push({
            date: formattedDate,
            day: dayName
        });
    }

    return dates;
}

module.exports = {
    calculateAge,
    calculateTimeDifference,
    timeDifference,
    extractDateWithMoment
}