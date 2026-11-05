import { useState } from "react";
import { useAuth, authConfigured, passwordValid } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginScreen() {
  const { login, signup, error: sessionError } = useAuth();
  const [register,setRegister]=useState(false);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [confirmation,setConfirmation]=useState(false);
  const submit=async(e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setError("");setBusy(true);
    try {
      if(register){
        const status=await signup(email,password);
        if(status==="confirmation_required")setConfirmation(true);
      } else await login(email,password);
    } catch(err){setError(err instanceof Error?err.message:"Não foi possível acessar a conta.");}
    finally{setBusy(false);}
  };
  return <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-7 shadow-sm">
      <div className="space-y-1 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">RODS</div>
        <h1 className="text-2xl font-bold">RODSOFICIAL</h1>
        <p className="text-sm text-muted-foreground">Gestão financeira de marketplaces</p>
      </div>
      {!authConfigured?<div role="alert" className="rounded-md border border-destructive p-4 text-sm">
        Acesso não configurado. O administrador precisa configurar o banco de dados e o Supabase Auth antes de abrir cadastros.
      </div>:confirmation?<div role="status" className="space-y-4 text-sm">
        <p>Cadastro solicitado. Verifique seu e-mail para confirmar a conta, se essa confirmação estiver habilitada.</p>
        <Button variant="outline" className="w-full" onClick={()=>{setConfirmation(false);setRegister(false);}}>Ir para login</Button>
      </div>:<>
        <div className="flex gap-2 rounded-md bg-muted p-1">
          <Button type="button" className="flex-1" variant={!register?"default":"ghost"} onClick={()=>{setRegister(false);setError("");}}>Entrar</Button>
          <Button type="button" className="flex-1" variant={register?"default":"ghost"} onClick={()=>{setRegister(true);setError("");}}>Criar conta</Button>
        </div>
        <form onSubmit={e=>void submit(e)} className="space-y-4">
          <label className="block space-y-1 text-sm font-medium">E-mail
            <Input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@empresa.com.br"/>
          </label>
          <label className="block space-y-1 text-sm font-medium">Senha
            <Input type="password" autoComplete={register?"new-password":"current-password"} required minLength={register?6:undefined} value={password} onChange={e=>setPassword(e.target.value)}/>
          </label>
          {register&&<p className="text-xs text-muted-foreground">Use pelo menos 6 caracteres, incluindo uma letra e um número. Exemplo: rods123.</p>}
          {(error||sessionError)&&<p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{error||sessionError}</p>}
          <Button type="submit" className="w-full" disabled={busy||(register&&!passwordValid(password))}>
            {busy?"Aguarde...":register?"Cadastrar e-mail e senha":"Entrar na minha conta"}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">Cada usuário acessa somente seus próprios produtos, vendas, ADS e custos.</p>
      </>}
    </div>
  </div>;
}