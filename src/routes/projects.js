import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getAllProjects,
  createProject,
  updateProject,
  deleteProject
} from '../controllers/projectsController.js';

const router = Router();

router.get('/', getAllProjects);
router.post('/', requireAuth, createProject);
router.put('/:id', requireAuth, updateProject);
router.delete('/:id', requireAuth, deleteProject);

export default router;
