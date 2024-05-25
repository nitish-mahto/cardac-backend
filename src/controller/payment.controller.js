const Config = require('../config/config');
const User = require('../models/user.model');
const Payment = require('../models/payment.model');
const AppointmentBooking = require('../models/appointment_booking.model');
const stripe = require('stripe')(Config.STRIPE_SECRET_KEY);
const apiVersion = Config.API_VERSION;
const sendEmail = require('../utils/sendEmail');
const CaregiverDetails = require('../models/caregiver_details.model');
const PatientMember = require('../models/patient_member.model');
const { calculateTimeDifference, extractDateWithMoment, timeDifference } = require('../utils/date.utils');
const CareGiverDetails = require('../models/caregiver_details.model');
const CaregiverAvailability = require('../models/caregiver_availability.model');
const PaymentHistory = require('../models/payment_history.model');
const FeedbackSummary = require('../models/feedback_summary.model');
const { Op } = require('sequelize');
const moment = require('moment');
const Feedback = require('../models/feedback.model');

// get publishable key
async function getPublishableKey(req, res) {
    try {
        const userId = req.userId;
        // check Authorized or Unauthorized
        let user = await User.findOne({ where: { id: userId } });
        if (!user) return res.status(404).json({ status: 'error', message: 'Unauthorized User.' });

        // return final resposne
        return res.status(200).json({
            status: 'success',
            message: 'Stripe secret key',
            publishableKey: Config.STRIPE_PUBLISHABLE_KEY
        });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// payment intent
async function paymentIntent(req, res) {
    try {

        let userId = req.userId;

        // check user exist or not
        let user = await User.findOne({ where: { id: userId } });
        if (!user) return res.status(404).json({ status: 'error', message: 'User does not exist.' });

        // check user exist in stripe or not
        let stripeData = await Payment.findOne({ where: { user_id: userId } });
        if (!stripeData) return res.status(404).json({ status: 'error', message: `User's details does not exist in stripe.` });
        // user's customer id 
        const customer_id = stripeData.customer_id;

        const { caregiverId, start_appointment, end_appointment, booking_for, memberId, standard_cost, nonstandard_cost, total_cost } = req.body;

        // let caregiverExist = await CaregiverDetails.findOne({ where: { user_id: caregiverId } })
        let caregiverExist = await User.findOne({ where: { id: caregiverId, role: 'caregiver' } })

        // if not exist then
        if (!caregiverExist) {
            return res.status(404).json({ status: 'error', message: 'Appointment book only on caregiver' });
        }

        if (caregiverExist && caregiverExist.account_status == 'deleted') {
            return res.status(403).json({ status: 'error', message: 'Selected caregiver is inactive' });
        }

        if (caregiverExist && caregiverExist.account_status == 'suspend') {
            return res.status(403).json({ status: 'error', message: 'Selected caregiver is suspended' });
        }

        // find date from date object
        const startDate = extractDateWithMoment(start_appointment);
        const endDate = extractDateWithMoment(end_appointment);

        // check appointment booking date is same 
        if (startDate !== endDate) return res.status(403).json({ status: 'error', message: `Appointment can't be booked for multiple days` });

        // validate start_appointment must be greater than end_appointment
        if (start_appointment >= end_appointment) return res.status(403).json({ status: 'error', message: 'Start appointment must be greater than end appointment' });

        // if appointment book for member then store 
        if (booking_for !== 'self') {
            userId = memberId;

            // check memberId is valid id or not(check member details form userId --> memberId)
            let memberExist = await PatientMember.findOne({ where: { id: userId } })

            // if member not exist then
            if (!memberExist) {
                return res.status(404).json({ status: 'error', message: 'Member does not exist.' });
            }
        }

        // calculate dime difference
        const totalHours = calculateTimeDifference(start_appointment, end_appointment);

        const ephemeralKey = await stripe.ephemeralKeys.create(
            { customer: customer_id },
            { apiVersion }
        );

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Number((total_cost * 100).toFixed(2)),
            currency: "usd",
            customer: customer_id,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                user_id: userId,
                booked_by: req.userId,
                caregiver_id: caregiverId,
                start_appointment: start_appointment,
                end_appointment: end_appointment,
                total_hours: totalHours,
                total_cost: total_cost,
                booking_for: booking_for,
                memberId: memberId,
                standard_cost: standard_cost,
                nonstandard_cost: nonstandard_cost,
            },
        });

        // req.session.metadata = paymentIntent.metadata;

        res.json({
            paymentIntent: paymentIntent.client_secret,
            ephemeralKey: ephemeralKey.secret,
            customer: customer_id,
        });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Confirm Payment Intent
async function createCheckoutSession(req, res) {
    try {
        let userId = req.userId;

        // check user exist or not
        let user = await User.findOne({ where: { id: userId } });
        if (!user) return res.status(404).json({ status: 'error', message: 'User does not exist.' });

        // check user exist in stripe or not
        let stripeData = await Payment.findOne({ where: { user_id: userId } });
        if (!stripeData) return res.status(404).json({ status: 'error', message: `User's details does not exist in stripe.` });
        // user's customer id 
        const customer_id = stripeData.customer_id;

        const { caregiverId, start_appointment, end_appointment, booking_for, memberId, standard_cost, nonstandard_cost, total_cost } = req.body;

        // let caregiverExist = await CaregiverDetails.findOne({ where: { user_id: caregiverId } })
        let caregiverExist = await User.findOne({ where: { id: caregiverId, role: 'caregiver' } })

        // if not exist then
        if (!caregiverExist) {
            return res.status(404).json({ status: 'error', message: 'Appointment book only on caregiver' });
        }

        if (caregiverExist && caregiverExist.account_status == 'deleted') {
            return res.status(403).json({ status: 'error', message: 'Selected caregiver is inactive' });
        }

        if (caregiverExist && caregiverExist.account_status == 'suspend') {
            return res.status(403).json({ status: 'error', message: 'Selected caregiver is suspended' });
        }

        // find date from date object
        const startDate = extractDateWithMoment(start_appointment);
        const endDate = extractDateWithMoment(end_appointment);

        // check appointment booking date is same 
        if (startDate !== endDate) return res.status(403).json({ status: 'error', message: `Appointment can't be booked for multiple days` });

        // validate start_appointment must be greater than end_appointment
        if (start_appointment >= end_appointment) return res.status(403).json({ status: 'error', message: 'Start appointment must be greater than end appointment' });

        // if appointment book for member then store 
        if (booking_for !== 'self') {
            userId = memberId;

            // check memberId is valid id or not(check member details form userId --> memberId)
            let memberExist = await PatientMember.findOne({ where: { id: userId } })

            // if member not exist then
            if (!memberExist) {
                return res.status(404).json({ status: 'error', message: 'Member does not exist.' });
            }
        }

        // calculate dime difference        
        const totalHours = calculateTimeDifference(start_appointment, end_appointment);

        const product = await stripe.products.create({
            name: 'App',
            description: 'Services cost',
        });

        const price = await stripe.prices.create({
            unit_amount: Number((total_cost * 100).toFixed(2)),
            currency: 'usd',
            product: product.id,
        });

        const data = {
            payment_method_types: ['card'],
            line_items: [
                {
                    price: price.id,
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: Config.SUCCESS_URL,
            cancel_url: Config.CANCEL_URL,
            customer: customer_id,

            payment_intent_data: {
                metadata: {
                    user_id: userId,
                    booked_by: req.userId,
                    caregiver_id: caregiverId,
                    start_appointment: start_appointment,
                    end_appointment: end_appointment,
                    total_hours: totalHours,
                    total_cost: total_cost,
                    booking_for: booking_for,
                    memberId: memberId,
                    standard_cost: standard_cost,
                    nonstandard_cost: nonstandard_cost,
                },
            }
        };

        const session = await stripe.checkout.sessions.create(data);

        return res.status(200).json({
            status: 'success',
            message: 'Checkout session created successfully',
            id: session.id,
            session,
        });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// const endpointSecret = "whsec_ggvnxReoZ36y0Mg40DgAtzlL6eSrOexZ";
const endpointSecret = "whsec_G89NrY4itjokIGSmtHKfcLveWRPgDiYq";

// webhook
const webhook = async (request, response) => {
    const sig = request.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Handle the event
    switch (event.type) {
        case 'charge.failed':
            const chargeFailed = event.data.object;
            break;
        case 'charge.pending':
            const chargePending = event.data.object;
            break;
        case 'charge.succeeded':
            const chargeSucceeded = event.data.object;
            let caregiverId = chargeSucceeded.metadata.caregiver_id;
            let caregiverExist = await CareGiverDetails.findOne({ where: { user_id: caregiverId } });
            if (!caregiverExist) {
                break;
            }

            let userId = chargeSucceeded.metadata.user_id;
            let bookedId = chargeSucceeded.metadata.booked_by;

            if (!userId) {
                break;
            }
            const { start_appointment, end_appointment, booking_for, memberId, standard_cost, nonstandard_cost, total_cost } = chargeSucceeded.metadata;

            // find date from date object
            const startDate = extractDateWithMoment(start_appointment);
            const endDate = extractDateWithMoment(end_appointment);

            // check appointment booking date is same 
            if (startDate !== endDate) {
                break;
            }
            // validate start_appointment must be greater than end_appointment
            if (start_appointment >= end_appointment) {
                break;
            }

            // if appointment book for member then store 
            if (booking_for !== 'self') {
                userId = memberId;

                // check memberId is valid id or not(check member details form userId --> memberId)
                let memberExist = await PatientMember.findOne({ where: { id: userId } })

                // if member not exist then
                if (!memberExist) {
                    break;
                }
            }

            // calculate dime difference
            const totalHours = calculateTimeDifference(start_appointment, end_appointment);

            const newAppointmentBooking = await AppointmentBooking.create({
                user_id: userId,
                booked_by: bookedId || userId,
                caregiver_id: caregiverId,
                start_appointment,
                end_appointment,
                total_hours: totalHours,
                total_cost,
                booking_for,
                standard_cost,
                nonstandard_cost,
            });

            let appointmentBooking_id = newAppointmentBooking.id;
            await AppointmentBooking.update({ payment_status: 'succeeded' }, { where: { id: appointmentBooking_id } });


            await PaymentHistory.create({
                user_id: userId,
                appointment_id: appointmentBooking_id,
                payment_id: chargeSucceeded.payment_intent,
                transcation_id: chargeSucceeded.id,
                amount: total_cost,
                card_type: chargeSucceeded.payment_method_details.card.brand,
                currency: chargeSucceeded.currency,
                payment_response: JSON.stringify(chargeSucceeded),
                payment_status: "succeeded",
            })

            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    response.send();
};


/********************************************** PAYMENT RELATED APIS ************************************************ */

// my payments list  ----------> patient
async function myPayments(req, res) {
    try {
        let userId = req.userId;

        const { start_appointment, end_appointment, booking_status, page = 1, limit = 10 } = req.query;

        let whereClause = {
            booked_by: userId
        };

        if (start_appointment && end_appointment) {
            // Validate date format
            const isValidStartDate = moment(start_appointment, 'YYYY-MM-DD', true).isValid();
            const isValidEndDate = moment(end_appointment, 'YYYY-MM-DD', true).isValid();

            if (!isValidStartDate || !isValidEndDate) {
                return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.' });
            }

            // Validate end_appointment is greater than start_appointment
            if (moment(end_appointment).isBefore(start_appointment)) {
                return res.status(400).json({ error: 'end_appointment must be greater than start_appointment.' });
            }

            whereClause.created_at = {
                [Op.gte]: start_appointment,
                [Op.lt]: moment(end_appointment).add(1, 'day').format('YYYY-MM-DD')
            };
        } else if (start_appointment) {
            // If only start_date is provided, fetch data from start_appointment to current_date
            const isValidStartDate = moment(start_appointment, 'YYYY-MM-DD', true).isValid();

            if (!isValidStartDate) {
                return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.' });
            }

            whereClause.created_at = {
                [Op.gte]: start_appointment
            };
        }

        // Add status filter if selected
        if (booking_status) {
            whereClause.booking_status = booking_status.toLowerCase();
        }

        whereClause.payment_status = 'succeeded';
        // whereClause.payment_status = 'success';

        const { count, rows: bookingData } = await AppointmentBooking.findAndCountAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit, 10),
            offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        });

        const userIds = bookingData.map(booking => booking.user_id);
        const memberIds = bookingData.map(booking => booking.user_id);
        const caregiverIds = bookingData.map(booking => booking.caregiver_id);

        const [users, caregivers, caregiverDetails, members, feedbackSummaries] = await Promise.all([
            User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'full_name', 'profile_image', 'dob', 'age', 'gender', 'mobile_number', 'emergency_mobile_number', 'account_status'] }),
            User.findAll({ where: { id: { [Op.in]: caregiverIds } }, attributes: ['id', 'full_name', 'profile_image', 'dob', 'age', 'mobile_number', 'emergency_mobile_number', 'account_status'] }),
            CareGiverDetails.findAll({ where: { user_id: { [Op.in]: caregiverIds } }, attributes: ['user_id', 'services_cost'] }),
            PatientMember.findAll({ where: { id: { [Op.in]: memberIds } }, attributes: ['id', 'full_name', 'dob', 'age', 'gender'] }),
            FeedbackSummary.findAll({ where: { caregiver_id: { [Op.in]: caregiverIds } }, attributes: ['id', 'caregiver_id', 'average_rates', 'total_rates', 'total_feedback'] }),
        ]);

        const transformedData = await Promise.all(bookingData.map(async (booking) => {
            // const user = users.find(user => user.id === booking.user_id);
            const user = (booking.booking_for === 'self' || booking.booking_for === 'member') ?
                users.find(u => u.id === booking.booked_by) :
                null;
            const caregiver = caregivers.find(caregiver => caregiver.id === booking.caregiver_id);
            const memberData = members.find(member => member.id === booking.user_id);
            const feedbackData = feedbackSummaries.find(feedback => feedback.caregiver_id === booking.caregiver_id);
            const caregiverDetail = caregiverDetails.find(detail => detail.user_id === booking.caregiver_id);

            return {
                id: booking.id,
                user_id: booking.user_id,
                patient_full_name: user?.full_name || null,
                patient_profile_image: user?.profile_image || null,
                patient_age: user?.age || null,
                patient_gender: user?.gender || null,
                patient_mobile_number: user?.mobile_number || null,
                patient_emergency_mobile_number: user?.emergency_mobile_number || null,
                patient_account_status: user?.account_status || null,

                caregiver_id: booking.caregiver_id,
                caregiver_full_name: caregiver?.full_name || null,
                caregiver_profile_image: caregiver?.profile_image || null,
                caregiver_age: caregiver?.age || null,
                caregiver_mobile_number: caregiver?.mobile_number || null,
                caregiver_emergency_mobile_number: caregiver?.emergency_mobile_number || null,
                caregiver_account_status: caregiver?.account_status || null,
                services_cost: caregiverDetail?.services_cost || null,

                member_id: memberData?.id || null,
                member_full_name: memberData?.full_name || null,
                member_dob: memberData?.dob || null,
                member_age: memberData?.age || null,
                member_gender: memberData?.gender || null,

                booking_for: booking.booking_for,
                booked_by: booking.booked_by,
                start_appointment: booking.start_appointment,
                end_appointment: booking.end_appointment,
                booking_status: booking.booking_status,
                total_hours: booking.total_hours,
                total_cost: booking.total_cost,
                payment_status: booking.payment_status,
                standard_cost: booking.standard_cost,
                nonstandard_cost: booking.nonstandard_cost,

                average_rates: feedbackData?.average_rates || 0,
                total_rates: feedbackData?.total_rates || 0,
                total_feedback: feedbackData?.total_feedback || 0,
                created_at: booking.created_at,
                updated_at: booking.updated_at
            };
        }));
        const totalPages = Math.ceil(count / limit);
        return res.status(200).json({
            status: 'success',
            message: 'Appointment Booked Data',
            data: transformedData,
            pagination: {
                total_documents: count,
                total_pages: totalPages,
                current_page: parseInt(page, 10),
                limit: parseInt(limit, 10),
            },
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// my payments list  ----------> caregiver
async function caregiverPayments(req, res) {
    try {
        let userId = req.userId;
        const { start_appointment, end_appointment, page = 1, limit = 10 } = req.query;

        let whereClause = {
            caregiver_id: userId
        };

        if (start_appointment && end_appointment) {
            // Validate date format
            const isValidStartDate = moment(start_appointment, 'YYYY-MM-DD', true).isValid();
            const isValidEndDate = moment(end_appointment, 'YYYY-MM-DD', true).isValid();

            if (!isValidStartDate || !isValidEndDate) {
                return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.' });
            }

            // Validate end_appointment is greater than start_appointment
            if (moment(end_appointment).isBefore(start_appointment)) {
                return res.status(400).json({ error: 'end_appointment must be greater than start_appointment.' });
            }

            whereClause.created_at = {
                [Op.gte]: start_appointment,
                [Op.lt]: moment(end_appointment).add(1, 'day').format('YYYY-MM-DD')
            };
        } else if (start_appointment) {
            // If only start_date is provided, fetch data from start_appointment to current_date
            const isValidStartDate = moment(start_appointment, 'YYYY-MM-DD', true).isValid();

            if (!isValidStartDate) {
                return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.' });
            }

            whereClause.created_at = {
                [Op.gte]: start_appointment
            };
        }

        whereClause.payment_status = 'succeeded';
        // whereClause.payment_status = 'success';

        const { count, rows: bookingData } = await AppointmentBooking.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
            order: [['id', 'DESC']]
        });

        const userIds = bookingData.map(booking => booking.booked_by);
        const memberIds = bookingData.map(booking => booking.user_id);
        const caregiverIds = bookingData.map(booking => booking.caregiver_id);

        const [users, caregivers, caregiverDetails, members, feedbackSummaries] = await Promise.all([
            User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'full_name', 'email', 'profile_image', 'dob', 'age', 'gender', 'mobile_number', 'emergency_mobile_number', 'account_status'] }),
            User.findAll({ where: { id: { [Op.in]: caregiverIds } }, attributes: ['id', 'full_name', 'email', 'profile_image', 'dob', 'age', 'mobile_number', 'emergency_mobile_number', 'account_status'] }),
            CareGiverDetails.findAll({ where: { user_id: { [Op.in]: caregiverIds } }, attributes: ['user_id', 'services_cost'] }),
            PatientMember.findAll({ where: { id: { [Op.in]: memberIds } }, attributes: ['id', 'full_name', 'dob', 'age', 'gender'] }),
            FeedbackSummary.findAll({ where: { caregiver_id: { [Op.in]: caregiverIds } }, attributes: ['id', 'caregiver_id', 'average_rates', 'total_rates', 'total_feedback'] }),
        ]);

        const transformedData = await Promise.all(bookingData.map(async (booking) => {
            // const user = users.find(user => user.id === booking.user_id);
            const user = (booking.booking_for === 'self' || booking.booking_for === 'member') ?
                users.find(u => u.id === booking.booked_by) :
                null;
            const caregiver = caregivers.find(caregiver => caregiver.id === booking.caregiver_id);
            const memberData = members.find(member => member.id === booking.user_id);
            const feedbackData = feedbackSummaries.find(feedback => feedback.caregiver_id === booking.caregiver_id);
            const caregiverDetail = caregiverDetails.find(detail => detail.user_id === booking.caregiver_id);

            return {
                id: booking.id,
                user_id: booking.user_id,
                patient_full_name: user?.full_name || null,
                patient_profile_image: user?.profile_image || null,
                patient_age: user?.age || null,
                patient_gender: user?.gender || null,
                patient_dob: user?.dob || null,
                patient_email: user?.email || null,
                patient_mobile_number: user?.mobile_number || null,
                patient_emergency_mobile_number: user?.emergency_mobile_number || null,
                patient_account_status: user?.account_status || null,

                caregiver_id: booking.caregiver_id,
                caregiver_full_name: caregiver?.full_name || null,
                caregiver_profile_image: caregiver?.profile_image || null,
                caregiver_age: caregiver?.age || null,
                caregiver_dob: caregiver?.dob || null,
                caregiver_email: caregiver?.email || null,
                caregiver_mobile_number: user?.mobile_number || null,
                caregiver_emergency_mobile_number: user?.emergency_mobile_number || null,
                caregiver_account_status: user?.account_status || null,
                services_cost: caregiverDetail?.services_cost || null,

                member_id: memberData?.id || null,
                member_full_name: memberData?.full_name || null,
                member_dob: memberData?.dob || null,
                member_age: memberData?.age || null,
                member_gender: memberData?.gender || null,

                booking_for: booking.booking_for,
                booked_by: booking.booked_by,
                start_appointment: booking.start_appointment,
                end_appointment: booking.end_appointment,
                booking_status: booking.booking_status,
                total_hours: booking.total_hours,
                total_cost: booking.total_cost,
                payment_status: booking.payment_status,

                average_rates: feedbackData?.average_rates || 0,
                total_rates: feedbackData?.total_rates || 0,
                total_feedback: feedbackData?.total_feedback || 0,
                created_at: booking.created_at,
                updated_at: booking.updated_at
            };
        }));
        const totalPages = Math.ceil(count / limit);
        return res.status(200).json({
            status: 'success',
            message: 'Caregiver payment Data list',
            data: transformedData,
            pagination: {
                total_documents: count,
                total_pages: totalPages,
                current_page: parseInt(page),
                limit: parseInt(limit),
            },
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// my earning list ----------> caregiver
async function myEarning(req, res) {
    try {
        let userId = req.userId;

        const bookingData = await AppointmentBooking.findAll({
            where: { caregiver_id: userId },
        });

        // Initialize variables for total costs
        let totalCost = 0;
        let successTotalCost = 0;

        // Iterate through bookingData to calculate total costs
        bookingData.forEach(booking => {
            const cost = parseFloat(booking.total_cost);
            totalCost += cost;

            if (booking.payment_status == 'succeeded') {
                successTotalCost += cost;
            }
        });

        // Calculate pendingTotalCost by subtracting successTotalCost from totalCost
        let pendingTotalCost = totalCost - successTotalCost;

        // Ensure totalCost, pendingTotalCost, and successTotalCost have exactly two digits after the decimal point
        totalCost = parseFloat(totalCost.toFixed(2));
        pendingTotalCost = parseFloat(pendingTotalCost.toFixed(2));
        successTotalCost = parseFloat(successTotalCost.toFixed(2));

        return res.status(200).json({
            status: 'success',
            message: 'Total earning',
            totalCost,
            pendingTotalCost,
            successTotalCost,
        });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// all payment list ------------> admin
async function payments(req, res) {
    try {
        const { start_date, end_date, booking_status, page = 1, limit = 10 } = req.query;

        let whereClause = {};

        if (start_date && end_date) {
            // Validate date format
            const isValidStartDate = moment(start_date, 'YYYY-MM-DD', true).isValid();
            const isValidEndDate = moment(end_date, 'YYYY-MM-DD', true).isValid();

            if (!isValidStartDate || !isValidEndDate) {
                return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.' });
            }

            // Validate end_date is greater than start_date
            if (moment(end_date).isBefore(start_date)) {
                return res.status(400).json({ error: 'end_date must be greater than start_date.' });
            }

            whereClause.created_at = {
                [Op.gte]: start_date,
                [Op.lt]: moment(end_date).add(1, 'day').format('YYYY-MM-DD')
            };
        } else if (start_date) {
            // If only start_date is provided, fetch data from start_date to current_date
            const isValidStartDate = moment(start_date, 'YYYY-MM-DD', true).isValid();

            if (!isValidStartDate) {
                return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.' });
            }

            whereClause.created_at = {
                [Op.gte]: start_date
            };
        }

        // Add status filter if selected
        if (booking_status) {
            whereClause.booking_status = booking_status.toLowerCase();
        }

        whereClause.payment_status = 'succeeded';

        const { count, rows: bookingData } = await AppointmentBooking.findAndCountAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit, 10),
            offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        });

        const userIds = bookingData.map(booking => booking.user_id);
        const caregiverIds = bookingData.map(booking => booking.caregiver_id);

        const [users, caregivers, caregiverDetails, members, feedbackSummaries] = await Promise.all([
            User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'full_name', 'email', 'profile_image', 'dob', 'age', 'gender', 'mobile_number', 'emergency_mobile_number', 'account_status'] }),
            User.findAll({ where: { id: { [Op.in]: caregiverIds } }, attributes: ['id', 'full_name', 'email', 'profile_image', 'dob', 'age', 'mobile_number', 'emergency_mobile_number', 'account_status'] }),
            CareGiverDetails.findAll({ where: { user_id: { [Op.in]: caregiverIds } }, attributes: ['user_id', 'services_cost'] }),
            PatientMember.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'full_name', 'dob', 'age', 'gender'] }),
            FeedbackSummary.findAll({ where: { caregiver_id: { [Op.in]: caregiverIds } }, attributes: ['id', 'caregiver_id', 'average_rates', 'total_rates', 'total_feedback'] }),
        ]);

        const transformedData = await Promise.all(bookingData.map(async (booking) => {
            const user = users.find(user => user.id === booking.user_id);
            const caregiver = caregivers.find(caregiver => caregiver.id === booking.caregiver_id);
            const memberData = members.find(member => member.id === booking.user_id);
            const feedbackData = feedbackSummaries.find(feedback => feedback.caregiver_id === booking.caregiver_id);
            const caregiverDetail = caregiverDetails.find(detail => detail.user_id === booking.caregiver_id);

            return {
                id: booking.id,
                user_id: booking.user_id,
                patient_full_name: user?.full_name || null,
                patient_profile_image: user?.profile_image || null,
                patient_age: user?.age || null,
                patient_gender: user?.gender || null,
                patient_dob: user?.dob || null,
                patient_email: user?.email || null,
                patient_mobile_number: user?.mobile_number || null,
                patient_emergency_mobile_number: user?.emergency_mobile_number || null,
                patient_account_status: user?.account_status || null,

                caregiver_id: booking.caregiver_id,
                caregiver_full_name: caregiver?.full_name || null,
                caregiver_profile_image: caregiver?.profile_image || null,
                caregiver_age: caregiver?.age || null,
                caregiver_dob: caregiver?.dob || null,
                caregiver_email: caregiver?.email || null,
                caregiver_mobile_number: user?.mobile_number || null,
                caregiver_emergency_mobile_number: user?.emergency_mobile_number || null,
                caregiver_account_status: user?.account_status || null,
                services_cost: caregiverDetail?.services_cost || null,

                member_id: memberData?.id || null,
                member_full_name: memberData?.full_name || null,
                member_dob: memberData?.dob || null,
                member_age: memberData?.age || null,
                member_gender: memberData?.gender || null,

                booking_for: booking.booking_for,
                booked_by: booking.booked_by,
                start_appointment: booking.start_appointment,
                end_appointment: booking.end_appointment,
                booking_status: booking.booking_status,
                total_hours: booking.total_hours,
                total_cost: booking.total_cost,
                payment_status: booking.payment_status,

                average_rates: feedbackData?.average_rates || 0,
                total_rates: feedbackData?.total_rates || 0,
                total_feedback: feedbackData?.total_feedback || 0,
                created_at: booking.created_at,
                updated_at: booking.updated_at
            };
        }));
        const totalPages = Math.ceil(count / limit);
        return res.status(200).json({
            status: 'success',
            message: 'Payments Data list',
            data: transformedData,
            pagination: {
                total_documents: count,
                total_pages: totalPages,
                current_page: parseInt(page, 10),
                limit: parseInt(limit, 10),
            },
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// payment details ------------> admin
async function paymentDetails(req, res) {
    try {
        let appointmentId = req.params.id;
        const paymentHistoryData = await PaymentHistory.findOne({
            where: { appointment_id: appointmentId },
        });

        const bookingData = await AppointmentBooking.findOne({
            where: { id: appointmentId },
        });

        const patientData = await User.findOne({
            where: { id: bookingData.booked_by },
        });

        const caregiverData = await User.findOne({
            where: { id: bookingData.caregiver_id },
        });

        let memberData = {};
        if (bookingData.booking_for !== 'self') {
            memberData = await PatientMember.findOne({
                where: { id: bookingData.user_id },
            });
        }

        const feedbackData = await FeedbackSummary.findOne({
            where: { caregiver_id: bookingData.caregiver_id },
        });

        return res.status(200).json({
            status: 'success',
            message: 'Payment details',
            data: { paymentHistoryData, bookingData, patientData, caregiverData, memberData, feedbackData },
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

module.exports = {
    getPublishableKey,
    paymentIntent,
    createCheckoutSession,
    webhook,
    // payment related apis
    myPayments,
    caregiverPayments,
    myEarning,
    payments,
    paymentDetails,
}