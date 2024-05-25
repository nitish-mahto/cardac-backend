const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');
const User = require('./user.model');

const CaregiverDetails = sequelize.define(
    'caregiver_details',
    {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.INTEGER
        },
        covid_doc: DataTypes.STRING(100),
        covid_doc_status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending'
        },
        covid_doc_verified_notes: { type: DataTypes.TEXT },

        first_aid_doc: DataTypes.STRING(100),
        first_aid_doc_status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending'
        },
        first_aid_doc_verified_notes: { type: DataTypes.TEXT },

        ndis_doc: DataTypes.STRING(100),
        ndis_doc_status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending'
        },
        ndis_doc_verified_notes: { type: DataTypes.TEXT },

        police_doc: DataTypes.STRING(100),
        police_doc_status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending'
        },
        police_doc_verified_notes: { type: DataTypes.TEXT },

        child_doc: DataTypes.STRING(100),
        child_doc_status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending'
        },
        child_doc_verified_notes: { type: DataTypes.TEXT },

        visa_doc: DataTypes.STRING(255),
        visa_doc_status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending'
        },
        visa_doc_verified_notes: { type: DataTypes.TEXT },

        resume: DataTypes.STRING(255),
        resume_status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending'
        },
        resume_verified_notes: { type: DataTypes.TEXT },

        is_resume: {
            type: DataTypes.ENUM('yes', 'no'),
        },
        is_disability: DataTypes.ENUM('yes', 'no'),
        week_hours: {
            type: DataTypes.STRING,
        },
        is_police_check: DataTypes.ENUM('yes', 'no'),
        qualification: { type: DataTypes.TEXT },
        child_check: DataTypes.ENUM('yes', 'no'),
        ndis_check: DataTypes.ENUM('yes', 'no'),
        first_aid_check: DataTypes.ENUM('yes', 'no'),
        worker_role: {
            type: DataTypes.STRING(50),
            set(value) {
                this.setDataValue('worker_role', value.toLowerCase());
            },
        },
        work_area: DataTypes.STRING(30),
        background_submitted: {
            type: DataTypes.BOOLEAN,
        },
        background_verified: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending'
        },
        verified_notes: { type: DataTypes.TEXT },
        language_speak: {
            type: DataTypes.TEXT,
            defaultValue: 'hindi',
            set(value) {
                this.setDataValue('language_speak', value.toLowerCase());
            },
        },
        services_cost: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        about: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        experience: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
    },
    {
        tableName: 'caregiver_details',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

// Define the association
CaregiverDetails.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });

module.exports = CaregiverDetails;
