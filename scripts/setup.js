// Explicit provisioning: npm run setup. Never log bootstrap credentials.
const {pool,query,transaction}=require('../src/db/pool');
const {runMigrations}=require('../src/db/migrate');
async function setup(){
  if(!pool)throw new Error('DATABASE_URL is required.');
  await runMigrations();
  await transaction(async()=>{
    await query('SELECT pg_advisory_xact_lock(71320409)');
    const active=await query("SELECT 1 FROM users WHERE role='admin' AND active LIMIT 1");
    if(!active.rowCount){
      const username=process.env.BOOTSTRAP_ADMIN_USERNAME;
      const password=process.env.BOOTSTRAP_ADMIN_PASSWORD;
      if(!username || !password || password.length<14 || Buffer.byteLength(password)>72)throw new Error('Set BOOTSTRAP_ADMIN_USERNAME and a 14+ character BOOTSTRAP_ADMIN_PASSWORD (at most 72 bytes).');
      const hash=await require('../src/services/auth.service').hashPassword(password);
      if(!await require('../src/models/user.model').createUser({username,passwordHash:hash,role:'admin',name:'Practice Admin'}))throw new Error('Bootstrap username is unavailable; choose a new administrator username.');
    }
    const collections={products:require('../src/models/product.model').products,team:require('../src/models/team.model').team,settings:[await require('../src/models/settings.model').get()]};
    for(const [name,rows]of Object.entries(collections))for(const row of rows)await query('INSERT INTO app_records(collection,id,data) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[name,row.id,row]);
  });
  console.log('Database initialized. Remove bootstrap password from the environment. Create named staff accounts in Admin.');
}
setup().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>pool?.end());
