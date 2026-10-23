export const WAITING_ROOM_SCRIPT = `-- All keys share an event hash tag: Redis Cluster-compatible atomic admission.
-- KEYS: queue, active, sequence, metadata, deadlines. ARGV: uid,sid,nonce,capacity,leaseMs,queueMs,operation
local stamp=redis.call('TIME'); local now=tonumber(stamp[1])*1000+math.floor(tonumber(stamp[2])/1000)
local uid,sid,nonce=ARGV[1],ARGV[2],ARGV[3]
local capacity,lease,queueLife=tonumber(ARGV[4]),tonumber(ARGV[5]),tonumber(ARGV[6])
local op=ARGV[7]
local expired=redis.call('ZRANGEBYSCORE',KEYS[5],'-inf',now,'LIMIT',0,1000)
for _,id in ipairs(expired) do
  redis.call('ZREM',KEYS[1],id);redis.call('ZREM',KEYS[2],id);redis.call('ZREM',KEYS[5],id);redis.call('HDEL',KEYS[4],id)
end
redis.call('ZREMRANGEBYSCORE',KEYS[2],'-inf',now)
local raw=redis.call('HGET',KEYS[4],uid);local m=raw and cjson.decode(raw) or nil
-- Always expire the caller even when a large cleanup batch remains.
if m and tonumber(m.expiresAt)<=now then
 redis.call('ZREM',KEYS[1],uid);redis.call('ZREM',KEYS[2],uid);redis.call('ZREM',KEYS[5],uid);redis.call('HDEL',KEYS[4],uid);m=nil
end
if op=='validate' then
  if not m or m.sid~=sid or m.nonce~=nonce or m.state~='ADMITTED' or tonumber(m.expiresAt)<=now then return cjson.encode({valid=false,serverTime=now}) end
  local score=redis.call('ZSCORE',KEYS[2],uid)
  return cjson.encode({valid=score~=false and tonumber(score)>now,expiresAt=m.expiresAt,serverTime=now})
end
if op=='leave' then
  if m and m.sid==sid then redis.call('ZREM',KEYS[1],uid);redis.call('ZREM',KEYS[2],uid);redis.call('ZREM',KEYS[5],uid);redis.call('HDEL',KEYS[4],uid);m=nil end
elseif not m and op=='join' then
  m={sid=sid,nonce=nonce,state='WAITING',expiresAt=now+queueLife}
  redis.call('HSET',KEYS[4],uid,cjson.encode(m));redis.call('ZADD',KEYS[1],redis.call('INCR',KEYS[3]),uid);redis.call('ZADD',KEYS[5],m.expiresAt,uid)
end
local iterations=0
while redis.call('ZCARD',KEYS[2])<capacity and iterations<1000 do
  iterations=iterations+1
  local nextId=redis.call('ZRANGE',KEYS[1],0,0)[1]
  if not nextId then break end
  redis.call('ZREM',KEYS[1],nextId)
  local data=redis.call('HGET',KEYS[4],nextId)
  if data then
    local next=cjson.decode(data)
    if tonumber(next.expiresAt)>now then
      next.state='ADMITTED';next.admittedAt=now;next.expiresAt=now+lease
      redis.call('HSET',KEYS[4],nextId,cjson.encode(next));redis.call('ZADD',KEYS[2],next.expiresAt,nextId);redis.call('ZADD',KEYS[5],next.expiresAt,nextId)
    else redis.call('HDEL',KEYS[4],nextId);redis.call('ZREM',KEYS[5],nextId) end
  end
end
for _,key in ipairs(KEYS) do redis.call('PEXPIRE',key,86400000) end
raw=redis.call('HGET',KEYS[4],uid);m=raw and cjson.decode(raw) or nil
if not m then return cjson.encode({state='NOT_JOINED',serverTime=now,queued=redis.call('ZCARD',KEYS[1]),active=redis.call('ZCARD',KEYS[2])}) end
local position=redis.call('ZRANK',KEYS[1],uid)
m.position=position and tonumber(position)+1 or 0;m.serverTime=now;m.queued=redis.call('ZCARD',KEYS[1]);m.active=redis.call('ZCARD',KEYS[2])
return cjson.encode(m)
`;
