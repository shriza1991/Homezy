const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Property = require("../models/Property");
const RentalRequest = require("../models/RentalRequest");
const Notification = require("../models/Notification");

const { resetMemoryUsers, getMemoryUsers } = require("../controllers/authController");
const { resetMemoryProperties, getMemoryProperties, initialPropertiesSeed } = require("../controllers/propertyController");
const { resetMemoryRentalRequests, getMemoryRentalRequests } = require("../controllers/rentalRequestController");
const { resetMemoryNotifications, getMemoryNotifications } = require("../controllers/notificationController");

// Canonical demo accounts
const demoAccounts = [
  {
    name: "Demo Tenant",
    email: "tenant@homezy.com",
    phone: "9876543210",
    role: "tenant",
    password: "password123",
  },
  {
    name: "Demo Admin",
    email: "admin@homezy.com",
    phone: "9876543211",
    role: "admin",
    password: "password123",
  },
  {
    name: "Demo Owner",
    email: "owner@homezy.com",
    phone: "9876543212",
    role: "owner",
    password: "password123",
  },
];

/**
 * Perform repeatable seeding of demo accounts, catalog properties,
 * rental applications, and notification history.
 * Automatically selects MongoDB persistence or in-memory fallback.
 */
const seedDemoData = async () => {
  const isDbConnected = mongoose.connection.readyState === 1;

  if (isDbConnected) {
    // 1. Clear existing collections
    await Promise.all([
      User.deleteMany({}),
      Property.deleteMany({}),
      RentalRequest.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    // 2. Insert Demo Users with bcrypt hashes
    const hashedUsers = await Promise.all(
      demoAccounts.map(async (acc) => {
        const hashedPassword = await bcrypt.hash(acc.password, 10);
        return {
          ...acc,
          password: hashedPassword,
        };
      })
    );
    const createdUsers = await User.insertMany(hashedUsers);

    const tenantUser = createdUsers.find((u) => u.role === "tenant");
    const adminUser = createdUsers.find((u) => u.role === "admin");
    const ownerUser = createdUsers.find((u) => u.role === "owner");

    // 3. Insert Canonical Properties
    const createdProperties = await Property.insertMany(initialPropertiesSeed);

    // 4. Insert Canonical Rental Requests
    const sampleRentalRequests = [
      {
        property: createdProperties[0]._id,
        propertyTitle: createdProperties[0].title,
        propertyLocation: createdProperties[0].location,
        monthlyRent: createdProperties[0].price,
        tenant: tenantUser._id,
        tenantName: tenantUser.name,
        tenantEmail: tenantUser.email,
        tenantPhone: tenantUser.phone,
        status: "Pending",
        moveInDate: "2026-12-01",
        message: "Interested in leasing this property. Clean tenant with steady employment.",
      },
      {
        property: createdProperties[1]._id,
        propertyTitle: createdProperties[1].title,
        propertyLocation: createdProperties[1].location,
        monthlyRent: createdProperties[1].price,
        tenant: tenantUser._id,
        tenantName: tenantUser.name,
        tenantEmail: tenantUser.email,
        tenantPhone: tenantUser.phone,
        status: "Approved",
        moveInDate: "2026-11-20",
        message: "Looking for family house in Powai.",
        adminNotes: "Application approved. Welcome to your new home!",
      },
    ];
    const createdRequests = await RentalRequest.insertMany(sampleRentalRequests);

    // 5. Insert Canonical Notifications
    const sampleNotifications = [
      {
        recipient: adminUser._id,
        sender: tenantUser._id,
        title: "New Rental Application",
        message: `${tenantUser.name} submitted an application for ${createdProperties[0].title}`,
        type: "application_submitted",
        relatedId: String(createdRequests[0]._id),
        isRead: false,
      },
      {
        recipient: tenantUser._id,
        sender: adminUser._id,
        title: "Application Approved",
        message: `Your application for ${createdProperties[1].title} has been approved!`,
        type: "application_approved",
        relatedId: String(createdRequests[1]._id),
        isRead: false,
      },
    ];
    const createdNotifications = await Notification.insertMany(sampleNotifications);

    return {
      mode: "mongodb",
      success: true,
      message: "Demo database seeded successfully into MongoDB Atlas",
      counts: {
        users: createdUsers.length,
        properties: createdProperties.length,
        rentalRequests: createdRequests.length,
        notifications: createdNotifications.length,
      },
      accounts: demoAccounts.map(({ password, ...u }) => u),
    };
  }

  // IN-MEMORY / DISCONNECTED MODE SEEDING
  // 1. Reset memory users
  const memUsers = demoAccounts.map((acc, idx) => ({
    ...acc,
    _id: `mem-user-${acc.role}-${idx + 1}`,
    id: `mem-user-${acc.role}-${idx + 1}`,
  }));
  resetMemoryUsers(memUsers);

  const tenantMem = memUsers.find((u) => u.role === "tenant");
  const adminMem = memUsers.find((u) => u.role === "admin");

  // 2. Reset memory properties
  const memProperties = initialPropertiesSeed.map((p, idx) => ({
    ...p,
    _id: `mem-prop-${idx + 1}`,
    id: idx + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  resetMemoryProperties(memProperties);

  // 3. Reset memory rental requests
  const memRentalRequests = [
    {
      _id: "mem-req-1",
      id: "mem-req-1",
      property: memProperties[0]._id,
      propertyId: memProperties[0]._id,
      propertyTitle: memProperties[0].title,
      propertyLocation: memProperties[0].location,
      monthlyRent: memProperties[0].price,
      tenant: tenantMem._id,
      tenantName: tenantMem.name,
      tenantEmail: tenantMem.email,
      tenantPhone: tenantMem.phone,
      status: "Pending",
      moveInDate: "2026-12-01",
      message: "Interested in leasing this property. Clean tenant with steady employment.",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      _id: "mem-req-2",
      id: "mem-req-2",
      property: memProperties[1]._id,
      propertyId: memProperties[1]._id,
      propertyTitle: memProperties[1].title,
      propertyLocation: memProperties[1].location,
      monthlyRent: memProperties[1].price,
      tenant: tenantMem._id,
      tenantName: tenantMem.name,
      tenantEmail: tenantMem.email,
      tenantPhone: tenantMem.phone,
      status: "Approved",
      moveInDate: "2026-11-20",
      message: "Looking for family house in Powai.",
      adminNotes: "Application approved. Welcome to your new home!",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ];
  resetMemoryRentalRequests(memRentalRequests);

  // 4. Reset memory notifications
  const memNotifications = [
    {
      _id: "mem-notif-1",
      recipient: adminMem._id,
      sender: tenantMem._id,
      title: "New Rental Application",
      message: `${tenantMem.name} submitted an application for ${memProperties[0].title}`,
      type: "application_submitted",
      relatedId: "mem-req-1",
      isRead: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      _id: "mem-notif-2",
      recipient: tenantMem._id,
      sender: adminMem._id,
      title: "Application Approved",
      message: `Your application for ${memProperties[1].title} has been approved!`,
      type: "application_approved",
      relatedId: "mem-req-2",
      isRead: false,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ];
  resetMemoryNotifications(memNotifications);

  return {
    mode: "in-memory",
    success: true,
    message: "Demo dataset seeded successfully in memory",
    counts: {
      users: memUsers.length,
      properties: memProperties.length,
      rentalRequests: memRentalRequests.length,
      notifications: memNotifications.length,
    },
    accounts: demoAccounts.map(({ password, ...u }) => u),
  };
};

/**
 * Retrieve current demo entities status and counts
 */
const getDemoStatus = async () => {
  const isDbConnected = mongoose.connection.readyState === 1;

  if (isDbConnected) {
    const [userCount, propCount, reqCount, notifCount] = await Promise.all([
      User.countDocuments({}),
      Property.countDocuments({}),
      RentalRequest.countDocuments({}),
      Notification.countDocuments({}),
    ]);

    return {
      mode: "mongodb",
      counts: {
        users: userCount,
        properties: propCount,
        rentalRequests: reqCount,
        notifications: notifCount,
      },
      accounts: demoAccounts.map(({ password, ...u }) => u),
    };
  }

  return {
    mode: "in-memory",
    counts: {
      users: getMemoryUsers().length,
      properties: getMemoryProperties().length,
      rentalRequests: getMemoryRentalRequests().length,
      notifications: getMemoryNotifications().length,
    },
    accounts: demoAccounts.map(({ password, ...u }) => u),
  };
};

module.exports = {
  demoAccounts,
  seedDemoData,
  getDemoStatus,
};
