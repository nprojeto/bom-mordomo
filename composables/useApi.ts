import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cliente: SupabaseClient | null = null

export function useSupa(): SupabaseClient {
  const cfg = useRuntimeConfig()
  if (!cliente) {
    cliente = createClient(
      cfg.public.supabaseUrl as string,
      cfg.public.supabaseAnonKey as string,
      { auth: { persistSession: true, autoRefreshToken: true } }
    )
  }
  return cliente
}

export function useApi() {
  const cfg = useRuntimeConfig()
  const base = `${cfg.public.supabaseUrl}/functions/v1/api`

  async function chamar<T = any>(rota: string, opcoes: any = {}): Promise<T> {
    const supa = useSupa()
    const { data } = await supa.auth.getSession()
    const token = data.session?.access_token

    const resp = await fetch(`${base}${rota}`, {
      method: opcoes.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.public.supabaseAnonKey as string,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: opcoes.body ? JSON.stringify(opcoes.body) : undefined
    })

    const texto = await resp.text()
    const json = texto ? JSON.parse(texto) : null
    if (!resp.ok) throw new Error(json?.erro ?? `Erro ${resp.status}`)
    return json as T
  }

  return {
    get:    <T = any>(r: string) => chamar<T>(r),
    post:   <T = any>(r: string, body?: any) => chamar<T>(r, { method: 'POST', body }),
    patch:  <T = any>(r: string, body?: any) => chamar<T>(r, { method: 'PATCH', body }),
    remove: <T = any>(r: string) => chamar<T>(r, { method: 'DELETE' })
  }
}

/* ------------------------------------------------------------ formato */
export const dinheiro = (v: any) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(Number(v || 0))

export const dataBr = (d: any) => {
  if (!d) return '—'
  const [a, m, dd] = String(d).slice(0, 10).split('-')
  return `${dd}/${m}/${a}`
}

export const hojeISO = () => {
  const agora = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  return agora.toISOString().slice(0, 10)
}

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
