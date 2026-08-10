import { Router } from 'express';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../controllers/departmentController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Role } from '../models/Role';

const router = Router();

// Allow authenticated users to view
router.get('/', getDepartments);
router.get('/:id', getDepartmentById);

// Only Super Admin or Dept Admin can modify
router.post('/', createDepartment);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

export default router;
