const {pool,query}=require('./pool');
let checked, retryAt=0;
function ready(){
  if(!pool)return Promise.resolve();
  if(!checked || Date.now()>=retryAt){
    retryAt=Infinity;
    checked=query("SELECT 1 FROM schema_migrations WHERE filename='007_security_and_storage.sql'").then(r=>{if(!r.rowCount)throw new Error('Run npm run setup before serving traffic.');}).catch(err=>{retryAt=Date.now()+5000;throw err;});
  }
  return checked;
}
module.exports={ready};
