const crypto=require('node:crypto');
const {query}=require('../db/pool');
class SharedRateStore {
  constructor(prefix){this.prefix=prefix;this.localKeys=false;}
  init(options){this.windowMs=options.windowMs;}
  key(value){return crypto.createHash('sha256').update(this.prefix+':'+value).digest('hex');}
  async increment(key){
    const {rows}=await query(`INSERT INTO rate_limits(key,hits,reset_at) VALUES($1,1,now()+$2*interval '1 millisecond')
      ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.reset_at<=now() THEN 1 ELSE rate_limits.hits+1 END,
      reset_at=CASE WHEN rate_limits.reset_at<=now() THEN now()+$2*interval '1 millisecond' ELSE rate_limits.reset_at END
      RETURNING hits,reset_at`,[this.key(key),this.windowMs]);
    return {totalHits:rows[0].hits,resetTime:new Date(rows[0].reset_at)};
  }
  async decrement(key){await query('UPDATE rate_limits SET hits=greatest(0,hits-1) WHERE key=$1',[this.key(key)]);}
  async resetKey(key){await query('DELETE FROM rate_limits WHERE key=$1',[this.key(key)]);}
}
module.exports={SharedRateStore};
