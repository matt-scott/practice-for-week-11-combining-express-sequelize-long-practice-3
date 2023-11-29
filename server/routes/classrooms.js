// Instantiate router - DO NOT MODIFY
const express = require('express');
const router = express.Router();

// Import model(s)
const { Classroom } = require('../db/models');
const { Supply } = require('../db/models');
const { StudentClassroom } = require('../db/models');
const { Student } = require('../db/models');
const { Op } = require('sequelize');

// List of classrooms
router.get('/', async (req, res, next) => {
    let errorResult = { errors: [], count: 0, pageCount: 0 };

    const where = {};

    // Phase 6B: Classroom Search Filters
    /*
        name filter:
            If the name query parameter exists, set the name query
                filter to find a similar match to the name query parameter.
            For example, if name query parameter is 'Ms.', then the
                query should match with classrooms whose name includes 'Ms.'
    */
    if (req.query.name) {
        where.name = {
            [Op.like]: req.query.name
        };
    }

    /*
        studentLimit filter:
            If the studentLimit query parameter includes a comma
                And if the studentLimit query parameter is two numbers separated
                    by a comma, set the studentLimit query filter to be between
                    the first number (min) and the second number (max)
                But if the studentLimit query parameter is NOT two integers
                    separated by a comma, or if min is greater than max, add an
                    error message of 'Student Limit should be two integers:
                    min,max' to errorResult.errors

            If the studentLimit query parameter has no commas
                And if the studentLimit query parameter is a single integer, set
                    the studentLimit query parameter to equal the number
                But if the studentLimit query parameter is NOT an integer, add
                    an error message of 'Student Limit should be a integer' to
                    errorResult.errors 
    */

    let studentLimitQuery = req.query.studentLimit;

    if (studentLimitQuery) {
        // split studentLimitQuery with comma as delimeter
        studentLimitQueryArrayString = studentLimitQuery.split(',');
        // create array with query parts converted to numbers
        studentLimitQueryArrayNumbers = studentLimitQueryArrayString.map(x => Number(x));

        // two entities provided in req query params
        if (studentLimitQueryArrayNumbers.length === 2) {
            let min = studentLimitQueryArrayNumbers[0];
            let max = studentLimitQueryArrayNumbers[1];
            // check both array parts are numbers
            // check that min <= max
            if (!isNaN(max) && !isNaN(min) && max > min) {
                where.studentLimit = {
                    // between operator is inclusive of end values
                    [Op.between]: studentLimitQueryArrayNumbers
                }
            }
            else {
                errorResult.errors.push({ message: 'Student Limit should be two numbers: min,max' });
                next(errorResult);
            }
        }
        // only one entity provided in req query params
        else if (studentLimitQueryArrayNumbers.length === 1){
            let max = studentLimitQueryArrayNumbers[0];
 
            if (!isNaN(max)) {
                where.studentLimit = {
                    [Op.lte]: max
                }
            }
            else {
                errorResult.errors.push({ message: 'Student Limit should be an integer' });
                next(errorResult);
            }

        }
        else {
            errorResult.errors.push({ message: 'Student Limit should be two or less numbers: max or min,max' });
            next(errorResult);
        }

    }

    const classrooms = await Classroom.findAll({
        attributes: [ 'id', 'name', 'studentLimit' ],
        where,
        order: [
            ['name']
        ]
    });

    res.json(classrooms);
});

// Single classroom
router.get('/:id', async (req, res, next) => {
    let classroom = await Classroom.findByPk(req.params.id, {
        attributes: ['id', 'name', 'studentLimit'],
        // Phase 7:
        // Include classroom supplies and order supplies by category then
            // name (both in ascending order)
        // Include students of the classroom and order students by lastName
            // then firstName (both in ascending order)
            // (Optional): No need to include the StudentClassrooms
        include: [{
            model: Supply,
            attributes: ['id', 'name', 'category', 'handed'],
            },
            {
                    model: Student,
                    attributes: ['id', 'firstName', 'lastName', 'leftHanded']
            }
        ],
        order: [
            [Supply, 'category', 'ASC'],
            [Supply, 'name', 'ASC'],
            [Student, 'lastName', 'ASC'],
            [Student, 'firstName', 'ASC']
        ],


    });

    if (!classroom) {
        res.status(404);
        res.send({ message: 'Classroom Not Found' });
    }

    // Phase 5: Supply and Student counts, Overloaded classroom
        // Phase 5A: Find the number of supplies the classroom has and set it as
            // a property of supplyCount on the response
    let supplyCount = await Supply.count({
        where: {
            classroomId: req.params.id
        }
    });

    classroom = classroom.toJSON();
    classroom.supplyCount = supplyCount;

        // Phase 5B: Find the number of students in the classroom and set it as
            // a property of studentCount on the response
    let studentCount = await StudentClassroom.count({
        where: {
            classroomId: req.params.id
        }
    })

    classroom.studentCount = studentCount;

    // Phase 5C: Calculate if the classroom is overloaded by comparing the
    // studentLimit of the classroom to the number of students in the
    // classroom
    
    // if studentCount > studentLimit, classroom.overloaded = true 
    // if studentCount < studentLimit, classroom.overloaded = false 
    if (studentCount > classroom.studentLimit) {
        classroom.overloaded = true;
    }
    else {
        classroom.overloaded = false;
    }

    // Optional Phase 5D: Calculate the average grade of the classroom 

    res.json(classroom);
});

// Export class - DO NOT MODIFY
module.exports = router;