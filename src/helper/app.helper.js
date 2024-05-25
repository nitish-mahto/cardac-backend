const Admin = require("../models/admin.model");
const CompanyInfo = require("../models/company_info.model");
const config = require("../config/config");
const ServicesCost = require("../models/services_cost.model");

let email = config.admin_email;
let password = config.admin_password;

async function init() {
    let user = await Admin.findOne({
        attributes: ['email', 'password'],
    });
    if (!user) {
        await Admin.create({
            email: email,
            password: password
        });
    }
    let companyInfo = await CompanyInfo.findOne({});
    if (!companyInfo) {
        await CompanyInfo.create({
            guidelines: null,
            policies: null,
            terms: null,
            trust_safety: null,
        });
    }

    let services = [
        {
            type: "holiday",
            sub_type: "nonstandard",
            price_perhour: "0",
            start_time: "00:00",
            end_time: "00:00",
        },
        {
            type: "holiday",
            sub_type: "standard",
            price_perhour: "0",
            start_time: "00:00",
            end_time: "00:00",
        },
        {
            type: "sunday",
            sub_type: "nonstandard",
            price_perhour: "0",
            start_time: "00:00",
            end_time: "00:00",
        },
        {
            type: "sunday",
            sub_type: "standard",
            price_perhour: "0",
            start_time: "00:00",
            end_time: "00:00",
        },
        {
            type: "saturday",
            sub_type: "standard",
            price_perhour: "0",
            start_time: "00:00",
            end_time: "00:00",
        },
        {
            type: "saturday",
            sub_type: "nonstandard",
            price_perhour: "0",
            start_time: "00:00",
            end_time: "00:00",
        },
        {
            type: "weekday",
            sub_type: "nonstandard",
            price_perhour: "0",
            start_time: "00:00",
            end_time: "00:00",
        },
        {
            type: "weekday",
            sub_type: "standard",
            price_perhour: "0",
            start_time: "00:00",
            end_time: "00:00",
        }
    ];

    for (let service of services) {
        await ServicesCost.findOrCreate({
            where: { type: service.type, sub_type: service.sub_type },
            defaults: service
        });
    }

}

module.exports = { init };
