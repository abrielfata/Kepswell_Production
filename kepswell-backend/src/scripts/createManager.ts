import bcrypt from 'bcryptjs';
import { query } from '../config/db';

async function createManager() {
    const email     = 'manager@kepstore.com';
    const password  = 'manager123';
    const full_name = 'Manager Kepstore';

    const hash = await bcrypt.hash(password, 10);

    await query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, 'MANAGER')
         ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
        [email, hash, full_name]
    );

    console.log('✅ Manager created');
    console.log(`   Email    : ${email}`);
    console.log(`   Password : ${password}`);
    process.exit(0);
}

createManager().catch(err => {
    console.error('❌', err.message);
    process.exit(1);
});
