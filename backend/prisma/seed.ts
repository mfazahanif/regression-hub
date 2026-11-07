import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Telkomsel123!', salt);

  console.log('Menghapus data lama...');
  await prisma.claimHistory.deleteMany();
  await prisma.sessionExecution.deleteMany();
  await prisma.sessionModule.deleteMany();
  await prisma.session.deleteMany();
  await prisma.testcaseNotification.deleteMany();
  await prisma.masterTestcase.deleteMany();
  await prisma.module.deleteMany();
  await prisma.status.deleteMany();
  await prisma.environment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  console.log('Menyemai (Seeding) data baru...');

  // 1. Roles
  const roleSuperAdmin = await prisma.role.create({ data: { name: 'Super Admin' } });
  const roleTechLead = await prisma.role.create({ data: { name: 'Tech Lead' } });
  const roleBA = await prisma.role.create({ data: { name: 'BA' } });
  const roleQA = await prisma.role.create({ data: { name: 'QA Member' } });

  // 2. Users
  const users = await Promise.all([
    prisma.user.create({ data: { email: 'sally@ptmitrabhakti.com', name: 'Sally', password: hashedPassword, roleId: roleSuperAdmin.id } }),
    prisma.user.create({ data: { email: 'wilyu@ptmitrabhakti.com', name: 'Wilyu', password: hashedPassword, roleId: roleTechLead.id } }),
    prisma.user.create({ data: { email: 'hera@ptmitrabhakti.com', name: 'Hera', password: hashedPassword, roleId: roleBA.id } }),
    prisma.user.create({ data: { email: 'faza@ptmitrabhakti.com', name: 'Faza', password: hashedPassword, roleId: roleQA.id } })
  ]);

  // 3. Environment
  const envPreprod1_7443 = await prisma.environment.create({ data: { name: 'Preprod1 7443' } });
  await prisma.environment.create({ data: { name: 'Preprod1 7447' } });
  await prisma.environment.create({ data: { name: 'Preprod1 7449' } });
  await prisma.environment.create({ data: { name: 'Preprod2' } });
  const envPROD = await prisma.environment.create({ data: { name: 'Prod' } });

  // 4. Statuses
  const statuses = ['PASSED', 'FAILED', 'PASSED WITH NOTES', 'BLOCKED', 'DROPPED', 'TO DO'];
  const statusRecords: Record<string, any> = {};
  for (const s of statuses) {
    statusRecords[s] = await prisma.status.create({ data: { name: s } });
  }

  // 5. Modules (Features)
  const moduleAuth = await prisma.module.create({
    data: { name: 'Authentication & Authorization', code: 'AUTH', description: 'Handles user login, signup, and roles', testcaseCount: 5 }
  });
  const moduleCart = await prisma.module.create({
    data: { name: 'Product Catalog', code: 'CAT', description: 'Product listings and search', testcaseCount: 5 }
  });
  const moduleCheckout = await prisma.module.create({
    data: { name: 'Checkout Process', code: 'CHK', description: 'Cart and payment processing', testcaseCount: 4 }
  });

  // 6. Testcases for Features
  
  // Auth Testcases
  const authTestcases = [
    { title: 'Login with valid credentials', expectedResult: 'User is successfully logged in and redirected to dashboard' },
    { title: 'Login with invalid password', expectedResult: 'Error message "Invalid password" is shown' },
    { title: 'Login with non-existent email', expectedResult: 'Error message "User not found" is shown' },
    { title: 'Register with existing email', expectedResult: 'Error message "Email already in use" is shown' },
    { title: 'Password reset link generation', expectedResult: 'Password reset link is sent to user email' },
  ];
  
  for (let i = 0; i < authTestcases.length; i++) {
    await prisma.masterTestcase.create({
      data: { 
        moduleId: moduleAuth.id, 
        testcaseId: `AUTH-${String(i+1).padStart(3, '0')}`,
        createdById: users[0].id,
        title: authTestcases[i].title, 
        expectedResult: authTestcases[i].expectedResult, 
        sequence: i + 1,
        steps: {
          create: [
            { sequence: 1, action: 'Navigate to application URL', expectedResult: 'Application loads successfully' },
            { sequence: 2, action: 'Perform required interaction for ' + authTestcases[i].title, expectedResult: 'System responds appropriately' },
            { sequence: 3, action: 'Verify the final outcome', expectedResult: authTestcases[i].expectedResult }
          ]
        }
      },
    });
  }

  // Cart Testcases
  const cartTestcases = [
    { title: 'Add in-stock item to cart', expectedResult: 'Item is added, cart counter increases by 1' },
    { title: 'Add out-of-stock item to cart', expectedResult: '"Add to Cart" button is disabled' },
    { title: 'Remove item from cart', expectedResult: 'Item disappears from cart list, total price updates' },
    { title: 'Update item quantity in cart', expectedResult: 'Total price recalculates based on new quantity' },
    { title: 'Apply valid promo code', expectedResult: 'Discount is applied to the total price' },
  ];

  for (let i = 0; i < cartTestcases.length; i++) {
    await prisma.masterTestcase.create({
      data: { 
        moduleId: moduleCart.id, 
        testcaseId: `CAT-${String(i+1).padStart(3, '0')}`,
        createdById: users[1].id,
        title: cartTestcases[i].title, 
        expectedResult: cartTestcases[i].expectedResult, 
        sequence: i + 1,
        steps: {
          create: [
            { sequence: 1, action: 'Navigate to application URL', expectedResult: 'Application loads successfully' },
            { sequence: 2, action: 'Perform required interaction for ' + cartTestcases[i].title, expectedResult: 'System responds appropriately' },
            { sequence: 3, action: 'Verify the final outcome', expectedResult: cartTestcases[i].expectedResult }
          ]
        }
      },
    });
  }

  // Checkout Testcases
  const checkoutTestcases = [
    { title: 'Proceed to checkout with empty cart', expectedResult: 'User is blocked and shown "Cart is empty" message' },
    { title: 'Select default shipping address', expectedResult: 'Shipping cost is calculated based on address' },
    { title: 'Payment via Credit Card (Valid)', expectedResult: 'Payment succeeds, order confirmation page is shown' },
    { title: 'Payment via Credit Card (Insufficient Funds)', expectedResult: 'Payment fails, user is prompted to try another method' },
  ];

  for (let i = 0; i < checkoutTestcases.length; i++) {
    await prisma.masterTestcase.create({
      data: { 
        moduleId: moduleCheckout.id, 
        testcaseId: `CHK-${String(i+1).padStart(3, '0')}`,
        createdById: users[0].id,
        title: checkoutTestcases[i].title, 
        expectedResult: checkoutTestcases[i].expectedResult, 
        sequence: i + 1,
        steps: {
          create: [
            { sequence: 1, action: 'Navigate to application URL', expectedResult: 'Application loads successfully' },
            { sequence: 2, action: 'Perform required interaction for ' + checkoutTestcases[i].title, expectedResult: 'System responds appropriately' },
            { sequence: 3, action: 'Verify the final outcome', expectedResult: checkoutTestcases[i].expectedResult }
          ]
        }
      },
    });
  }

  // 7. Session (Fixed UUID agar mudah diakses)
  const SESSION_ID = '123e4567-e89b-12d3-a456-426614174000';
  
  const session = await prisma.session.create({
    data: {
      id: SESSION_ID,
      name: 'v2.0 Full Regression',
      environmentId: envPreprod1_7443.id,
      isOpen: true,
      status: 'On Progress',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      sessionModules: {
        create: [
          { moduleId: moduleAuth.id },
          { moduleId: moduleCart.id },
          { moduleId: moduleCheckout.id },
        ],
      },
    },
  });

  // 8. Session Executions 
  const allTestcases = await prisma.masterTestcase.findMany();

  // Helper function to seed execution
  const seedExecutions = async (targetSession: any, modifier: number) => {
    for (const tc of allTestcases) {
      let statusId = statusRecords['TO DO'].id;
      let executedById = null;
      let notes = null;
      
      // Auth: mostly passed by Alice
      if (tc.moduleId === moduleAuth.id) {
        statusId = Math.random() > (0.2 * modifier) ? statusRecords['PASSED'].id : statusRecords['FAILED'].id;
        executedById = users[0].id; // Alice
        if (statusId === statusRecords['FAILED'].id) notes = 'API timeout during login attempt';
      } 
      // Cart: mostly passed with notes by Bob
      else if (tc.moduleId === moduleCart.id) {
        statusId = Math.random() > (0.5 * modifier) ? statusRecords['PASSED'].id : statusRecords['PASSED WITH NOTES'].id;
        executedById = users[1].id; // Bob
        if (statusId === statusRecords['PASSED WITH NOTES'].id) notes = 'Promo code takes 3 seconds to apply';
      } 
      // Checkout: mostly TO DO (unassigned/unexecuted)
      else {
        if (Math.random() > (0.7 * modifier)) {
          statusId = statusRecords['FAILED'].id;
          executedById = users[2].id; // Charlie
          notes = 'Stripe payment gateway integration throws 500 error';
        } else {
          statusId = statusRecords['TO DO'].id;
        }
      }

      await prisma.sessionExecution.create({
        data: {
          sessionId: targetSession.id,
          testcaseId: tc.id,
          statusId: statusId,
          executedById: executedById,
          notes: notes,
        },
      });
    }
  };

  await seedExecutions(session, 1);

  // Create Session 2
  const SESSION2_ID = '223e4567-e89b-12d3-a456-426614174001';
  const session2 = await prisma.session.create({
    data: {
      id: SESSION2_ID,
      name: 'v2.1 Hotfix Regression',
      environmentId: envPROD.id,
      isOpen: true,
      status: 'On Progress',
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      sessionModules: {
        create: [
          { moduleId: moduleAuth.id },
          { moduleId: moduleCheckout.id },
        ],
      },
    },
  });

  await seedExecutions(session2, 0.5);

  // Create Session 3 (Finished)
  const SESSION3_ID = '323e4567-e89b-12d3-a456-426614174002';
  const session3 = await prisma.session.create({
    data: {
      id: SESSION3_ID,
      name: 'v1.0 Legacy Platform Final Test',
      environmentId: envPROD.id,
      isOpen: false,
      status: 'Done',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      sessionModules: {
        create: [
          { moduleId: moduleCart.id },
        ],
      },
    },
  });
  
  // Seed executions for finished session (all passed or failed, no to-dos)
  for (const tc of allTestcases) {
    if (tc.moduleId === moduleCart.id) {
      await prisma.sessionExecution.create({
        data: {
          sessionId: session3.id,
          testcaseId: tc.id,
          statusId: Math.random() > 0.1 ? statusRecords['PASSED'].id : statusRecords['FAILED'].id,
          executedById: users[1].id,
          notes: 'Legacy test execution',
        },
      });
    }
  }


  // 9. Claim Histories (Assigning modules to users)
  // Session 1
  await prisma.claimHistory.create({
    data: {
      sessionId: session.id,
      moduleId: moduleAuth.id,
      claimedById: users[0].id, // Alice claimed Auth
      isActive: true,
    }
  });
  await prisma.claimHistory.create({
    data: {
      sessionId: session.id,
      moduleId: moduleCart.id,
      claimedById: users[1].id, // Bob claimed Cart
      isActive: true,
    }
  });
  await prisma.claimHistory.create({
    data: {
      sessionId: session.id,
      moduleId: moduleCheckout.id,
      claimedById: users[0].id, // Alice claimed Checkout
      isActive: true,
    }
  });

  // Session 2
  await prisma.claimHistory.create({
    data: {
      sessionId: session2.id,
      moduleId: moduleAuth.id,
      claimedById: users[1].id, // Bob claimed Auth
      isActive: true,
    }
  });
  await prisma.claimHistory.create({
    data: {
      sessionId: session2.id,
      moduleId: moduleCheckout.id,
      claimedById: users[2].id, // Charlie claimed Checkout
      isActive: true,
    }
  });

  // Session 3
  await prisma.claimHistory.create({
    data: {
      sessionId: session3.id,
      moduleId: moduleCart.id,
      claimedById: users[1].id, // Bob claimed Cart
      isActive: true,
    }
  });

  console.log(`\n\n🎉 Seeding berhasil!`);
  console.log(`👉 Silakan buka browser Anda di: http://localhost:3000/dashboard/sessions/${session.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
