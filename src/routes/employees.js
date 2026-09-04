import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();

router.get('/', requireAuth, async (req, res) => {
    try {
        const employees = await prisma.employee.findMany({
            orderBy: {
                id: 'desc'
            },
        });
        return res.json({ data: employees, success: true });
    } catch (error) {
        console.error('[GET /api/employees]', error);
        return res.status(500).json({
            success: false,
            message: 'server error',
        });
    }
});

router.post('/', requireAuth, async (req, res) => {
    try {
        const { empId, name, empName, email, phone, department, designation, joinDate, salary, status, address } = req.body;
        const actualName = name || empName;
        if (!actualName || !email || !phone || !department || !designation || !joinDate || salary === undefined || salary === '' || !status) {
            return res.status(400).json({
                success: false,
                message: 'Emp Name, email, phone, department, designation, join date, salary, and status are required',
            });
        }
        const numericSalary = parseFloat(salary);
        if (isNaN(numericSalary) || numericSalary <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Salary must be a positive number',
            });
        }
        const employee = await prisma.employee.create({
            data: {
                empId: empId || '',
                name: actualName,
                email,
                phone,
                department,
                designation,
                joinDate: new Date(joinDate),
                salary: numericSalary,
                status,
                address: address || null
            },
        });
        return res.status(201).json({ data: employee, success: true });
    } catch (error) {
        console.error('[POST /api/employees]', error);
        return res.status(500).json({
            success: false,
            message: 'server error',
        });
    }
});

router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const empIdParam = parseInt(id, 10);
        if (isNaN(empIdParam)) {
            return res.status(400).json({ success: false, message: 'Invalid employee ID' });
        }
        const existing = await prisma.employee.findUnique({ where: { id: empIdParam } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }
        const { empId, name, empName, email, phone, department, designation, joinDate, salary, status, address } = req.body;
        
        let numericSalary;
        if (salary !== undefined && salary !== '') {
            numericSalary = parseFloat(salary);
            if (isNaN(numericSalary) || numericSalary <= 0) {
                return res.status(400).json({ success: false, message: 'Salary must be a positive number' });
            }
        }

        const actualName = name || empName;

        const employee = await prisma.employee.update({
            where: { id: empIdParam },
            data: {
                empId: empId !== undefined ? empId : undefined,
                name: actualName || undefined,
                email: email || undefined,
                phone: phone || undefined,
                department: department || undefined,
                designation: designation || undefined,
                joinDate: joinDate ? new Date(joinDate) : undefined,
                salary: numericSalary,
                status: status || undefined,
                address: address || undefined
            },
        });
        
        return res.json({ data: employee, success: true });
    } catch (error) {
        console.error('[PUT /api/employees/:id]', error);
        return res.status(500).json({
            success: false,
            message: 'server error',
        });
    }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const empId = parseInt(id, 10);
        if (isNaN(empId)) {
            return res.status(400).json({ success: false, message: 'Invalid employee ID' });
        }
        const existing = await prisma.employee.findUnique({ where: { id: empId } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }
        await prisma.employee.delete({
            where: { id: empId },
        });
        return res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('[DELETE /api/employees/:id]', error);
        return res.status(500).json({
            success: false,
            message: 'server error',
        });
    }
});

export default router;
