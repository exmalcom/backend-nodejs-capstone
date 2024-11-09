const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');

// Define the upload directory path
const directoryPath = 'public/images';

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath); // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

const upload = multer({ storage: storage });


// Get all secondChanceItems
router.get('/', async (req, res, next) => {
    logger.info('/ called');
    try {
        //Step 2: Task 1: Retrieve the database connection from db.js
        const db = await connectToDatabase();
        //Step 2: Task 2: Use the collection() method to retrieve the secondChanceItems collection
        const collection = db.collection("secondChanceItems");
        //Step 2: Task 3: Fetch all secondChanceItems using collection.find().toArray()
        const secondChanceItems = await collection.find({}).toArray();
        //Step 2: Task 4: Return the secondChanceItems using res.json()
        res.json(secondChanceItems);
    } catch (e) {
        logger.console.error('oops something went wrong', e)
        next(e);
    }
});

// Add a new item
router.post('/', upload.single('file'), async(req, res,next) => {
    try {

        //Step 3: Task 1: Retrieve the database connection from db.js
        const db = await connectToDatabase();
        //Step 3: Task 2: Use the collection() method to retrieve the secondChanceItems collection
        const collection = db.collection("secondChanceItems");
        //Step 3: Task 3: Create a new secondChanceItem from the request body
        let secondChanceItem = req.body;
        //Step 3: Task 4: Get the last id, increment it by 1, and set it to the new secondChanceItem
        const lastItemQuery = await collection.find().sort({'id': -1}).limit(1);
        await lastItemQuery.forEach(item => {
            secondChanceItem.id = (parseInt(item.id) + 1).toString();
        });
        //Step 3: Task 5: Set the current date in the new item
        const date_added = Math.floor(new Date().getTime() / 1000);
        secondChanceItem.date_added = date_added;
        // Task 6: Add the secondChanceItem to the database
        secondChanceItem = await collection.insertOne(secondChanceItem);
        // Task 7: Upload the image to the images directory (handled by multer automatically)

        // Check if file was uploaded
        if (req.file) {
            secondChanceItem.filePath = `/images/${req.file.filename}`; // Store the file path for later use
        }
        // Send the newly created item back as the response
        res.status(201).json(secondChanceItem.ops[0]); // Return the inserted item
    } catch (e) {
        logger.console.error('Error adding secondChanceItem', e);
        next(e);
    }
});

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
    try {
        //Step 4: // Task 1: Retrieve the database connection from db.js
        const db = await connectToDatabase();
        //Step 4: Task 2: Use the collection() method to retrieve the secondChanceItems collection
        const collection = db.collection("secondChanceItems");
        //Step 4: Task 3: Find a specific secondChanceItem by its ID
        const id = req.params.id; // Get the ID from the request parameters
        const secondChanceItem = await collection.findOne({ id: id });
        //Step 4: Task 4: Return the secondChanceItem as a JSON object or return an error message if not found
        if (!secondChanceItem) {
            return res.status(404).send("secondChanceItem not found");
        }
        // Return the found item as a JSON response
        res.json(secondChanceItem);
    } catch (e) {
        logger.console.error('Error fetching secondChanceItem by ID', e);
        next(e);
    }
});

// Update and existing item
router.put('/:id', async(req, res,next) => {
    try {
        //Step 5: Task 1: Retrieve the database connection from db.js
        const db = await connectToDatabase();
        //Step 5: Task 2: Use the collection() method to retrieve the secondChanceItems collection
        const collection = db.collection("secondChanceItems");

        const id = req.params.id; // Get the ID from the request parameters

        //Step 5: Task 3: Check if the secondChanceItem exists
        const secondChanceItem = await collection.findOne({ id: id });
        if (!secondChanceItem) {
            logger.error('secondChanceItem not found');
            return res.status(404).json({ error: "secondChanceItem not found" });
        }
        //Step 5: Task 4: Update the item's attributes
        secondChanceItem.category = req.body.category || secondChanceItem.category;
        secondChanceItem.condition = req.body.condition || secondChanceItem.condition;
        secondChanceItem.age_days = req.body.age_days || secondChanceItem.age_days;
        secondChanceItem.description = req.body.description || secondChanceItem.description;

        // Calculate age_years based on age_days (rounded to one decimal place)
        secondChanceItem.age_years = Number((secondChanceItem.age_days / 365).toFixed(1));

        // Set the updatedAt field to the current date
        secondChanceItem.updatedAt = new Date();

        // Update the item in the database
        const updateResult = await collection.findOneAndUpdate(
            { id: id },
            { $set: secondChanceItem },
            { returnDocument: 'after' }
        );
        //Step 5: Task 5: Send confirmation
        if (updateResult.value) {
            res.json({ "uploaded": "success" });
        } else {
            res.json({ "uploaded": "failed" });
        }
    } catch (e) {
        logger.console.error('Error updating secondChanceItem', e);
        next(e);
    }
});

// Delete an existing item
router.delete('/:id', async(req, res,next) => {
    try {
        //Step 6: Task 1: Retrieve the database connection from db.js
        const db = await connectToDatabase();
        //Step 6: Task 2: Use the collection() method to retrieve the secondChanceItems collection
        const collection = db.collection("secondChanceItems");

        const id = req.params.id; // Get the ID from the request parameters
        //Step 6: Task 3: Find the secondChanceItem by ID
        const secondChanceItem = await collection.findOne({ id: id });
        if (!secondChanceItem) {
            logger.error('secondChanceItem not found');
            return res.status(404).json({ error: "secondChanceItem not found" });
        }
        //Step 6: Task 4: Delete the secondChanceItem
        await collection.deleteOne({ id: id });

        // Send a success response after deletion
        res.json({ "deleted": "success" });
    } catch (e) {
        logger.error('Error deleting secondChanceItem', e);
        next(e);
    }
});

module.exports = router;
