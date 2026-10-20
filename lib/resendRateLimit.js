'use strict';
// Both mail workers share the same Resend key in this server process.
let nextSlot=0;
async function waitForResendSlot(){
  const now=Date.now(),slot=Math.max(now,nextSlot);
  nextSlot=slot+700;
  if(slot>now)await new Promise(resolve=>setTimeout(resolve,slot-now));
}
module.exports={waitForResendSlot};
