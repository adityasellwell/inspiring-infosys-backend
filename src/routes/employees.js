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
        const { name, email, joinDate } = req.body;
        if (!name || !email || !joinDate) {
            return res.status(400).json({
                success: false,
                message: 'Name,Email, and Join Date are required',
            });
        }
        const employee = await prisma.employee.create({
            data: {
                name,
                email,
                joinDate: new Date(joinDate),
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
        const { name, email, joinDate } = req.body;
        
        const employee = await prisma.employee.update({
            where: { id: parseInt(id) },
            data: {
                name,
                email,
                joinDate: joinDate ? new Date(joinDate) : undefined,
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
        
        const employee = await prisma.employee.delete({
            where: { id: parseInt(id) },
        });
        
        return res.json({ data: employee, success: true });
    } catch (error) {
        console.error('[DELETE /api/employees/:id]', error);
        return res.status(500).json({
            success: false,
            message: 'server error',
        });
    }
});

export default router;
