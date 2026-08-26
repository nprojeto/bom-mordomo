<script setup lang="ts">
const api = useApi()

const aba = ref<'negocio' | 'plano'>('negocio')
const resumo = ref<any>(null)
const plano = ref<any>(null)
const carregando = ref(true)
const erro = ref('')
const recado = ref('')
const salvando = ref(false)
const publicando = ref(false)
const semAcesso = ref(false)

const form = ref({ nome: '', preco: '', plan_id: '' })

// aceita 19,90 / 19.90 / R$ 19,90
function lerDinheiro(v: any): number | null {
  if (typeof v === 'number') return isFinite(v) && v > 0 ? v : null
  let t = String(v ?? '').trim().replace(/[R$\s]/gi, '')
  if (!t) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  const n = Number(t)
  return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}

const precoLido = computed(() => lerDinheiro(form.value.preco))

const rotuloPlano: Record<string, string> = {
  teste: 'Em teste', ativo: 'Assinante',
  vencido: 'Vencida', cancelado: 'Cancelada'
}

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const [r, p] = await Promise.all([
      api.get('/admin/resumo'),
      api.get('/admin/plano')
    ])
    resumo.value = r
    plano.value = p
    form.value.nome = p?.nome ?? ''
    form.value.preco = p?.preco ? String(p.preco).replace('.', ',') : ''
    form.value.plan_id = p?.plan_id ?? ''
  } catch (e: any) {
    if (String(e.message).includes('restrita')) semAcesso.value = true
    else erro.value = e.message
  } finally {
    carregando.value = false
  }
}

async function salvarPlano() {
  erro.value = ''; recado.value = ''
  salvando.value = true
  try {
    if (precoLido.value === null) { erro.value = 'Escreva o preço, algo como 19,90.'; salvando.value = false; return }
    await api.patch('/admin/plano', {
      nome: form.value.nome, preco: precoLido.value
    })
    recado.value = 'Guardado.'
    await carregar()
    setTimeout(() => (recado.value = ''), 3000)
  } catch (e: any) { erro.value = e.message }
  salvando.value = false
}

async function publicar() {
  erro.value = ''; recado.value = ''
  const preco = precoLido.value
  if (preco === null) { erro.value = 'Escreva o preço, algo como 19,90.'; return }

  const acao = plano.value?.plan_id ? 'atualizar o plano para' : 'criar o plano cobrando'
  if (!confirm(`Confirma ${acao} R$ ${preco.toFixed(2).replace('.', ',')} por mês?`)) return

  publicando.value = true
  try {
    const r = await api.post('/admin/plano/publicar', {
      nome: form.value.nome, preco
    })
    if (r.aviso) {
      erro.value = r.aviso
    } else {
      recado.value = r.criado
        ? `Plano criado cobrando ${dinheiro(r.preco_gravado)} por mês. O botão Assinar já funciona.`
        : `Plano atualizado para ${dinheiro(r.preco_gravado)} por mês.`
    }
    await carregar()
  } catch (e: any) { erro.value = e.message }
  publicando.value = false
}

async function estender(casa: any) {
  const dias = prompt(`Quantos dias de cortesia para "${casa.nome}"?`, '30')
  if (!dias) return
  try {
    await api.post(`/admin/casas/estender/${casa.id}`, { dias: Number(dias) })
    recado.value = 'Prazo estendido.'
    await carregar()
    setTimeout(() => (recado.value = ''), 3000)
  } catch (e: any) { erro.value = e.message }
}

function copiar(texto: string) {
  navigator.clipboard?.writeText(texto)
  recado.value = 'Copiado.'
  setTimeout(() => (recado.value = ''), 2000)
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="topo">
      <h1>Administração</h1>
      <p>O negócio por trás do Bom Mordomo.</p>
    </div>

    <div v-if="semAcesso" class="cartao vazio">
      <div class="simbolo">🔒</div>
      Esta área é do administrador da plataforma.
    </div>

    <template v-else>
      <div v-if="recado" class="aviso bem" style="margin-bottom:14px">{{ recado }}</div>
      <div v-if="erro" class="aviso mal entre" style="margin-bottom:14px">
        <span>{{ erro }}</span>
        <button class="btn claro mini" @click="carregar">Tentar de novo</button>
      </div>

      <div class="linha-flex" style="margin-bottom:16px">
        <button class="btn mini" :class="aba === 'negocio' ? '' : 'claro'"
                @click="aba = 'negocio'">Clientes</button>
        <button class="btn mini" :class="aba === 'plano' ? '' : 'claro'"
                @click="aba = 'plano'">Plano e cobrança</button>
      </div>

      <div v-if="carregando" class="vazio">Consultando…</div>

      <!-- ================= CLIENTES ================= -->
      <template v-else-if="aba === 'negocio' && resumo">
        <div class="grade g4" style="margin-bottom:16px">
          <div class="cartao">
            <div class="rotulo">Assinantes</div>
            <div class="selo-valor entrada">{{ resumo.ativas }}</div>
          </div>
          <div class="cartao">
            <div class="rotulo">Em teste</div>
            <div class="selo-valor">{{ resumo.em_teste }}</div>
          </div>
          <div class="cartao">
            <div class="rotulo">Receita prevista</div>
            <div class="selo-valor entrada">{{ dinheiro(resumo.receita_prevista) }}</div>
            <div class="pequeno mudo">por mês, com os assinantes de hoje</div>
          </div>
          <div class="cartao">
            <div class="rotulo">Recebido no mês</div>
            <div class="selo-valor">{{ dinheiro(resumo.recebido_no_mes) }}</div>
            <div class="pequeno mudo">cobranças confirmadas</div>
          </div>
        </div>

        <div class="cartao chapa">
          <div class="cartao-topo">
            <h2>Casas cadastradas</h2>
            <span class="pequeno mudo">
              {{ resumo.total_casas }} no total · {{ resumo.vencidas }} vencida(s)
            </span>
          </div>
          <div class="tabela-rolagem">
            <table>
              <thead>
                <tr><th>Casa</th><th>Situação</th><th>Válida até</th>
                    <th class="direita">Pessoas</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="c in resumo.casas" :key="c.id">
                  <td>
                    <strong>{{ c.nome }}</strong>
                    <div class="pequeno mudo">desde {{ dataBr(c.criado_em) }}</div>
                  </td>
                  <td>
                    <span class="eti" :class="c.em_dia
                      ? (c.plano === 'ativo' ? 'pago' : 'pendente')
                      : 'atrasado'">
                      {{ rotuloPlano[c.plano] ?? c.plano }}
                    </span>
                  </td>
                  <td class="num pequeno">
                    {{ dataBr(c.plano === 'teste' ? c.teste_ate : c.assinatura_ate) }}
                  </td>
                  <td class="direita num">{{ c.pessoas }}</td>
                  <td class="direita">
                    <button class="btn claro mini" @click="estender(c)">Dar prazo</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- ================= PLANO ================= -->
      <template v-else-if="aba === 'plano' && plano">
        <div class="cartao" style="margin-bottom:16px">
          <h2 style="margin-bottom:4px">O que você cobra</h2>
          <p class="pequeno mudo" style="margin:0 0 16px">
            Ao publicar, o plano é criado ou atualizado no Mercado Pago e o botão
            Assinar passa a funcionar para todos os clientes.
          </p>

          <div class="dupla">
            <div class="campo">
              <label>Nome que o cliente vê na cobrança</label>
              <input v-model="form.nome" placeholder="Bom Mordomo — Mensal" />
            </div>
            <div class="campo">
              <label>Preço por mês (R$)</label>
              <input v-model="form.preco" inputmode="decimal" placeholder="19,90" />
              <div class="pequeno mudo" style="margin-top:4px">
                <template v-if="precoLido !== null">
                  Vai cobrar <strong class="num">{{ dinheiro(precoLido) }}</strong> por mês
                </template>
                <template v-else-if="form.preco">
                  <span class="saida">Valor não reconhecido.</span>
                </template>
              </div>
            </div>
          </div>

          <div class="linha-flex">
            <button class="btn latao" :disabled="publicando" @click="publicar">
              {{ publicando ? 'Publicando…' : (plano.plan_id ? 'Atualizar no Mercado Pago' : 'Criar plano no Mercado Pago') }}
            </button>
            <button class="btn claro" :disabled="salvando" @click="salvarPlano">
              Só guardar
            </button>
          </div>
        </div>

        <!-- credencial -->
        <div class="cartao" style="margin-bottom:16px">
          <h2 style="margin-bottom:4px">Credencial do Mercado Pago</h2>
          <p class="pequeno mudo" style="margin:0 0 14px">
            Por segurança, a credencial não passa por esta tela nem fica no banco.
            Ela vive apenas nos segredos do servidor.
          </p>

          <div v-if="plano.token_configurado && plano.token_producao"
               class="aviso bem">
            Credencial de produção configurada no servidor.
          </div>
          <div v-else-if="plano.token_configurado" class="aviso">
            Há uma credencial configurada, mas ela <strong>não é de produção</strong>.
            Cobranças reais não vão funcionar.
          </div>
          <div v-else class="aviso mal">
            Sem credencial. Enquanto isso, ninguém consegue assinar.
          </div>

          <details style="margin-top:14px">
            <summary class="pequeno mudo" style="cursor:pointer">
              Como trocar a credencial
            </summary>
            <div class="pequeno mudo" style="margin-top:10px;line-height:1.7">
              No Supabase, abra <strong>Edge Functions → Secrets</strong> e edite
              o segredo <span class="num">MP_ACCESS_TOKEN</span> com o Access Token
              de produção do painel de desenvolvedores do Mercado Pago.
              A mudança vale na hora, sem publicar nada.
            </div>
          </details>
        </div>

        <!-- situacao -->
        <div class="cartao chapa">
          <div class="cartao-topo"><h2>Situação da integração</h2></div>
          <table>
            <tbody>
              <tr>
                <td>Plano no Mercado Pago</td>
                <td class="direita">
                  <span v-if="plano.plan_id" class="num pequeno">{{ plano.plan_id }}</span>
                  <span v-else class="eti atrasado">não criado</span>
                </td>
              </tr>
              <tr v-if="plano.plano_mercadopago && !plano.plano_mercadopago.erro">
                <td>Como está lá</td>
                <td class="direita pequeno">
                  {{ plano.plano_mercadopago.status }} ·
                  <span class="num">{{ dinheiro(plano.plano_mercadopago.auto_recurring?.transaction_amount) }}</span>/mês
                </td>
              </tr>
              <tr v-else-if="plano.plano_mercadopago?.erro">
                <td>Como está lá</td>
                <td class="direita pequeno saida">{{ plano.plano_mercadopago.erro }}</td>
              </tr>
              <tr v-if="plano.plan_id && !plano.webhook_ok">
                <td colspan="2" style="background:var(--alerta-fraco)">
                  <strong>Falta um passo:</strong> cadastre o endereço de aviso abaixo
                  no Mercado Pago. Sem ele, o sistema não fica sabendo quando alguém
                  paga ou cancela.
                </td>
              </tr>
              <tr>
                <td>
                  Aviso de pagamento
                  <div class="pequeno mudo">
                    cadastre este endereço no Mercado Pago, em Webhooks
                  </div>
                </td>
                <td class="direita">
                  <button class="btn claro mini" @click="copiar(plano.webhook_url)">
                    Copiar endereço
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>
  </div>
</template>
