const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projects');

// CRUD for Projects
router.get('/', projectsController.getAllProjects);
router.post('/', projectsController.createProject);

// Analytics endpoints
router.get('/:projectId/tskp', projectsController.getProductionCapacity);
router.get('/:projectId/yamazumi', projectsController.getYamazumiData);

module.exports = router;
