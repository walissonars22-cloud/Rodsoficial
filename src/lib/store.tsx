import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from "react";
import type {FixedCost,MarginThresholds,Product} from "./finance";
import type {SaleRecord,AdSpend,MonthClose} from "./market-report";
import {useAuth} from "./auth";
import {blankFinance,loadFinance,saveFinance,type FinanceData} from "./finance-cloud";

export const uid = () => crypto.randomUUID();
export const emptyProduct = ():Product => ({
 id:uid(),name:"",sku:"",category:"",marketplace:"Mercado Livre",active:true,
 purchasePrice:0,acquisitionFreight:0,packaging:0,otherProductCosts:0,
 salePrice:0,commissionPct:0,fixedFee:0,subsidizedFreight:0,taxPct:0,
 adsMode:"pct",adsValue:0,otherSellingCosts:0,monthlyQty:0,
});
export const emptyCost = ():FixedCost => ({
 id:uid(),name:"",category:"Outras despesas administrativas",amount:0,
 frequency:"mensal",startDate:new Date().toISOString().slice(0,10),active:true,notes:"",
});

interface Ctx extends FinanceData {
 ready:boolean;
 saveError:string|null;
 importSales:(incoming:SaleRecord[])=>void;
 setAdSpends:(f:(rows:AdSpend[])=>AdSpend[])=>void;
 closeMonth:(snapshot:MonthClose)=>void;
 reopenMonth:(month:string)=>void;
 setProducts:(f:(p:Product[])=>Product[])=>void;
 setCosts:(f:(c:FixedCost[])=>FixedCost[])=>void;
 setThresholds:(t:MarginThresholds)=>void;
 setProfitGoal:(v:number)=>void;
 clearDemo:()=>void;
 loadDemo:()=>void;
}
const Context=createContext<Ctx|null>(null);
export function FinanceProvider({children}:{children:ReactNode}){
 const {user,accessToken}=useAuth();
 const userId=user?.id;
 const tokenRef=useRef(accessToken);
 tokenRef.current=accessToken;
 const [data,setData]=useState<FinanceData>(blankFinance);
 const [ready,setReady]=useState(false);
 const [saveError,setSaveError]=useState<string|null>(null);
 const saveQueue=useRef<Promise<void>>(Promise.resolve());
 useEffect(()=>{
   let active=true;
   setReady(false);setSaveError(null);setData(blankFinance());
   if(!userId||!tokenRef.current)return;
   void loadFinance(userId,tokenRef.current).then(loaded=>{
     if(active){setData(loaded);setReady(true);}
   }).catch(err=>{
     if(active){setSaveError("Não foi possível abrir seus dados: "+(err instanceof Error?err.message:String(err)));setReady(false);}
   });
   return ()=>{active=false;};
 },[userId]);
 useEffect(()=>{
   if(!ready||!userId)return;
   const timer=window.setTimeout(()=>{
     const snapshot=data;
     // As gravações são serializadas para evitar que uma operação antiga
     // sobrescreva uma alteração mais recente.
     saveQueue.current=saveQueue.current.catch(()=>{}).then(async()=>{
       const token=tokenRef.current;
       if(!token)throw new Error("Faça login novamente para salvar.");
       await saveFinance(userId,token,snapshot);
       setSaveError(null);
     }).catch(err=>{
       setSaveError("Não foi possível salvar as alterações. Verifique sua conexão antes de sair: "+
         (err instanceof Error?err.message:String(err)));
     });
   },650);
   return ()=>window.clearTimeout(timer);
 },[ready,userId,data]);
 const setProducts:Ctx["setProducts"]=f=>setData(s=>({...s,products:f(s.products)}));
 const setCosts:Ctx["setCosts"]=f=>setData(s=>({...s,costs:f(s.costs)}));
 const importSales:Ctx["importSales"]=incoming=>setData(s=>{
   const byKey=new Map(s.sales.map(r=>[r.key,r]));
   for(const item of incoming)byKey.set(item.key,item);
   const allSales=[...byKey.values()];
   const latestMonth=allSales.reduce((best,r)=>r.month>best?r.month:best,"");
   const active=allSales.filter(r=>r.month===latestMonth&&!r.cancelled&&r.sku);
   const products=s.products.map(p=>({...p}));
   const skus=new Set(allSales.filter(r=>r.sku).map(r=>r.sku));
   for(const sku of skus){
     const line=allSales.find(r=>r.sku===sku)!;
     let product=products.find(p=>p.sku===sku&&p.marketplace==="Mercado Livre");
     if(!product){product={...emptyProduct(),sku,name:line.name||sku};products.push(product);}
     const recent=active.filter(r=>r.sku===sku);
     const qty=recent.reduce((sum,r)=>sum+r.qty,0);
     const revenue=recent.reduce((sum,r)=>sum+r.revenue,0);
     product.monthlyQty=qty;
     if(qty>0)product.salePrice=revenue/qty;
   }
   return {...s,sales:allSales,products};
 });
 const value:Ctx={
   ...data,ready,saveError,importSales,
   setProducts,setCosts,
   setAdSpends:f=>setData(s=>({...s,adSpends:f(s.adSpends)})),
   closeMonth:snapshot=>setData(s=>({...s,monthCloses:[...s.monthCloses.filter(x=>x.month!==snapshot.month),snapshot]})),
   reopenMonth:month=>setData(s=>({...s,monthCloses:s.monthCloses.filter(x=>x.month!==month)})),
   setThresholds:thresholds=>setData(s=>({...s,thresholds})),
   setProfitGoal:profitGoal=>setData(s=>({...s,profitGoal})),
   clearDemo:()=>setData(s=>({...s,products:s.products.filter(p=>!p.demo),costs:s.costs.filter(c=>!c.demo)})),
   loadDemo:()=>{}, // Dados fictícios nunca são carregados automaticamente.
 };
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useFinance(){
 const value=useContext(Context);
 if(!value)throw new Error("FinanceProvider obrigatório.");
 return value;
}