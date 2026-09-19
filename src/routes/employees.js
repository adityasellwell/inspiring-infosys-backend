import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getDashboardStats,
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  uploadDocument,
  deleteDocument,
  generateLetter,
  toggleLetterAccess,
  getAllRequests,
  updateRequestStatus,
  issueSalarySlip,
  getAllLeaves,
  updateLeaveStatus,
  getAllAttendance,
  deleteAttendanceLog,
  cleanDuplicateAttendanceLogs,
  getAllQueries,
  replyQuery,
  deleteQuery,
  resetEmployeePassword
} from "../controllers/employeeController.js";

const router = Router();

// Employee Management & Admin HR Routes
router.get('/dashboard-stats', requireAuth, getDashboardStats);
router.get('/', requireAuth, getAllEmployees);
router.get('/requests/all', requireAuth, getAllRequests);
router.put('/requests/:id/status', requireAuth, updateRequestStatus);
router.post('/salary-slips', requireAuth, issueSalarySlip);
router.get('/leaves/all', requireAuth, getAllLeaves);
router.put('/leaves/:id/status', requireAuth, updateLeaveStatus);
router.get('/attendance/all', requireAuth, getAllAttendance);
router.delete('/attendance/:id', requireAuth, deleteAttendanceLog);
router.post('/attendance/clean-duplicates', requireAuth, cleanDuplicateAttendanceLogs);
router.get('/queries/all', requireAuth, getAllQueries);
router.put('/queries/:id/reply', requireAuth, replyQuery);
router.delete('/queries/:id', requireAuth, deleteQuery);

router.get('/:id', requireAuth, getEmployeeById);
router.post('/', requireAuth, createEmployee);
router.put('/:id', requireAuth, updateEmployee);
router.delete('/:id', requireAuth, deleteEmployee);

router.post('/:id/reset-password', requireAuth, resetEmployeePassword);
router.post('/:id/documents', requireAuth, uploadDocument);
router.delete('/documents/:docId', requireAuth, deleteDocument);
router.post('/:id/letters', requireAuth, generateLetter);
router.post('/:id/letters/toggle-access', requireAuth, toggleLetterAccess);

export default router;
