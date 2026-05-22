import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EduSync API',
      version: '1.0.0',
      description: `
## EduSync — Nigerian School Management Platform API

A production-ready multi-tenant school management backend supporting:
- Multi-branch schools
- Nigerian standard results (WAEC grading)
- CBT exams (online + offline)
- Attendance with QR code
- Parent/Student/Teacher portals
- Subscription & payments via KoraPay
- SuperAdmin platform management

## Authentication
Most endpoints require a Bearer token obtained from the login endpoints.

\`\`\`
Authorization: Bearer <token>
\`\`\`

## Roles
| Role | Description |
|------|-------------|
| superadmin | Full platform access |
| schooladmin | Full school access |
| teacher | Class/subject access |
| student | Student portal |
| parent | Parent portal |
      `,
      contact: {
        name: 'EduSync Support',
        email: 'support@edusync.ng',
        url: 'https://edusync.ng',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1`,
        description: 'Development Server',
      },
      {
        url: 'https://api.edusync.ng/api/v1',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        // ─── SUCCESS RESPONSE ───────────────────────────────────────────
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Success' },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Something went wrong' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' },
          },
        },

        // ─── AUTH ────────────────────────────────────────────────────────
        RegisterSchoolInput: {
          type: 'object',
          required: [
            'schoolName', 'branchName', 'branchAddress',
            'adminEmail', 'adminPassword', 'adminFirstName', 'adminLastName',
          ],
          properties: {
            schoolName: { type: 'string', example: "God's Grace Royal Schools" },
            branchName: { type: 'string', example: 'Main Branch' },
            branchAddress: { type: 'string', example: 'Behind Cele 1, Idanyin, Ogun State' },
            adminEmail: { type: 'string', format: 'email', example: 'admin@school.ng' },
            adminPassword: { type: 'string', minLength: 8, example: 'Admin@1234' },
            adminFirstName: { type: 'string', example: 'John' },
            adminLastName: { type: 'string', example: 'Balogun' },
            phone: { type: 'string', example: '08012345678' },
          },
        },
        LoginEmailInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@school.ng' },
            password: { type: 'string', example: 'Admin@1234' },
          },
        },
        LoginStudentInput: {
          type: 'object',
          required: ['schoolId', 'branchId', 'admissionNumber', 'lastName'],
          properties: {
            schoolId: { type: 'string', example: '64a9f1234abc123456789012' },
            branchId: { type: 'string', example: '64a9f1234abc123456789013' },
            admissionNumber: { type: 'string', example: 'STU-24-ABC12' },
            lastName: { type: 'string', example: 'Balogun' },
          },
        },
        LoginParentInput: {
          type: 'object',
          required: ['schoolId', 'branchId', 'phone', 'surname'],
          properties: {
            schoolId: { type: 'string', example: '64a9f1234abc123456789012' },
            branchId: { type: 'string', example: '64a9f1234abc123456789013' },
            phone: { type: 'string', example: '08012345678' },
            surname: { type: 'string', example: 'Balogun' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: { $ref: '#/components/schemas/User' },
            message: { type: 'string', example: 'Welcome back, John!' },
            warning: { type: 'string', nullable: true },
          },
        },

        // ─── SCHOOL ──────────────────────────────────────────────────────
        School: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: "God's Grace Royal Schools" },
            slug: { type: 'string', example: 'gods-grace-royal-schools-abc123' },
            email: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string' },
            logoUrl: { type: 'string', nullable: true },
            subscriptionStatus: {
              type: 'string',
              enum: ['trial', 'active', 'expired', 'suspended'],
            },
            trialEndsAt: { type: 'string', format: 'date-time' },
            subscriptionEndsAt: { type: 'string', format: 'date-time', nullable: true },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ─── BRANCH ──────────────────────────────────────────────────────
        Branch: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            schoolId: { type: 'string' },
            name: { type: 'string', example: 'Main Branch' },
            address: { type: 'string' },
            phone: { type: 'string', nullable: true },
            email: { type: 'string', nullable: true },
            logoUrl: { type: 'string', nullable: true },
            principalName: { type: 'string', nullable: true },
            principalSignatureUrl: { type: 'string', nullable: true },
            whatsappGroupLink: { type: 'string', nullable: true },
            isMainBranch: { type: 'boolean' },
            isActive: { type: 'boolean' },
          },
        },
        CreateBranchInput: {
          type: 'object',
          required: ['name', 'address'],
          properties: {
            name: { type: 'string', example: 'Ikorodu Branch' },
            address: { type: 'string', example: '12 Lagos Road, Ikorodu' },
            phone: { type: 'string', example: '08012345679' },
            email: { type: 'string', example: 'ikorodu@school.ng' },
            principalName: { type: 'string', example: 'Mrs Adebayo' },
            whatsappGroupLink: { type: 'string', example: 'https://chat.whatsapp.com/xxx' },
          },
        },

        // ─── USER ────────────────────────────────────────────────────────
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            schoolId: { type: 'string' },
            branchId: { type: 'string' },
            role: {
              type: 'string',
              enum: ['superadmin', 'schooladmin', 'teacher', 'student', 'parent'],
            },
            firstName: { type: 'string', example: 'Taiwo' },
            lastName: { type: 'string', example: 'Balogun' },
            middleName: { type: 'string', nullable: true },
            email: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true },
            gender: { type: 'string', enum: ['male', 'female'], nullable: true },
            dateOfBirth: { type: 'string', format: 'date', nullable: true },
            admissionNumber: { type: 'string', nullable: true },
            staffId: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            isEmailVerified: { type: 'boolean' },
            profileImageUrl: { type: 'string', nullable: true },
            passportUrl: { type: 'string', nullable: true },
            lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ─── STUDENT ─────────────────────────────────────────────────────
        CreateStudentInput: {
          type: 'object',
          required: [
            'firstName', 'lastName', 'gender', 'dateOfBirth', 'classId',
            'homeAddress', 'city', 'state',
            'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship',
            'parentFirstName', 'parentLastName', 'parentPhone',
          ],
          properties: {
            firstName: { type: 'string', example: 'Taiwo' },
            lastName: { type: 'string', example: 'Balogun' },
            middleName: { type: 'string', example: 'Emmanuel' },
            gender: { type: 'string', enum: ['male', 'female'] },
            dateOfBirth: { type: 'string', format: 'date', example: '2010-05-14' },
            classId: { type: 'string', example: '64a9f1234abc123456789014' },
            admissionDate: { type: 'string', format: 'date' },
            homeAddress: { type: 'string', example: '14 Adeola Street, Ikeja' },
            city: { type: 'string', example: 'Ikeja' },
            state: { type: 'string', example: 'Lagos' },
            nationality: { type: 'string', example: 'Nigerian' },
            stateOfOrigin: { type: 'string', example: 'Ogun' },
            lgaOfOrigin: { type: 'string', example: 'Ijebu Ode' },
            religion: { type: 'string', example: 'Christianity' },
            bloodGroup: { type: 'string', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
            genotype: { type: 'string', enum: ['AA', 'AS', 'SS', 'AC', 'SC'] },
            medicalConditions: { type: 'string' },
            allergies: { type: 'string' },
            emergencyContactName: { type: 'string', example: 'Mr Balogun' },
            emergencyContactPhone: { type: 'string', example: '08012345678' },
            emergencyContactRelationship: { type: 'string', example: 'Father' },
            parentFirstName: { type: 'string', example: 'Adebayo' },
            parentLastName: { type: 'string', example: 'Balogun' },
            parentPhone: { type: 'string', example: '08087654321' },
            parentEmail: { type: 'string', example: 'parent@gmail.com' },
            parentRelationship: { type: 'string', enum: ['father', 'mother', 'guardian'] },
            previousSchoolName: { type: 'string' },
            previousClass: { type: 'string' },
            reasonForLeaving: { type: 'string' },
          },
        },

        // ─── TEACHER ─────────────────────────────────────────────────────
        CreateTeacherInput: {
          type: 'object',
          required: [
            'firstName', 'lastName', 'email', 'phone',
            'gender', 'dateOfBirth', 'password',
            'homeAddress', 'city', 'state', 'qualification',
          ],
          properties: {
            firstName: { type: 'string', example: 'Amaka' },
            lastName: { type: 'string', example: 'Okonkwo' },
            middleName: { type: 'string' },
            email: { type: 'string', format: 'email', example: 'amaka@school.ng' },
            phone: { type: 'string', example: '08011223344' },
            gender: { type: 'string', enum: ['male', 'female'] },
            dateOfBirth: { type: 'string', format: 'date', example: '1990-03-22' },
            password: { type: 'string', minLength: 8, example: 'Teacher@123' },
            homeAddress: { type: 'string', example: '5 Musa Close, Surulere' },
            city: { type: 'string', example: 'Surulere' },
            state: { type: 'string', example: 'Lagos' },
            nationality: { type: 'string', example: 'Nigerian' },
            qualification: { type: 'string', example: 'B.Ed Mathematics' },
            specialization: { type: 'string', example: 'Mathematics' },
            yearsOfExperience: { type: 'integer', example: 5 },
            assignedClassIds: {
              type: 'array',
              items: { type: 'string' },
            },
            assignedSubjectIds: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },

        // ─── CLASS ───────────────────────────────────────────────────────
        Class: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            schoolId: { type: 'string' },
            branchId: { type: 'string' },
            name: { type: 'string', example: 'JSS3' },
            category: {
              type: 'string',
              enum: ['KG', 'Nursery', 'Primary', 'JSS', 'SSS'],
            },
            formTeacherId: { type: 'string', nullable: true },
            studentIds: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' },
          },
        },

        // ─── SUBJECT ─────────────────────────────────────────────────────
        Subject: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            schoolId: { type: 'string' },
            branchId: { type: 'string' },
            classId: { type: 'string' },
            name: { type: 'string', example: 'Mathematics' },
            code: { type: 'string', nullable: true },
            teacherId: { type: 'string', nullable: true },
            isDefault: { type: 'boolean' },
            isActive: { type: 'boolean' },
          },
        },

        // ─── ATTENDANCE ──────────────────────────────────────────────────
        AttendanceRecord: {
          type: 'object',
          required: ['studentId', 'classId', 'status'],
          properties: {
            studentId: { type: 'string' },
            classId: { type: 'string' },
            status: { type: 'string', enum: ['present', 'absent', 'late'] },
            method: { type: 'string', enum: ['qr', 'manual'], default: 'manual' },
            note: { type: 'string' },
          },
        },
        MarkAttendanceInput: {
          type: 'object',
          required: ['records'],
          properties: {
            records: {
              type: 'array',
              items: { $ref: '#/components/schemas/AttendanceRecord' },
            },
          },
        },

        // ─── RESULT ──────────────────────────────────────────────────────
        SubjectScoreInput: {
          type: 'object',
          required: ['subjectId', 'ca1', 'ca2', 'exam'],
          properties: {
            subjectId: { type: 'string', example: '64a9f1234abc123456789015' },
            ca1: { type: 'number', minimum: 0, maximum: 20, example: 17 },
            ca2: { type: 'number', minimum: 0, maximum: 20, example: 8 },
            exam: { type: 'number', minimum: 0, maximum: 60, example: 45 },
          },
        },
        UpsertResultInput: {
          type: 'object',
          required: ['studentId', 'classId', 'term', 'session', 'subjectId', 'ca1', 'ca2', 'exam'],
          properties: {
            studentId: { type: 'string' },
            classId: { type: 'string' },
            term: { type: 'string', enum: ['first', 'second', 'third'] },
            session: { type: 'string', example: '2024/2025' },
            subjectId: { type: 'string' },
            ca1: { type: 'number', minimum: 0, maximum: 20 },
            ca2: { type: 'number', minimum: 0, maximum: 20 },
            exam: { type: 'number', minimum: 0, maximum: 60 },
          },
        },
        BulkStudentResultInput: {
          type: 'object',
          required: ['studentId', 'classId', 'term', 'session', 'subjects'],
          properties: {
            studentId: { type: 'string' },
            classId: { type: 'string' },
            term: { type: 'string', enum: ['first', 'second', 'third'] },
            session: { type: 'string', example: '2024/2025' },
            subjects: {
              type: 'array',
              items: { $ref: '#/components/schemas/SubjectScoreInput' },
            },
          },
        },
        BulkClassResultInput: {
          type: 'object',
          required: ['classId', 'subjectId', 'term', 'session', 'entries'],
          properties: {
            classId: { type: 'string' },
            subjectId: { type: 'string' },
            term: { type: 'string', enum: ['first', 'second', 'third'] },
            session: { type: 'string', example: '2024/2025' },
            entries: {
              type: 'array',
              items: {
                type: 'object',
                required: ['studentId', 'ca1', 'ca2', 'exam'],
                properties: {
                  studentId: { type: 'string' },
                  ca1: { type: 'number', minimum: 0, maximum: 20 },
                  ca2: { type: 'number', minimum: 0, maximum: 20 },
                  exam: { type: 'number', minimum: 0, maximum: 60 },
                },
              },
            },
          },
        },

        // ─── CBT ─────────────────────────────────────────────────────────
        CBTQuestion: {
          type: 'object',
          properties: {
            text: { type: 'string', example: 'What is 2 + 2?' },
            options: {
              type: 'array',
              items: { type: 'string' },
              example: ['2', '3', '4', '5'],
            },
            correctIndex: { type: 'integer', example: 2 },
            marks: { type: 'integer', example: 1 },
          },
        },
        CreateCBTExamInput: {
          type: 'object',
          required: ['classId', 'subjectId', 'title', 'durationMinutes', 'questions'],
          properties: {
            classId: { type: 'string' },
            subjectId: { type: 'string' },
            title: { type: 'string', example: 'First Term Mathematics Exam' },
            instructions: { type: 'string' },
            term: { type: 'string', example: 'first' },
            session: { type: 'string', example: '2024/2025' },
            durationMinutes: { type: 'integer', example: 40 },
            shuffleQuestions: { type: 'boolean', default: true },
            offlineAvailable: { type: 'boolean', default: false },
            startsAt: { type: 'string', format: 'date-time' },
            endsAt: { type: 'string', format: 'date-time' },
            questions: {
              type: 'array',
              items: { $ref: '#/components/schemas/CBTQuestion' },
            },
          },
        },

        // ─── COMMUNITY ───────────────────────────────────────────────────
        CreatePostInput: {
          type: 'object',
          required: ['title', 'body', 'type'],
          properties: {
            title: { type: 'string', example: 'End of Term Party — Friday!' },
            body: { type: 'string', example: 'Parents are invited to the school end of term party...' },
            type: { type: 'string', enum: ['news', 'event', 'discussion'] },
            whatsappLink: { type: 'string', example: 'https://chat.whatsapp.com/xxx' },
            eventDate: { type: 'string', format: 'date' },
          },
        },

        
// tags: [
      // { name: 'ID Cards', description: 'ID card generation and printing — ₦300 per card' },
      // { name: 'Non-Teaching Staff', description: 'Non-teaching staff management with QR attendance' },
      // Ensure there is a comma between these objects and they are inside the tags array
    // ],
        // ─── SUBSCRIPTION ────────────────────────────────────────────────
        InitPaymentInput: {
          type: 'object',
          required: ['plan'],
          properties: {
            plan: {
              type: 'string',
              enum: ['monthly', 'termly', 'annual'],
              description: 'monthly=₦5,000 | termly=₦12,000 | annual=₦40,000',
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & account management' },
      { name: 'School', description: 'School profile, logo, signature' },
      { name: 'Branches', description: 'Multi-branch management' },
      { name: 'Students', description: 'Student enrolment & profiles' },
      { name: 'Teachers', description: 'Teacher management' },
      { name: 'Classes', description: 'Class management' },
      { name: 'Subjects', description: 'Subject management' },
      { name: 'Attendance', description: 'Attendance marking & reports' },
      { name: 'Results', description: 'Nigerian standard results & tokens' },
      { name: 'CBT', description: 'Computer Based Tests' },
      { name: 'Resources & Assignments', description: 'Learning materials' },
      { name: 'Community', description: 'School community board' },
      { name: 'Notifications', description: 'In-app notifications' },
      { name: 'Subscriptions', description: 'Payments via KoraPay' },
      { name: 'Dashboard', description: 'Role-based dashboards' },
      { name: 'Offline Sync', description: 'Offline data sync' },
      { name: 'SuperAdmin', description: 'Platform-wide management' },
      { name: 'ID Cards', description: 'ID card generation and printing — ₦300 per card' },
{ name: 'Non-Teaching Staff', description: 'Non-teaching staff management with QR attendance' },
    ],
  },
  
  apis: [
  './src/modules/**/*.routes.ts',
  './src/modules/**/*.swagger.ts',
],
  // apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.swagger.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);