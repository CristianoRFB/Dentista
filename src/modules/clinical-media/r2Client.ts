import { auth } from '../../lib/firebase';
const baseUrl = import.meta.env.VITE_CLINICAL_MEDIA_API_URL;
export async function uploadClinicalPhoto(args:{tenantId:string;patientId:string;file:File}){
  const token=await auth.currentUser?.getIdToken();
  if(!token) throw new Error('Autenticação necessária');
  const form=new FormData(); form.append('file',args.file); form.append('tenantId',args.tenantId); form.append('patientId',args.patientId);
  const res=await fetch(`${baseUrl}/v1/media`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});
  if(!res.ok) throw new Error(`Upload falhou: ${res.status}`);
  return res.json() as Promise<{objectKey:string}>;
}
