// Managed-local ingress admission only. Not a global D1 transaction barrier or
// Windows process shutdown permission. Disabled when the deployment does not
// explicitly configure LOCAL_OPS_GATEWAY_REQUIRED=1.
type GateEnv={ LOCAL_OPS_GATEWAY_REQUIRED?:string; LOCAL_OPS_INGRESS_PROOF?:string };
async function digest(input:string):Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(input)));
}
async function safeEqual(a:string,b:string):Promise<boolean> {
  const [left,right]=await Promise.all([digest(a),digest(b)]);
  let diff=left.length^right.length;
  for(let i=0;i<Math.max(left.length,right.length);i++)diff|=(left[i]??0)^(right[i]??0);
  return diff===0;
}
export async function verifyManagedIngress(request:Request, env:GateEnv):Promise<Response|null> {
  if(env.LOCAL_OPS_GATEWAY_REQUIRED!=="1")return null;
  const secret=env.LOCAL_OPS_INGRESS_PROOF??"";
  if(secret.length<32)return Response.json({ok:false,code:"MANAGED_GATEWAY_CONFIGURATION_MISSING"},
    {status:503,headers:{"cache-control":"no-store"}});
  const proof=request.headers.get("x-local-ops-ingress-proof")??"";
  if(proof.length!==secret.length||!await safeEqual(proof,secret))
    return Response.json({ok:false,code:"DIRECT_WRANGLER_INGRESS_DENIED"},
      {status:403,headers:{"cache-control":"no-store"}});
  return null;
}
