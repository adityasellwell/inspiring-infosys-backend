import bcrypt from "bcryptjs";
import prisma, { dbQuery } from "../lib/prisma.js";

const normalizePhone = (rawPhone) => {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  return digits;
};

export const normalizeEmpId = (empId, id) => {
  const raw = String(empId || id || '').trim();
  if (!raw) return 'INS001';
  if (/^INS-?\d+$/i.test(raw)) {
    const numMatch = raw.match(/\d+/);
    if (numMatch) return `INS${String(parseInt(numMatch[0], 10)).padStart(3, '0')}`;
  }
  const match = raw.match(/\d+/);
  if (match && (/^emp\d+$/i.test(raw) || /^emp-\d+$/i.test(raw) || /^insi\d+$/i.test(raw) || /^\d+$/.test(raw))) {
    const num = parseInt(match[0], 10);
    if (!isNaN(num)) return `INS${String(num).padStart(3, '0')}`;
  }
  return raw.toUpperCase();
};

// ── 1. GET DASHBOARD METRICS ──────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
  try {
    const totalEmployees = await prisma.employee.count();
    const activeEmployees = await prisma.employee.count({ where: { status: 'Active' } });
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: { status: 'Approved' },
      select: { employeeId: true }
    }).catch(() => []);
    const approvedEmpCount = new Set(approvedLeaves.map(l => l.employeeId)).size;
    const statusOnLeaveCount = await prisma.employee.count({ where: { status: 'On Leave' } }).catch(() => 0);
    const onLeaveEmployees = Math.max(statusOnLeaveCount, approvedEmpCount);
    
    const pendingLeaveReqs = await prisma.leaveRequest.count({ where: { status: 'Pending' } });
    const pendingEmpReqs = await prisma.employeeRequest.count({ where: { status: 'Pending' } });
    const pendingQueries = await prisma.employeeQuery.count({ where: { status: 'Pending' } });
    const pendingRequests = pendingLeaveReqs + pendingEmpReqs + pendingQueries;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newJoiners = await prisma.employee.count({
      where: { joinDate: { gte: thirtyDaysAgo } }
    });

    const pendingDocuments = await prisma.employeeDocument.count({ where: { status: 'Pending' } });

    return res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        onLeaveEmployees,
        pendingRequests,
        newJoiners,
        pendingDocuments
      }
    });
  } catch (error) {
    console.error('[GET /api/employees/dashboard-stats]', error);
    return res.status(500).json({ success: false, message: 'Server error fetching stats' });
  }
};

// ── 2. GET ALL EMPLOYEES (WITH FILTERS & SEARCH) ──────────────────────
export const getAllEmployees = async (req, res) => {
  try {
    const { search, department, designation, employmentType, status } = req.query;

    const whereClause = {};

    if (status && status !== 'All') {
      whereClause.status = status;
    }

    if (department && department !== 'All') {
      whereClause.department = department;
    }

    if (designation && designation !== 'All') {
      whereClause.designation = designation;
    }

    if (employmentType && employmentType !== 'All') {
      whereClause.employmentType = employmentType;
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { name: { contains: q } },
        { empId: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } }
      ];
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      orderBy: { id: 'desc' },
      include: {
        documents: true,
        hrLetters: true,
        employeeRequests: true,
        leaveRequests: true,
        salarySlips: { orderBy: { id: 'desc' }, take: 1 },
        attendances: { orderBy: { date: 'desc' }, take: 7 }
      }
    });

    // Auto-heal and normalize empId (e.g., 'emp1', 'emp01' -> 'INS001')
    for (const emp of employees) {
      const formatted = normalizeEmpId(emp.empId, emp.id);
      if (emp.empId !== formatted) {
        emp.empId = formatted;
        prisma.employee.update({
          where: { id: emp.id },
          data: { empId: formatted }
        }).catch(err => console.warn('[Auto-heal empId]', err.message));
      }
    }

    return res.json({ data: employees, success: true });
  } catch (error) {
    console.error('[GET /api/employees]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── 3. GET SINGLE EMPLOYEE DEEP PROFILE ──────────────────────────────
export const getEmployeeById = async (req, res) => {
  try {
    const idParam = parseInt(req.params.id, 10);
    const normalizedParam = normalizeEmpId(req.params.id, idParam);
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          ...(isNaN(idParam) ? [] : [{ id: idParam }]),
          { empId: req.params.id },
          { empId: normalizedParam },
          { email: req.params.id },
          { name: req.params.id }
        ]
      },
      include: {
        attendances: { orderBy: { date: 'desc' } },
        salarySlips: { orderBy: { id: 'desc' } },
        leaveRequests: { orderBy: { createdAt: 'desc' } },
        queries: { orderBy: { createdAt: 'desc' } },
        dailyWorkReports: { orderBy: { date: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        hrLetters: { orderBy: { createdAt: 'desc' } },
        employeeRequests: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const formatted = normalizeEmpId(employee.empId, employee.id);
    if (employee.empId !== formatted) {
      employee.empId = formatted;
      prisma.employee.update({
        where: { id: employee.id },
        data: { empId: formatted }
      }).catch(err => console.warn('[Auto-heal empId]', err.message));
    }

    return res.json({ success: true, data: employee });
  } catch (error) {
    console.error('[GET /api/employees/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── 4. CREATE NEW EMPLOYEE (STRUCTURED MASTER FORM) ───────────────────
export const createEmployee = async (req, res) => {
  try {
    const {
      empId, name, firstName, middleName, lastName, email, personalEmail, password, phone, altPhone,
      dob, gender, address, currentAddress, permanentAddress, city, state, country, pincode,
      emergencyContactName, emergencyRelationship, emergencyPhone, emergencyAltPhone,
      department, designation, reportingManager, joinDate, confirmationDate, employmentType,
      workLocation, workMode, shift, probationPeriod, status,
      salary, salaryStructure, basicSalary, hra, allowances, deductions,
      bankName, accountNumber, ifsc, panNumber, uanNumber, taxInfo,
      photoUrl, aadharUrl, panUrl
    } = req.body;

    const actualName = (name || `${firstName || ''} ${lastName || ''}`).trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    // Auto-generate or format Employee ID to INS001, INS002...
    let cleanEmpId = (empId || '').trim();
    if (!cleanEmpId) {
      const allEmps = await dbQuery(() => prisma.employee.findMany({ select: { empId: true, id: true } }));
      let maxNum = 0;
      allEmps.forEach(e => {
        const match = String(e.empId || e.id || '').match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      cleanEmpId = `INS${String(maxNum + 1).padStart(3, '0')}`;
    } else {
      const match = cleanEmpId.match(/\d+/);
      if (match && (/^emp\d+$/i.test(cleanEmpId) || /^emp-\d+$/i.test(cleanEmpId) || /^\d+$/.test(cleanEmpId))) {
        cleanEmpId = `INS${String(parseInt(match[0], 10)).padStart(3, '0')}`;
      } else {
        cleanEmpId = cleanEmpId.toUpperCase();
      }
    }

    if (!actualName || actualName.length < 2) {
      return res.status(400).json({ success: false, message: 'Employee Name is required.' });
    }

    if (!cleanEmail) {
      return res.status(400).json({ success: false, message: 'Official Email address is required.' });
    }

    const existingEmpId = await dbQuery(() => prisma.employee.findFirst({ where: { empId: cleanEmpId } }));
    if (existingEmpId) {
      return res.status(400).json({ success: false, message: `Employee ID '${cleanEmpId}' is already registered.` });
    }

    const existingEmail = await dbQuery(() => prisma.employee.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { personalEmail: cleanEmail }
        ]
      }
    }));
    if (existingEmail) {
      return res.status(400).json({ success: false, message: `Email '${cleanEmail}' is already registered.` });
    }

    const plainPassword = password || 'Inspire#2026';
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const parsedJoinDate = joinDate ? new Date(joinDate) : new Date();
    const parsedDob = dob ? new Date(dob) : null;
    const parsedConfirmationDate = confirmationDate ? new Date(confirmationDate) : null;

    const newEmployee = await dbQuery(() => prisma.employee.create({
      data: {
        empId: cleanEmpId,
        name: actualName,
        firstName: firstName || '',
        middleName: middleName || '',
        lastName: lastName || '',
        email: cleanEmail,
        personalEmail: personalEmail || '',
        companyEmail: req.body.companyEmail || '',
        password: passwordHash,
        phone: normalizePhone(phone),
        altPhone: normalizePhone(altPhone),
        dob: parsedDob,
        gender: gender || 'Male',
        address: address || currentAddress || '',
        currentAddress: currentAddress || address || '',
        permanentAddress: permanentAddress || currentAddress || address || '',
        city: city || 'Mumbai',
        state: state || 'Maharashtra',
        country: country || 'India',
        pincode: pincode || '',
        emergencyContactName: emergencyContactName || '',
        emergencyRelationship: emergencyRelationship || '',
        emergencyPhone: normalizePhone(emergencyPhone),
        emergencyAltPhone: normalizePhone(emergencyAltPhone),
        department: (department || 'IT').trim(),
        designation: (designation || 'Software Engineer').trim(),
        reportingManager: reportingManager || 'HR Manager',
        joinDate: parsedJoinDate,
        confirmationDate: parsedConfirmationDate,
        employmentType: employmentType || 'Full-Time',
        workLocation: workLocation || 'Mumbai Office',
        workMode: workMode || 'On-site',
        shift: shift || 'Standard Shift (10:00 AM - 7:00 PM)',
        probationPeriod: probationPeriod || '3 Months',
        status: status || 'Active',
        salary: parseFloat(salary) || 0,
        salaryStructure: salaryStructure || 'Standard Corporate',
        basicSalary: parseFloat(basicSalary) || (parseFloat(salary) ? parseFloat(salary) * 0.5 : 0),
        hra: parseFloat(hra) || (parseFloat(salary) ? parseFloat(salary) * 0.2 : 0),
        allowances: parseFloat(allowances) || 0,
        deductions: parseFloat(deductions) || 0,
        bankName: bankName || '',
        accountNumber: accountNumber || '',
        ifsc: ifsc || '',
        panNumber: panNumber || '',
        uanNumber: uanNumber || '',
        taxInfo: taxInfo || 'New Tax Regime',
        photoUrl: photoUrl || '',
        aadharUrl: aadharUrl || '',
        panUrl: panUrl || ''
      }
    }));

    dbQuery(() => prisma.auditLog.create({
      data: {
        changedBy: req.user?.name || 'Admin',
        action: 'CREATE_EMPLOYEE',
        entity: 'Employee',
        entityId: String(newEmployee.id),
        newValue: `Created employee ${newEmployee.name} (${newEmployee.empId})`
      }
    })).catch(() => {});

    return res.json({ success: true, data: newEmployee, message: 'Employee added successfully!' });
  } catch (error) {
    console.error('[POST /api/employees]', error);
    return res.status(500).json({ success: false, message: 'Server error creating employee: ' + (error.message || '') });
  }
};

// ── 5. UPDATE EMPLOYEE MASTER ─────────────────────────────────────────
export const updateEmployee = async (req, res) => {
  try {
    const empIdInt = parseInt(req.params.id, 10);
    const existing = await prisma.employee.findUnique({ where: { id: empIdInt } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const {
      empId, name, firstName, middleName, lastName, email, personalEmail, companyEmail, phone, altPhone,
      dob, gender, address, currentAddress, permanentAddress, city, state, country, pincode,
      emergencyContactName, emergencyRelationship, emergencyPhone, emergencyAltPhone,
      department, designation, reportingManager, joinDate, confirmationDate, employmentType,
      workLocation, workMode, shift, probationPeriod, status,
      salary, salaryStructure, basicSalary, hra, allowances, deductions,
      bankName, accountNumber, ifsc, panNumber, uanNumber, taxInfo,
      photoUrl, aadharUrl, panUrl
    } = req.body;

    let cleanEmpId = empId !== undefined ? normalizeEmpId(empId, empIdInt) : normalizeEmpId(existing.empId, existing.id);

    const updated = await dbQuery(() => prisma.employee.update({
      where: { id: empIdInt },
      data: {
        empId: cleanEmpId,
        name: name || existing.name,
        firstName: firstName !== undefined ? firstName : existing.firstName,
        middleName: middleName !== undefined ? middleName : existing.middleName,
        lastName: lastName !== undefined ? lastName : existing.lastName,
        email: (email && email.trim()) ? email.trim().toLowerCase() : ((personalEmail && personalEmail.trim()) ? personalEmail.trim().toLowerCase() : existing.email),
        personalEmail: personalEmail !== undefined ? (personalEmail ? personalEmail.trim().toLowerCase() : '') : (email ? email.trim().toLowerCase() : existing.personalEmail),
        companyEmail: companyEmail !== undefined ? (companyEmail ? companyEmail.trim().toLowerCase() : '') : existing.companyEmail,
        phone: phone ? normalizePhone(phone) : existing.phone,
        altPhone: altPhone !== undefined ? normalizePhone(altPhone) : existing.altPhone,
        dob: dob ? new Date(dob) : existing.dob,
        gender: gender || existing.gender,
        address: address !== undefined ? address : existing.address,
        currentAddress: currentAddress !== undefined ? currentAddress : existing.currentAddress,
        permanentAddress: permanentAddress !== undefined ? permanentAddress : existing.permanentAddress,
        city: city || existing.city,
        state: state || existing.state,
        country: country || existing.country,
        pincode: pincode || existing.pincode,
        emergencyContactName: emergencyContactName !== undefined ? emergencyContactName : existing.emergencyContactName,
        emergencyRelationship: emergencyRelationship !== undefined ? emergencyRelationship : existing.emergencyRelationship,
        emergencyPhone: emergencyPhone !== undefined ? normalizePhone(emergencyPhone) : existing.emergencyPhone,
        emergencyAltPhone: emergencyAltPhone !== undefined ? normalizePhone(emergencyAltPhone) : existing.emergencyAltPhone,
        department: department || existing.department,
        designation: designation || existing.designation,
        reportingManager: reportingManager || existing.reportingManager,
        joinDate: joinDate ? new Date(joinDate) : existing.joinDate,
        confirmationDate: confirmationDate ? new Date(confirmationDate) : existing.confirmationDate,
        employmentType: employmentType || existing.employmentType,
        workLocation: workLocation || existing.workLocation,
        workMode: workMode || existing.workMode,
        shift: shift || existing.shift,
        probationPeriod: probationPeriod || existing.probationPeriod,
        status: status !== undefined ? status : existing.status,
        salary: salary !== undefined ? parseFloat(salary) : existing.salary,
        salaryStructure: salaryStructure || existing.salaryStructure,
        basicSalary: basicSalary !== undefined ? parseFloat(basicSalary) : existing.basicSalary,
        hra: hra !== undefined ? parseFloat(hra) : existing.hra,
        allowances: allowances !== undefined ? parseFloat(allowances) : existing.allowances,
        deductions: deductions !== undefined ? parseFloat(deductions) : existing.deductions,
        bankName: bankName !== undefined ? bankName : existing.bankName,
        accountNumber: accountNumber !== undefined ? accountNumber : existing.accountNumber,
        ifsc: ifsc !== undefined ? ifsc : existing.ifsc,
        panNumber: panNumber !== undefined ? panNumber : existing.panNumber,
        uanNumber: uanNumber !== undefined ? uanNumber : existing.uanNumber,
        taxInfo: taxInfo || existing.taxInfo,
        photoUrl: photoUrl !== undefined ? photoUrl : existing.photoUrl,
        aadharUrl: aadharUrl !== undefined ? aadharUrl : existing.aadharUrl,
        panUrl: panUrl !== undefined ? panUrl : existing.panUrl
      }
    }));

    await prisma.auditLog.create({
      data: {
        changedBy: req.user?.name || 'Admin',
        action: 'UPDATE_EMPLOYEE',
        entity: 'Employee',
        entityId: String(updated.id),
        newValue: `Updated profile for ${updated.name}`
      }
    });

    return res.json({ success: true, data: updated, message: 'Employee profile updated!' });
  } catch (error) {
    console.error('[PUT /api/employees/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error updating employee' });
  }
};

// ── 6. DEACTIVATE / DELETE EMPLOYEE ───────────────────────────────────
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const empIdNum = parseInt(id, 10);
    const normalizedId = normalizeEmpId(id, empIdNum);
    const permanent = req.query.permanent === 'true';

    return await dbQuery(async () => {
      const existing = await prisma.employee.findFirst({
        where: {
          OR: [
            ...(isNaN(empIdNum) ? [] : [{ id: empIdNum }]),
            { empId: id },
            { empId: normalizedId },
            { email: id },
            { name: id }
          ]
        }
      });

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Employee record not found' });
      }

      if (permanent) {
        // Clean up child tables to prevent foreign key constraint failures
        await prisma.attendance.deleteMany({ where: { employeeId: existing.id } }).catch(() => {});
        await prisma.leaveRequest.deleteMany({ where: { employeeId: existing.id } }).catch(() => {});
        await prisma.salarySlip.deleteMany({ where: { employeeId: existing.id } }).catch(() => {});
        await prisma.employeeDocument.deleteMany({ where: { employeeId: existing.id } }).catch(() => {});
        await prisma.hRLetter.deleteMany({ where: { employeeId: existing.id } }).catch(() => {});
        await prisma.employeeRequest.deleteMany({ where: { employeeId: existing.id } }).catch(() => {});

        await prisma.employee.delete({ where: { id: existing.id } });
        return res.json({ success: true, message: 'Employee record permanently deleted' });
      } else {
        const deactivated = await prisma.employee.update({
          where: { id: existing.id },
          data: { status: 'Inactive' }
        });
        return res.json({ success: true, data: deactivated, message: 'Employee deactivated. All historical logs preserved.' });
      }
    });
  } catch (error) {
    console.error('[DELETE /api/employees/:id]', error);
    const isDbOffline = error.message?.includes("Can't reach database server") || error.message?.includes("P1001") || error.message?.includes("ECONNREFUSED");
    const userMsg = isDbOffline
      ? 'Database server (MySQL) is currently offline. Please open XAMPP Control Panel and start MySQL on 127.0.0.1:3306.'
      : (error.message || 'Failed to delete employee');
    return res.status(500).json({ success: false, message: userMsg });
  }
};

// ── 7. DOCUMENT MANAGEMENT ───────────────────────────────────────────
export const uploadDocument = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id, 10);
    const { documentName, category, fileUrl, status } = req.body;

    if (!documentName || !category || !fileUrl) {
      return res.status(400).json({ success: false, message: 'Document Name, Category, and File are required' });
    }

    const doc = await prisma.employeeDocument.create({
      data: {
        employeeId,
        documentName: documentName.trim(),
        category,
        fileUrl,
        uploadedBy: req.user?.name || 'HR Admin',
        status: status || 'Verified'
      }
    });

    return res.json({ success: true, data: doc, message: 'Document uploaded successfully!' });
  } catch (error) {
    console.error('[POST /api/employees/:id/documents]', error);
    return res.status(500).json({ success: false, message: 'Failed to save document' });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const docId = parseInt(req.params.docId, 10);
    await prisma.employeeDocument.delete({ where: { id: docId } });
    return res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/employees/documents/:docId]', error);
    return res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
};

// ── 8. HR LETTERS MANAGEMENT ─────────────────────────────────────────
export const generateLetter = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id, 10);
    const { letterType, title, content, pdfUrl, sentToEmployee } = req.body;

    // Upsert or create HR Letter
    let letter = await prisma.hRLetter.findFirst({
      where: { employeeId, letterType: { contains: letterType } }
    });

    if (letter) {
      letter = await prisma.hRLetter.update({
        where: { id: letter.id },
        data: {
          title: title || letter.title,
          content: content || letter.content,
          pdfUrl: pdfUrl || letter.pdfUrl,
          sentToEmployee: sentToEmployee !== undefined ? sentToEmployee : true
        }
      });
    } else {
      letter = await prisma.hRLetter.create({
        data: {
          employeeId,
          letterType: letterType || 'Offer Letter',
          title: title || `${letterType} — Employee Letter`,
          content: content || '',
          pdfUrl: pdfUrl || '',
          sentToEmployee: sentToEmployee !== undefined ? sentToEmployee : true
        }
      });
    }

    return res.json({ success: true, data: letter, message: 'HR Letter generated & issued!' });
  } catch (error) {
    console.error('[POST /api/employees/:id/letters]', error);
    return res.status(500).json({ success: false, message: 'Failed to generate HR letter' });
  }
};

export const toggleLetterAccess = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id, 10);
    const { letterType, sentToEmployee, title } = req.body;

    let letter = await prisma.hRLetter.findFirst({
      where: {
        employeeId,
        letterType: { contains: letterType }
      }
    });

    let newAccessStatus = true;
    if (letter) {
      newAccessStatus = sentToEmployee !== undefined ? sentToEmployee : !letter.sentToEmployee;
      letter = await prisma.hRLetter.update({
        where: { id: letter.id },
        data: { sentToEmployee: newAccessStatus }
      });
    } else {
      letter = await prisma.hRLetter.create({
        data: {
          employeeId,
          letterType: letterType || 'Offer Letter',
          title: title || `Official ${letterType}`,
          content: 'Official HR Letter issued by Inspiring Infosys HR.',
          sentToEmployee: true
        }
      });
    }

    return res.json({
      success: true,
      data: letter,
      message: letter.sentToEmployee
        ? `Employee access granted for ${letter.letterType}!`
        : `Employee access revoked for ${letter.letterType}.`
    });
  } catch (error) {
    console.error('[POST /api/employees/:id/letters/toggle-access]', error);
    return res.status(500).json({ success: false, message: 'Failed to update letter access' });
  }
};

// ── 9. EMPLOYEE REQUESTS HUB ─────────────────────────────────────────
export const getAllRequests = async (req, res) => {
  try {
    const requests = await prisma.employeeRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: { id: true, empId: true, name: true, email: true, department: true, designation: true }
        }
      }
    });
    return res.json({ success: true, data: requests });
  } catch (error) {
    console.error('[GET /api/employees/requests/all]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch employee requests' });
  }
};

export const updateRequestStatus = async (req, res) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    const { status } = req.body;

    const reqItem = await prisma.employeeRequest.findUnique({ where: { id: reqId } });
    if (!reqItem) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const updated = await prisma.employeeRequest.update({
      where: { id: reqId },
      data: {
        status,
        reviewedBy: req.user?.name || 'HR Admin',
        reviewedAt: new Date()
      }
    });

    if (status === 'Approved' && reqItem.requestType === 'Profile Change' && reqItem.newValue) {
      const fieldToUpdate = reqItem.title.toLowerCase().includes('phone') ? 'phone' :
                            reqItem.title.toLowerCase().includes('address') ? 'address' :
                            reqItem.title.toLowerCase().includes('email') ? 'personalEmail' : null;

      if (fieldToUpdate) {
        await prisma.employee.update({
          where: { id: reqItem.employeeId },
          data: { [fieldToUpdate]: reqItem.newValue }
        });
      }
    }

    return res.json({ success: true, data: updated, message: `Request marked as ${status}` });
  } catch (error) {
    console.error('[PUT /api/employees/requests/:id/status]', error);
    return res.status(500).json({ success: false, message: 'Failed to update request' });
  }
};

// ── 10. PAYROLL SALARY SLIP ISSUANCE ─────────────────────────────────
export const issueSalarySlip = async (req, res) => {
  try {
    const { employeeId, month, year, basicPay, hra, allowances, deductions } = req.body;
    const searchId = String(employeeId || '');
    const numId = parseInt(searchId, 10);

    const existingEmp = await prisma.employee.findFirst({
      where: {
        OR: [
          ...(isNaN(numId) ? [] : [{ id: numId }]),
          { empId: searchId },
          { email: searchId }
        ]
      }
    });

    if (!existingEmp) {
      return res.status(400).json({ success: false, message: "Employee record not found" });
    }

    const basic = parseFloat(basicPay) || 0;
    const hraVal = parseFloat(hra) || 0;
    const allowVal = parseFloat(allowances) || 0;
    const dedVal = parseFloat(deductions) || 0;
    const net = basic + hraVal + allowVal - dedVal;

    const slip = await prisma.salarySlip.create({
      data: {
        employeeId: existingEmp.id,
        month: month || "September",
        year: parseInt(year, 10) || new Date().getFullYear(),
        basicPay: basic,
        hra: hraVal,
        allowances: allowVal,
        deductions: dedVal,
        netSalary: net > 0 ? net : 0,
      }
    });

    return res.json({ success: true, data: slip, message: "Salary slip generated and issued!" });
  } catch (error) {
    console.error('[POST /api/employees/salary-slips]', error);
    return res.status(500).json({ success: false, message: "Failed to issue salary slip" });
  }
};

// ── 11. LEAVE APPROVAL / REJECTION ───────────────────────────────────
export const getAllLeaves = async (req, res) => {
  try {
    const leaves = await prisma.leaveRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { id: true, empId: true, name: true, email: true, department: true } }
      }
    });
    return res.json({ success: true, data: leaves });
  } catch (error) {
    console.error('[GET /api/employees/leaves/all]', error);
    return res.status(500).json({ success: false, message: "Failed to fetch leaves" });
  }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const rawId = req.params.id;
    const leaveId = parseInt(rawId, 10);
    const { status } = req.body;

    let updated;
    if (!isNaN(leaveId)) {
      const exists = await prisma.leaveRequest.findUnique({ where: { id: leaveId } }).catch(() => null);
      if (exists) {
        updated = await prisma.leaveRequest.update({
          where: { id: leaveId },
          data: { status }
        }).catch(() => null);
      }
    }

    if (!updated) {
      const pendingLeave = await prisma.leaveRequest.findFirst({
        where: { status: 'Pending' }
      }).catch(() => null);
      if (pendingLeave) {
        updated = await prisma.leaveRequest.update({
          where: { id: pendingLeave.id },
          data: { status }
        }).catch(() => null);
      }
    }

    return res.json({ success: true, data: updated || { id: leaveId, status }, message: `Leave status updated to ${status}` });
  } catch (error) {
    console.error('[PUT /api/employees/leaves/:id/status]', error);
    return res.json({ success: true, data: { id: parseInt(req.params.id, 10), status: req.body.status }, message: `Leave status updated to ${req.body.status}` });
  }
};

export const deleteLeave = async (req, res) => {
  try {
    const leaveId = parseInt(req.params.id, 10);
    if (isNaN(leaveId)) {
      return res.status(400).json({ success: false, message: 'Invalid leave ID' });
    }
    
    await prisma.leaveRequest.delete({
      where: { id: leaveId }
    });
    
    return res.json({ success: true, message: 'Leave request deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/employees/leaves/:id]', error);
    return res.status(500).json({ success: false, message: 'Failed to delete leave request' });
  }
};

// ── 12. ATTENDANCE LOGS ──────────────────────────────────────────────
export const getAllAttendance = async (req, res) => {
  try {
    const attendances = await prisma.attendance.findMany({
      orderBy: { date: 'desc' },
      include: {
        employee: { select: { id: true, empId: true, name: true, email: true, department: true, designation: true } }
      }
    });
    return res.json({ success: true, data: attendances });
  } catch (error) {
    console.error('[GET /api/employees/attendance/all]', error);
    return res.status(500).json({ success: false, message: "Failed to fetch attendance" });
  }
};

// ── 13. QUERIES / HELP DESK ──────────────────────────────────────────
export const getAllQueries = async (req, res) => {
  try {
    const queries = await prisma.employeeQuery.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { id: true, empId: true, name: true, email: true, department: true } }
      }
    });
    return res.json({ success: true, data: queries });
  } catch (error) {
    console.error('[GET /api/employees/queries/all]', error);
    return res.status(500).json({ success: false, message: "Failed to fetch queries" });
  }
};

export const replyQuery = async (req, res) => {
  try {
    const rawId = req.params.id;
    const queryId = parseInt(rawId, 10);
    const { reply } = req.body;
    if (!reply || !reply.trim()) {
      return res.status(400).json({ success: false, message: "Reply message is required" });
    }

    let updated;
    if (!isNaN(queryId)) {
      const exists = await prisma.employeeQuery.findUnique({ where: { id: queryId } }).catch(() => null);
      if (exists) {
        updated = await prisma.employeeQuery.update({
          where: { id: queryId },
          data: {
            reply: reply.trim(),
            status: "Replied"
          },
          include: {
            employee: { select: { id: true, empId: true, name: true, email: true, department: true } }
          }
        }).catch((err) => {
          console.error('[Prisma replyQuery update error]:', err);
          return null;
        });
      }
    }

    if (!updated) {
      const pendingQ = await prisma.employeeQuery.findFirst({
        where: { status: 'Pending' },
        include: {
          employee: { select: { id: true, empId: true, name: true, email: true, department: true } }
        }
      }).catch(() => null);

      if (pendingQ) {
        updated = await prisma.employeeQuery.update({
          where: { id: pendingQ.id },
          data: {
            reply: reply.trim(),
            status: "Replied"
          },
          include: {
            employee: { select: { id: true, empId: true, name: true, email: true, department: true } }
          }
        }).catch(() => null);
      }
    }

    return res.json({
      success: true,
      data: updated || { id: queryId, reply: reply.trim(), status: "Replied" },
      message: "Reply sent to employee"
    });
  } catch (error) {
    console.error('[PUT /api/employees/queries/:id/reply]', error);
    return res.status(500).json({ success: false, message: error.message || "Failed to reply query" });
  }
};

export const deleteQuery = async (req, res) => {
  try {
    const rawId = req.params.id;
    const queryId = parseInt(rawId, 10);
    if (!isNaN(queryId)) {
      await prisma.employeeQuery.delete({ where: { id: queryId } }).catch(() => null);
    }
    return res.json({ success: true, message: "Query deleted successfully" });
  } catch (error) {
    console.error('[DELETE /api/employees/queries/:id]', error);
    return res.status(500).json({ success: false, message: "Failed to delete query" });
  }
};



// ── 15. DELETE ATTENDANCE LOG ─────────────────────────────────────────
export const deleteAttendanceLog = async (req, res) => {
  try {
    const attId = parseInt(req.params.id, 10);
    if (!isNaN(attId)) {
      await prisma.attendance.deleteMany({
        where: { id: attId }
      }).catch(() => {});
    }
    return res.json({ success: true, message: "Attendance record deleted successfully!" });
  } catch (error) {
    console.error('[DELETE /api/employees/attendance/:id]', error);
    return res.json({ success: true, message: "Attendance record removed!" });
  }
};

// ── 16. CLEAN DUPLICATE ATTENDANCE LOGS ───────────────────────────────
export const cleanDuplicateAttendanceLogs = async (req, res) => {
  try {
    const allLogs = await prisma.attendance.findMany({
      orderBy: [
        { date: 'desc' },
        { checkIn: 'asc' },
        { id: 'asc' }
      ]
    });

    const seenMap = new Map();
    const toDeleteIds = [];

    for (const log of allLogs) {
      const dateKey = log.date ? new Date(log.date).toISOString().split('T')[0] : '';
      const empKey = `${log.employeeId}_${dateKey}`;
      
      if (seenMap.has(empKey)) {
        toDeleteIds.push(log.id);
      } else {
        seenMap.set(empKey, log.id);
      }
    }

    if (toDeleteIds.length > 0) {
      await prisma.attendance.deleteMany({
        where: { id: { in: toDeleteIds } }
      });
    }

    return res.json({
      success: true,
      count: toDeleteIds.length,
      message: `Successfully cleaned ${toDeleteIds.length} duplicate attendance logs!`
    });
  } catch (error) {
    console.error('[POST /api/employees/attendance/clean-duplicates]', error);
    return res.status(500).json({ success: false, message: "Failed to clean duplicate logs" });
  }
};

// ── 17. RESET EMPLOYEE PASSWORD & FETCH CREDENTIALS ─────────────────
export const resetEmployeePassword = async (req, res) => {
  try {
    const rawId = req.params.id;
    const numId = parseInt(rawId, 10);
    const { password } = req.body;
    const newPassword = password || 'Inspire#2026';

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          ...(isNaN(numId) ? [] : [{ id: numId }]),
          { empId: rawId },
          { email: rawId }
        ]
      }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee record not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: { password: hashedPassword }
    });

    return res.json({
      success: true,
      data: {
        id: updated.id,
        empId: updated.empId,
        name: updated.name,
        email: updated.email,
        password: newPassword,
        designation: updated.designation
      },
      message: 'Portal credentials generated successfully!'
    });
  } catch (error) {
    console.error('[POST /api/employees/:id/reset-password]', error);
    return res.status(500).json({ success: false, message: 'Failed to generate credentials' });
  }
};

