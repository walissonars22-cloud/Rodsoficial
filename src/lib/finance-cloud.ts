import type { FixedCost, MarginThresholds, Product } from "./finance";
import type { SaleRecord, AdSpend, MonthClose } from "./market-report";
import { databaseConfig } from "./auth";

/** O estado financeiro pertence exclusivamente ao auth.uid() validado pelo RLS. */
export interface FinanceData {
  products: Product[];
  costs: FixedCost[];
  thresholds: MarginThresholds;
  profitGoal: number;
  sales: SaleRecord[];
  adSpends: AdSpend[];
  monthCloses: MonthClose[];
}
export const blankFinance = (): FinanceData => ({
  products: [], costs: [], thresholds: {low:15}, profitGoal:0,
  sales: [], adSpends: [], monthCloses: [],
});
const validData = (raw: unknown): FinanceData => {
  if(!raw || typeof raw!=="object") return blankFinance();
  const data=raw as Partial<FinanceData>;
  const fallback=blankFinance();
  return {
    products:Array.isArray(data.products)?data.products:[],
    costs:Array.isArray(data.costs)?data.costs:[],
    thresholds:data.thresholds&&Number.isFinite(data.thresholds.low)?data.thresholds:fallback.thresholds,
    profitGoal:typeof data.profitGoal==="number"&&Number.isFinite(data.profitGoal)?data.profitGoal:0,
    sales:Array.isArray(data.sales)?data.sales:[],
    adSpends:Array.isArray(data.adSpends)?data.adSpends:[],
    monthCloses:Array.isArray(data.monthCloses)?data.monthCloses:[],
  };
};
async function callDatabase(path: string, accessToken: string, init: RequestInit={}) {
  const {baseUrl,anonKey}=databaseConfig();
  const response=await fetch(baseUrl+"/rest/v1/"+path,{
    ...init,
    headers:{apikey:anonKey,Authorization:"Bearer "+accessToken,
      "Content-Type":"application/json",...init.headers},
  });
  if(!response.ok) {
    const error=await response.json().catch(()=>null) as {message?:string;hint?:string}|null;
    throw new Error(error?.message??"Falha ao acessar seus dados financeiros ("+response.status+").");
  }
  return response;
}
/** Não aceita userId externo sem sessão: todas as chamadas precisam do JWT do usuário. */
export async function loadFinance(userId:string,token:string):Promise<FinanceData> {
  const response=await callDatabase("finance_workspaces?select=data&user_id=eq."+encodeURIComponent(userId)+"&limit=1",token);
  const rows=await response.json() as {data:unknown}[];
  return rows.length?validData(rows[0]?.data):blankFinance();
}
export async function saveFinance(userId:string,token:string,data:FinanceData) {
  await callDatabase("finance_workspaces?on_conflict=user_id",token,{
    method:"POST",
    headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
    body:JSON.stringify({user_id:userId,data}),
  });
}