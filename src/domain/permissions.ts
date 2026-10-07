export const permissionTemplates = {
  tenant_owner: [
    'tenant.manage','memberships.read','memberships.manage','professionals.read','professionals.manage',
    'patients.read','patients.manage','appointments.read','appointments.manage','resources.read','resources.manage','recalls.read','recalls.manage','intake.read','intake.manage','procedures.read','procedures.manage',
    'billing.read','billing.write','usage.read','audit.read'
  ],
  tenant_admin: [
    'memberships.read','professionals.read','professionals.manage','patients.read','patients.manage',
    'appointments.read','appointments.manage','resources.read','resources.manage','recalls.read','recalls.manage','intake.read','intake.manage','procedures.read','procedures.manage','billing.read','billing.write'
  ],
  dentist: [
    'professionals.read','patients.read','appointments.read','appointments.manage','procedures.read',
    'clinical.read','clinical.write','treatment.read','treatment.write','recalls.read','recalls.manage','resources.read'
  ],
  receptionist: [
    'professionals.read','patients.read','patients.manage','appointments.read','appointments.manage',
    'procedures.read','resources.read','recalls.read','recalls.manage','intake.read','intake.manage','billing.read','billing.write'
  ],
  assistant: ['professionals.read','patients.read','appointments.read','procedures.read','resources.read']
} as const;
