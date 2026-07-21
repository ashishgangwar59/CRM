import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'CRM API Docs',
        version: '1.0',
        description: 'Comprehensive API documentation for the CRM application',
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [
        {
          BearerAuth: [],
        },
      ],
      paths: {
        '/api/auth/login': {
          post: {
            summary: 'Authenticate user',
            tags: ['Auth'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                      email: { type: 'string' },
                      password: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Successful login' },
            },
          },
        },
        '/api/auth/logout': {
          post: {
            summary: 'Logout user',
            tags: ['Auth'],
            responses: {
              200: { description: 'Successful logout' },
            },
          },
        },
        '/api/auth/me': {
          get: {
            summary: 'Get current user profile',
            tags: ['Auth'],
            responses: {
              200: { description: 'User profile details' },
            },
          },
          put: {
            summary: 'Update current user profile',
            tags: ['Auth'],
            responses: {
              200: { description: 'Profile updated' },
            },
          },
        },
        '/api/auth/me/password': {
          put: {
            summary: 'Change current user password',
            tags: ['Auth'],
            responses: {
              200: { description: 'Password changed successfully' },
            },
          },
        },
        '/api/auth/refresh': {
          post: {
            summary: 'Refresh access token',
            tags: ['Auth'],
            responses: {
              200: { description: 'Token refreshed' },
            },
          },
        },
        '/api/auth/forgot-password': {
          post: {
            summary: 'Send password reset link',
            tags: ['Auth'],
            responses: {
              200: { description: 'Reset email sent' },
            },
          },
        },
        '/api/auth/reset-password': {
          post: {
            summary: 'Reset password using token',
            tags: ['Auth'],
            responses: {
              200: { description: 'Password reset successful' },
            },
          },
        },
        '/api/leads': {
          get: {
            summary: 'Get all leads',
            tags: ['Leads'],
            responses: {
              200: { description: 'List of leads' },
            },
          },
          post: {
            summary: 'Create a new lead',
            tags: ['Leads'],
            responses: {
              201: { description: 'Lead created successfully' },
            },
          },
        },
        '/api/leads/{id}': {
          get: {
            summary: 'Get lead by ID',
            tags: ['Leads'],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'Lead details' },
            },
          },
          put: {
            summary: 'Update lead by ID',
            tags: ['Leads'],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'Lead updated' },
            },
          },
          delete: {
            summary: 'Delete lead by ID',
            tags: ['Leads'],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'Lead deleted' },
            },
          },
        },
        '/api/leads/{id}/activity': {
          post: {
            summary: 'Add activity to a lead',
            tags: ['Leads'],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'Activity logged' },
            },
          },
        },
        '/api/leads/{id}/upload': {
          post: {
            summary: 'Upload attachment to a lead',
            tags: ['Leads'],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'File uploaded' },
            },
          },
        },
        '/api/employees': {
          get: {
            summary: 'Get all employees',
            tags: ['Employees'],
            responses: {
              200: { description: 'List of employees' },
            },
          },
          post: {
            summary: 'Create employee & user account',
            tags: ['Employees'],
            responses: {
              201: { description: 'Employee created' },
            },
          },
        },
        '/api/employees/{id}': {
          get: {
            summary: 'Get employee by ID',
            tags: ['Employees'],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'Employee details' },
            },
          },
          put: {
            summary: 'Update employee by ID',
            tags: ['Employees'],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'Employee updated' },
            },
          },
          delete: {
            summary: 'Delete employee by ID',
            tags: ['Employees'],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'Employee deleted' },
            },
          },
        },
        '/api/employees/{id}/password': {
          put: {
            summary: 'Reset employee password',
            tags: ['Employees'],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'Password reset successful' },
            },
          },
        },
        '/api/employees/import': {
          post: {
            summary: 'Import employees from CSV',
            tags: ['Employees'],
            responses: {
              200: { description: 'Employees imported' },
            },
          },
        },
        '/api/employees/export': {
          post: {
            summary: 'Export employees to CSV',
            tags: ['Employees'],
            responses: {
              200: { description: 'Employees exported successfully' },
            },
          },
        },
        '/api/employees/upload': {
          post: {
            summary: 'Upload employee documents',
            tags: ['Employees'],
            responses: {
              200: { description: 'Document uploaded' },
            },
          },
        },
        '/api/employees/check-email': {
          post: {
            summary: 'Check if email is available',
            tags: ['Employees'],
            responses: {
              200: { description: 'Email availability status' },
            },
          },
        },
        '/api/attendance/punch': {
          post: {
            summary: 'Punch In / Punch Out',
            tags: ['Attendance'],
            responses: {
              200: { description: 'Attendance logged' },
            },
          },
        },
        '/api/attendance/today': {
          get: {
            summary: "Get today's attendance status",
            tags: ['Attendance'],
            responses: {
              200: { description: 'Punch status' },
            },
          },
        },
        '/api/attendance/monthly': {
          get: {
            summary: 'Get monthly attendance report',
            tags: ['Attendance'],
            responses: {
              200: { description: 'Attendance logs' },
            },
          },
        },
        '/api/attendance/manager': {
          get: {
            summary: 'Get employee attendance for manager',
            tags: ['Attendance'],
            responses: {
              200: { description: 'Attendance logs' },
            },
          },
        },
        '/api/leave': {
          get: {
            summary: 'Get leave requests',
            tags: ['Leaves'],
            responses: {
              200: { description: 'Leave requests list' },
            },
          },
          post: {
            summary: 'Apply for leave',
            tags: ['Leaves'],
            responses: {
              201: { description: 'Leave applied successfully' },
            },
          },
        },
        '/api/leave/balances': {
          get: {
            summary: 'Get leave balances',
            tags: ['Leaves'],
            responses: {
              200: { description: 'Leave balances' },
            },
          },
        },
        '/api/leave/manager': {
          put: {
            summary: 'Approve or reject leave request',
            tags: ['Leaves'],
            responses: {
              200: { description: 'Leave status updated' },
            },
          },
        },
        '/api/leave/cancel': {
          post: {
            summary: 'Cancel a leave request',
            tags: ['Leaves'],
            responses: {
              200: { description: 'Leave request cancelled' },
            },
          },
        },
        '/api/holidays': {
          get: {
            summary: 'Get all holidays',
            tags: ['Holidays'],
            responses: {
              200: { description: 'Holidays list' },
            },
          },
          post: {
            summary: 'Add a new holiday',
            tags: ['Holidays'],
            responses: {
              201: { description: 'Holiday added' },
            },
          },
        },
        '/api/payroll': {
          get: {
            summary: 'Get payroll entries',
            tags: ['Payroll'],
            responses: {
              200: { description: 'Payroll list' },
            },
          },
          post: {
            summary: 'Create payroll setup',
            tags: ['Payroll'],
            responses: {
              201: { description: 'Payroll created' },
            },
          },
        },
        '/api/payroll/generate': {
          post: {
            summary: 'Generate monthly payroll',
            tags: ['Payroll'],
            responses: {
              200: { description: 'Payroll generated' },
            },
          },
        },
        '/api/payroll/structure': {
          get: {
            summary: 'Get payroll structure template',
            tags: ['Payroll'],
            responses: {
              200: { description: 'Structure details' },
            },
          },
        },
        '/api/payroll/{id}': {
          get: {
            summary: 'Get specific payroll slip details',
            tags: ['Payroll'],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'Payroll slip' },
            },
          },
        },
        '/api/payroll/{id}/email': {
          post: {
            summary: 'Send payroll slip via email',
            tags: ['Payroll'],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'Email sent' },
            },
          },
        },
        '/api/payroll/payment': {
          post: {
            summary: 'Record payment for payroll',
            tags: ['Payroll'],
            responses: {
              200: { description: 'Payment recorded' },
            },
          },
        },
        '/api/payroll/payment/history': {
          get: {
            summary: 'Get payment history',
            tags: ['Payroll'],
            responses: {
              200: { description: 'Payment history list' },
            },
          },
        },
        '/api/wallet': {
          get: {
            summary: 'Get company wallet balance',
            tags: ['Wallet'],
            responses: {
              200: { description: 'Wallet balance info' },
            },
          },
          post: {
            summary: 'Perform wallet operations (admin)',
            tags: ['Wallet'],
            responses: {
              200: { description: 'Wallet updated' },
            },
          },
        },
        '/api/employee-wallet': {
          get: {
            summary: 'Get employee wallet balance',
            tags: ['Wallet'],
            responses: {
              200: { description: 'Employee wallet info' },
            },
          },
        },
        '/api/wallet/transaction': {
          post: {
            summary: 'Record wallet transaction',
            tags: ['Wallet'],
            responses: {
              200: { description: 'Transaction recorded' },
            },
          },
        },
        '/api/dashboard/admin': {
          get: {
            summary: 'Get dashboard statistics for Admin',
            tags: ['Dashboard'],
            responses: {
              200: { description: 'Admin statistics' },
            },
          },
        },
        '/api/dashboard/employee': {
          get: {
            summary: 'Get dashboard statistics for Employee',
            tags: ['Dashboard'],
            responses: {
              200: { description: 'Employee statistics' },
            },
          },
        },
        '/api/reports/leads': {
          get: {
            summary: 'Get leads performance report',
            tags: ['Reports'],
            responses: {
              200: { description: 'Leads report data' },
            },
          },
        },
        '/api/reports/leads/timeline': {
          get: {
            summary: 'Get leads activity timeline report',
            tags: ['Reports'],
            responses: {
              200: { description: 'Timeline data' },
            },
          },
        },
        '/api/reports/notifications': {
          get: {
            summary: 'Get report notifications log',
            tags: ['Reports'],
            responses: {
              200: { description: 'Notifications' },
            },
          },
        },
        '/api/reports/audit': {
          get: {
            summary: 'Get audit trail logs',
            tags: ['Reports'],
            responses: {
              200: { description: 'Audit logs' },
            },
          },
        },
        '/api/reports/generator': {
          post: {
            summary: 'Generate customized PDF/Excel report',
            tags: ['Reports'],
            responses: {
              200: { description: 'Generated file metadata' },
            },
          },
        },
        '/api/settings': {
          get: {
            summary: 'Get CRM system settings',
            tags: ['Settings'],
            responses: {
              200: { description: 'System settings data' },
            },
          },
          post: {
            summary: 'Update CRM system settings',
            tags: ['Settings'],
            responses: {
              200: { description: 'Settings updated' },
            },
          },
        },
        '/api/migrate': {
          post: {
            summary: 'Trigger DB migration script',
            tags: ['Migration'],
            responses: {
              200: { description: 'Migration status' },
            },
          },
        },
        '/api/migrate/replace': {
          post: {
            summary: 'Replace migration helper',
            tags: ['Migration'],
            responses: {
              200: { description: 'Field replacement completed' },
            },
          },
        },
      },
    },
  });
  return spec;
};

