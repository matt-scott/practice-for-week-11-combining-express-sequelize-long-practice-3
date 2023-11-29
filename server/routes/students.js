// Instantiate router - DO NOT MODIFY
const express = require('express');
const router = express.Router();

// Import model(s)
const { Student } = require('../db/models');
const { Op } = require("sequelize");

// List
router.get('/', async (req, res, next) => {
    let errorResult = { errors: [], count: 0, pageCount: 0 };

    // Phase 2A: Use query params for page & size
    let page = Number(req.query.page);
    let size = Number(req.query.size);

    if (isNaN(page)) {
        page = 1;
    }

    if (isNaN(size)) {
        size = 10;
    }

    // Phase 2B: Calculate limit and offset
    let limit;
    let offset;

    // Query result pages must start at page 1
    // You must specify at least a maximum of one result to be returned from the query
    // On a single page, you should not be able to see more than 200 results.

    // size must be between 1 and 200
    // offset must be 1 or greater
    if (size > 0 && size <= 200 && page > 0) {
        limit = size;
        offset = (page - 1) * size;
    }
        // Phase 2B (optional): Special case to return all students (page=0, size=0)
        // Remove pagination if size and page are set to 0
    else if (size === 0 && page === 0) {
        // acquire total number of students to set size limit
        limit = await Student.count();
        // set offset to 0 to ensure all records seen
        offset = 0;
    }
    else {
        // Phase 2B: Add an error message to errorResult.errors of
            // 'Requires valid page and size params' when page or size is invalid
        errorResult.errors.push({ message: 'Requires valid page and size params' });
        next(errorResult);
    }



    // Phase 4: Student Search Filters
    /*
        firstName filter:
            If the firstName query parameter exists, set the firstName query
                filter to find a similar match to the firstName query parameter.
            For example, if firstName query parameter is 'C', then the
                query should match with students whose firstName is 'Cam' or
                'Royce'.

        lastName filter: (similar to firstName)
            If the lastName query parameter exists, set the lastName query
                filter to find a similar match to the lastName query parameter.
            For example, if lastName query parameter is 'Al', then the
                query should match with students whose lastName has 'Alfonsi' or
                'Palazzo'.

        lefty filter:
            If the lefty query parameter is a string of 'true' or 'false', set
                the leftHanded query filter to a boolean of true or false
            If the lefty query parameter is neither of those, add an error
                message of 'Lefty should be either true or false' to
                errorResult.errors
    */

    const where = {};

    // first name filter
    if (req.query.firstName) {
        where.firstName = {
            [Op.like]: req.query.firstName
        };
    }

    // last name filter
    if (req.query.lastName) {
        where.lastName = {
            [Op.like]: req.query.lastName
        };
    }

    // if (req.query.lastName) {
    //     where.lastName = {
    //         [Op.like]: `%${req.query.lastName}%`
    //     };
    // }

    if (req.query.lefty === 'true') {
        where.leftHanded = true;
    }
    else if (req.query.lefty === 'false') {
        where.leftHanded = false;
    }
    else if (req.query.lefty !== undefined) {
        errorResult.errors.push({ message: 'Lefty should be either true or false' });
        next(errorResult);
    }

    // Phase 2C: Handle invalid params with "Bad Request" response
    // call next(err)
    // next(errorResult);


    // Phase 3C: Include total student count in the response even if params were
        // invalid
        /*
            If there are elements in the errorResult.errors array, then
            return a "Bad Request" response with the errorResult as the body
            of the response.

            Ex:
                errorResult = {
                    errors: [{ message: 'Grade should be a number' }],
                    count: 267,
                    pageCount: 0
                }
        */
    // Your code here

    let result = {};

    // Phase 3A: Include total number of results returned from the query without
    // limits and offsets as a property of count on the result
    // Note: This should be a new query
    
    const resultCount = await Student.count();
    result.count = resultCount;

    result.rows = await Student.findAll({
        attributes: ['id', 'firstName', 'lastName', 'leftHanded'],
        where,
        // Order the Students search results
        order: [
            ['lastName'],
            ['firstName']
        ],
        limit: limit,
        offset: offset
    });

    // Phase 2E: Include the page number as a key of page in the response data
        // In the special case (page=0, size=0) that returns all students, set
            // page to 1
        /*
            Response should be formatted to look like this:
            {
                rows: [{ id... }] // query results,
                page: 1
            }
        */

    if (size === 0 && page === 0) {
        result.page = 1;
    }
    else {
        result.page = page;
    }

    // Phase 3B:
        // Include the total number of available pages for this query as a key
            // of pageCount in the response data
        // In the special case (page=0, size=0) that returns all students, set
            // pageCount to 1
        /*
            Response should be formatted to look like this:
            {
                count: 17 // total number of query results without pagination
                rows: [{ id... }] // query results,
                page: 2, // current page of this query
                pageCount: 10 // total number of available pages for this query
            }
        */
    if (size === 0 && page === 0) {
        result.pageCount = 1;
    }
    else {
        result.pageCount = Math.ceil( result.count / limit );
    }

    res.json(result);
});

// Export class - DO NOT MODIFY
module.exports = router;