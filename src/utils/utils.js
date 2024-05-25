const bcrypt = require("bcryptjs");
const moment = require('moment');
const CaregiverUnavailability = require('../models/caregiver_unavailability.model.js');
const { Op, sequelize } = require('sequelize');
const Holiday = require("../models/holiday.model.js");
const ServiceCost = require("../models/services_cost.model.js");

function calculateTimeSlots(startTime, endTime) {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);

    const diffMinutes = Math.abs(end - start) / (1000 * 60);

    const numSlots = Math.ceil(diffMinutes / 30);
    const interval = diffMinutes / numSlots;

    return {
        interval: interval,
        numSlots: numSlots,
    };
}

async function calculatePrice(dateString, numberOfSlots, slots) {
    try {
        const holiday = await Holiday.findOne({
            where: {
                [Op.and]: [
                    { holiday_start_date: { [Op.lte]: dateString } },
                    { holiday_end_date: { [Op.gte]: dateString } }
                ]
            }
        });
        console.log(dateString, numberOfSlots, slots);

        if (holiday) {
            const price = await ServiceCost.findOne({ where: { type: "holiday" } });
            const totalPrice = numberOfSlots * price.price_perhour / 2;
            return { totalPrice: totalPrice, cargiver_rate: price.price_perhour };
        } else {
            const day = getDayFromDate(dateString);
            if (day === "Sunday") {
                const price = await ServiceCost.findOne({ where: { type: "sunday" } });
                const totalPrice = numberOfSlots * price.price_perhour / 2;
                return { totalPrice: totalPrice, cargiver_rate: price.price_perhour };
            } else if (day === "Saturday") {
                const price = await ServiceCost.findOne({ where: { type: "saturday" } });
                const totalPrice = numberOfSlots * price.price_perhour / 2;
                return { totalPrice: totalPrice, cargiver_rate: price.price_perhour };;
            } else {
                const totalPrice = await calculateStandardPrice(slots.start, slots.end);
                return totalPrice;
            }
        }
    }
    catch (error) {
        console.log(`Error generationg price ${error}`);
    }
}

async function calculateStandardPrice(bookingStart, bookingEnd) {
    const standardCost = await ServiceCost.findOne({ where: { type: "standard" } });
    const nonstandardeCost = await ServiceCost.findOne({ where: { type: "nonstandard" } });

    console.log(standardCost.start_time, standardCost.end_time);
    console.log(nonstandardeCost.start_time, nonstandardeCost.end_time);
    return;
}

function generateTimeSlots(startTime, endTime) {
    // const slots = [];
    // if (startTime === endTime) {
    //     return slots;
    // } else {

    //     const start = new Date(`2024-01-01T${startTime}`);
    //     const end = new Date(`2024-01-01T${endTime}`);
    //     const increment = 30 * 60 * 1000; // 30 minutes in milliseconds

    //     for (let time = start; time <= end; time.setTime(time.getTime() + increment)) {
    //         let formattedTime = time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    //         // Adjust midnight formatting
    //         if (formattedTime === '24:00') {
    //             formattedTime = '00:00';
    //         }
    //         if (formattedTime === '24:30') {
    //             formattedTime = '00:30';
    //         }
    //         slots.push(formattedTime);
    //     }
    //     return slots;
    // }

    const slots = [];

    if (startTime === endTime) {
        return slots;
    }

    const start = new Date(`2024-01-01T${startTime}`);
    let end = new Date(`2024-01-01T${endTime}`);
    const increment = 30 * 60 * 1000; // 30 minutes in milliseconds

    if (end < start) {
        // If end time is earlier than start time, adjust end time to next day
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
    }

    for (let time = start; time <= end; time.setTime(time.getTime() + increment)) {
        let formattedTime = time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        // Adjust midnight formatting
        if (formattedTime === '24:00') {
            formattedTime = '00:00';
        }
        if (formattedTime === '24:30') {
            formattedTime = '00:30';
        }
        slots.push(formattedTime);
    }

    return slots;
}
function generateRemainingSlots(avl_slots) {
    return allSlots.filter(slot => !avl_slots.includes(slot));
}
function getDayFromDate(dateString) {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIndex = date.getDay();
    return days[dayIndex];
}


function getAppointmentsSlots(appointments) {
    const bookedSlots = [];
    appointments.forEach(appointment => {
        const startTime = moment.utc(appointment.start_appointment);
        const endTime = moment.utc(appointment.end_appointment);
        const durationInMinutes = endTime.diff(startTime, 'minutes');
        const slots = durationInMinutes / 30;
        for (let i = 0; i < slots; i++) {
            const slotTime = startTime.clone().add(i * 30, 'minutes').format('HH:mm');
            bookedSlots.push(slotTime);
        }
    });
    return bookedSlots;
}

async function getUnavailableSlots(caregiverId, selectedDate) {
    try {
        const unavailabilities = await CaregiverUnavailability.findAll({
            where: {
                caregiver_id: caregiverId,
            }
        });
        const unavailableSlots = [];

        for (const unavailability of unavailabilities) {
            const startDate = unavailability.dataValues.start_date;
            const endDate = unavailability.dataValues.end_date;
            const formattedStartDate = startDate.toISOString().split('T')[0];
            const formattedEndDate = endDate.toISOString().split('T')[0];
            const startTime = startDate.toISOString().split('T')[1];
            const endTime = endDate.toISOString().split('T')[1];

            let startDateTime, endDateTime;

            if (formattedStartDate === selectedDate && formattedStartDate === formattedEndDate) {
                startDateTime = moment.utc(`2000-01-01T${startTime}`);
                endDateTime = moment.utc(`2000-01-01T${endTime}`);
                const duration = moment.duration(endDateTime.diff(startDateTime));
                const slots = duration.asMinutes() / 30;

                for (let i = 0; i < slots; i++) {
                    const slotStartTime = startDateTime.clone().add(i * 30, 'minutes').format('HH:mm');
                    unavailableSlots.push(slotStartTime);
                }
            } else if (formattedStartDate === selectedDate) {
                startDateTime = moment.utc(`2000-01-01T${startTime}`);
                endDateTime = moment.utc(`2000-01-01T24:00:00Z`);
                const duration = moment.duration(endDateTime.diff(startDateTime));
                const slots = duration.asMinutes() / 30;

                for (let i = 0; i < slots; i++) {
                    const slotStartTime = startDateTime.clone().add(i * 30, 'minutes').format('HH:mm');
                    unavailableSlots.push(slotStartTime);
                }
            } else if (formattedEndDate === selectedDate) {
                startDateTime = moment.utc(`2000-01-01T00:00:00Z`);
                endDateTime = moment.utc(`2000-01-01T${endTime}`);
                const duration = moment.duration(endDateTime.diff(startDateTime));
                const slots = duration.asMinutes() / 30;

                for (let i = 0; i < slots; i++) {
                    const slotStartTime = startDateTime.clone().add(i * 30, 'minutes').format('HH:mm');
                    unavailableSlots.push(slotStartTime);
                }
            } else if (isDateInRange(selectedDate, formattedStartDate, formattedEndDate)) {
                startDateTime = moment.utc(`2000-01-01T00:00:00Z`);
                endDateTime = moment.utc(`2000-01-01T24:00:00Z`);
                const duration = moment.duration(endDateTime.diff(startDateTime));
                const slots = duration.asMinutes() / 30;

                for (let i = 0; i < slots; i++) {
                    const slotStartTime = startDateTime.clone().add(i * 30, 'minutes').format('HH:mm');
                    unavailableSlots.push(slotStartTime);
                }
            }
        }

        return unavailableSlots;
    } catch (error) {
        console.log(`Error generating slots of unavailability------------------------- ${error}`);
        return [];
    }
}


function isDateInRange(date, startDate, endDate) {
    // Convert strings to Date objects
    date = new Date(date);
    startDate = new Date(startDate);
    endDate = new Date(endDate);

    // Check if the date is strictly between start and end date
    return date > startDate && date < endDate;
}
const allSlots = [
    '00:00', '00:30', '01:00',
    '01:30', '02:00', '02:30',
    '03:00', '03:30', '04:00',
    '04:30', '05:00', '05:30',
    '06:00', '06:30', '07:00',
    '07:30', '08:00', '08:30',
    '09:00', '09:30', '10:00',
    '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00',
    '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00',
    '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00',
    '19:30', '20:00', '20:30',
    '21:00', '21:30', '22:00',
    '22:30', '23:00', '23:30'
];


function generateAvailabilityStatus(caregiverAvailability, unavailability, unavailable_slots, bookedSlots, selectedDate) {
    const availabilityStatus = [];
    console.log("caregiverAvailability====================", caregiverAvailability);
    caregiverAvailability.forEach(slot => {
        const startTime = `${selectedDate} ${slot}`;
        const endTime = moment(startTime).add(30, 'minutes').format('YYYY-MM-DD HH:mm');
        const availability = !unavailability.includes(slot) && !bookedSlots.includes(slot) && !unavailable_slots.includes(slot);
        const status = availability ? "available" : "unavailable";

        availabilityStatus.push({
            start_date: startTime,
            end_date: endTime,
            availability: availability,
            status: status
        });
    });

    return availabilityStatus;
}

function getDatesInRange(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);

    // Loop through each date until endDate
    while (currentDate <= endDate) {
        dates.push(formatDate(currentDate)); // Push the formatted date into the array
        currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
    }

    return dates;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Add leading zero if needed
    const day = String(date.getDate()).padStart(2, '0'); // Add leading zero if needed
    return `${year}-${month}-${day}`;
}

function getTimeslots(startDate, endDate) {
    const timeslots = [];
    const startHour = startDate.getHours();
    const startMinute = startDate.getMinutes();
    const endHour = endDate.getHours();
    const endMinute = endDate.getMinutes();

    for (let hour = startHour; hour <= endHour; hour++) {
        let minutes = 0;
        while (minutes <= endMinute) {
            // Ensure consistent formatting using leading zeros
            timeslots.push(`${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
            minutes += 30;
        }
    }
    return timeslots;
}


const statusCode = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
}

function sendSuccessResponse(data) {
    return {
        data: data,
        status: "success",
    }
}

function sendErrorResponse(data) {
    return {
        data: data,
        status: "error",
    }
}

async function generateHash(str) {
    const bcryptSalt = bcrypt.genSaltSync(10);
    const strHash = await bcrypt.hash(str, Number(bcryptSalt));
    return strHash.toString();
}

function compareHash(str, hash) {
    return new Promise((resolve, reject) => {
        bcrypt.compare(str, hash, function (err, isMatch) {
            if (err) return reject(err);
            resolve(isMatch);
        });
    });
}

function slugify(title) {
    // Remove special characters and spaces
    const cleanedTitle = title
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .trim(); // Remove leading and trailing spaces

    // Convert to lowercase and replace spaces with dashes
    const slug = cleanedTitle
        .toLowerCase()
        .replace(/\s+/g, '-'); // Replace spaces with dashes

    return slug;
}

function extractFilePath(baseURL) {
    console.log('baseURL: ', baseURL);

    let url = baseURL; // eg: path/to/dummy/files/dummy_filename.png
    let ind1 = url.lastIndexOf('/');
    return {
        filepath: url.substring(0, ind1 + 1), // path/to/dummy/files/
        extension: url.substring(url.lastIndexOf('.') + 1, url.length), // .png
        name: (url.substring(url.lastIndexOf('/') + 1, url.length)).split('.').slice(0, -1).join('.'), //dummy_filename
        filename: url.substring(url.lastIndexOf('/') + 1, url.length), // dummy_filename.png
    }
}

function formatedDate(dateString) {
    const dateRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;
    const match = dateRegex.exec(dateString);
    if (!match) {
        throw new Error('Invalid date format. Date format should be YYYY-MM-DD HH:mm.');
    }

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    const hour = parseInt(match[4], 10);
    const minute = parseInt(match[5], 10);

    const formattedDate = [year, month, day].map(num => num < 10 ? '0' + num : num).join('-');
    const formattedTime = [hour, minute].map(num => num < 10 ? '0' + num : num).join(':');

    return { date: formattedDate, time: formattedTime }
}

// Example usage
const dateString = "2024-04-03 14:00";
console.log(formatedDate(dateString)); // Output: 2024-04-03 14:00

function getCurrentDate() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(currentDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}


// availability time format
// function formatTimeRange(slots) {
//     const uniqueSlots = slots.filter((slot, index) => index === 0 || slot !== slots[index - 1]);
//     const sortedSlots = uniqueSlots.sort();
//     let start = sortedSlots[0];
//     let end = sortedSlots[0];
//     let output = "";

//     for (let i = 1; i < sortedSlots.length; i++) {
//         const current = sortedSlots[i];
//         const currentHour = parseInt(current.split(':')[0]);
//         const currentMinute = parseInt(current.split(':')[1]);
//         const endHour = parseInt(end.split(':')[0]);
//         const endMinute = parseInt(end.split(':')[1]);

//         if ((currentHour === endHour && currentMinute - endMinute === 30) ||
//             (currentHour === endHour + 1 && currentMinute === 0 && endMinute === 30)) {
//             end = current;
//         } else {
//             if (start === "00:00" && end === "00:00") {
//                 output += "00:00 to 23:30";
//             } else {
//                 output += `${start} to ${end}`;
//             }
//             output += ", ";
//             start = current;
//             end = current;
//         }
//     }

//     if (start === "00:00" && end === "00:00") {
//         output += "00:00 to 23:30";
//     } else {
//         output += `${start} to ${end}`;
//     }

//     return output;
// }


function formatTimeRange(slots) {
    // Remove duplicates
    const uniqueSlots = slots.filter((slot, index) => index === 0 || slot !== slots[index - 1]);
    // Remove last element if it's "00:00"
    if (uniqueSlots.length > 0 && uniqueSlots[uniqueSlots.length - 1] === "00:00") {
        uniqueSlots.pop();
    }
    const sortedSlots = uniqueSlots.sort();
    let start = sortedSlots[0];
    let end = sortedSlots[0];
    let output = "";

    for (let i = 1; i < sortedSlots.length; i++) {
        const current = sortedSlots[i];
        const currentHour = parseInt(current.split(':')[0]);
        const currentMinute = parseInt(current.split(':')[1]);
        const endHour = parseInt(end.split(':')[0]);
        const endMinute = parseInt(end.split(':')[1]);

        if ((currentHour === endHour && currentMinute - endMinute === 30) ||
            (currentHour === endHour + 1 && currentMinute === 0 && endMinute === 30)) {
            end = current;
        } else {
            if (start === "00:00" && end === "00:00") {
                output += "00:00 to 23:30";
            } else {
                output += `${start} to ${end}`;
            }
            output += ", ";
            start = current;
            end = current;
        }
    }

    if (start === "00:00" && end === "00:00") {
        output += "00:00 to 23:30";
    } else {
        output += `${start} to ${end}`;
    }

    return output;
}

module.exports = {
    sendSuccessResponse,
    sendErrorResponse,
    generateHash,
    compareHash,
    slugify,
    extractFilePath,
    generateAvailabilityStatus,
    getDayFromDate,
    formatedDate,
    getAppointmentsSlots,
    getUnavailableSlots,
    getDatesInRange,
    getTimeslots,
    generateTimeSlots,
    calculatePrice,
    allSlots,
    calculateTimeSlots,
    generateRemainingSlots,
    getCurrentDate,
    formatTimeRange,
};
