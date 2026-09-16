import { Router } from "express";
import {
  requireEmployeeAuth,
  login,
  getMe,
  updateProfile,
  clockIn,
  clockOut,
  submitLeave,
  submitQuery,
  submitWorkReport
} from "../controllers/employeeAuthController.js";

const router = Router();

// Employee Portal Authentication & Dashboard Routes
router.post("/login", login);
router.get("/me", requireEmployeeAuth, getMe);
router.post("/profile", requireEmployeeAuth, updateProfile);
router.post("/clock-in", requireEmployeeAuth, clockIn);
router.post("/clock-out", requireEmployeeAuth, clockOut);
router.post("/leaves", requireEmployeeAuth, submitLeave);
router.post("/queries", requireEmployeeAuth, submitQuery);
router.post("/dwr", requireEmployeeAuth, submitWorkReport);

export { requireEmployeeAuth };
export default router;
