<script setup lang="ts">
const rota = useRoute()
const supa = useSupa()
const api = useApi()
const { escuroAgora, alternar } = useTema()

const email = ref('')
const nome = ref('')
const familia = ref('')
const ehAdmin = ref(false)
const recursos = ref<Record<string, boolean>>({})
const catalogo = ref<any[]>([])
const servidorVelho = ref('')
const foto = ref<string | null>(null)

const avisos = ref<any[]>([])
const urgentes = ref(0)

const balao = ref<any>(null)
const gaveta = ref(false)
const abaSino = ref(false)
const abaPerfil = ref(false)

// telas de acesso ocupam a pagina inteira, sem menu
const SEM_MENU = ['/login', '/criar-conta', '/recuperar']
const semMenu = computed(() => SEM_MENU.includes(rota.path))

function temRecurso(chave?: string) {
  if (!chave) return true
  if (!Object.keys(recursos.value).length) return true
  return recursos.value[chave] !== false
}

const itens = computed(() => [
  { para: '/',            ic: 'grid_view',       txt: 'Painel',     curto: 'Painel' },
  { para: '/moderando',   ic: 'speed',           txt: 'Moderando',  curto: 'Moderar', rec: 'moderando' },
  { para: '/calendario',  ic: 'calendar_month',  txt: 'Calendário', curto: 'Agenda',  rec: 'calendario' },
  { para: '/contas',      ic: 'receipt_long',    txt: 'Contas',     curto: 'Contas',  rec: 'contas' },
  { para: '/gastos',      ic: 'shopping_bag',    txt: 'Gastos',     curto: 'Gastos',  rec: 'gastos' },
  { para: '/cartoes',     ic: 'credit_card',     txt: 'Cartões',    curto: 'Cartões', rec: 'cartoes' },
  { para: '/reservas',    ic: 'savings',         txt: 'Reservas',   curto: 'Reservas',rec: 'reservas' },
  ...(ehAdmin.value
    ? [{ para: '/admin', ic: 'shield_person', txt: 'Administração', curto: 'Admin' }]
    : [])
].map((i: any) => ({ ...i, bloqueado: !temRecurso(i.rec) })))

// no celular cabem poucos: os quatro do dia a dia mais o "Mais"
const ATALHOS = ['/', '/calendario', '/gastos', '/moderando']
const principais = computed(() =>
  ATALHOS.map((r) => itens.value.find((i: any) => i.para === r)).filter(Boolean) as any[])
const outros = computed(() =>
  itens.value.filter((i: any) => !ATALHOS.includes(i.para)))

// tudo o que é conta e preferência mora no menu do perfil
const doPerfil = [
  { para: '/conta',   ic: 'home',              txt: 'Minha família' },
  { para: '/planos',  ic: 'workspace_premium', txt: 'Planos e assinatura' },
  { para: '/ajustes', ic: 'tune',              txt: 'Ajustes' },
]

// Enquanto os dados não chegam, o e-mail já basta para as iniciais —
// mostrar "?" para quem está logado passa impressão de erro.
const iniciais = computed(() => {
  const base = (nome.value || familia.value || email.value || '').trim()
  if (!base) return '·'
  return base.split(/[\s._@-]+/).filter(Boolean).slice(0, 2)
    .map((p) => p[0]).join('').toUpperCase()
})

function fecharTudo() { abaSino.value = false; abaPerfil.value = false; gaveta.value = false }

function explicar(item: any, ev: MouseEvent) {
  const alvo = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  const r = catalogo.value.find((x) => x.chave === item.rec)
  balao.value = {
    rec: item.rec,
    nome: r?.nome ?? item.txt,
    texto: r?.detalhe ?? r?.texto ?? 'Esta parte do sistema.',
    exemplos: r?.exemplos ?? [],
    topo: Math.min(alvo.top, Math.max(20, window.innerHeight - 340)),
    esquerda: alvo.right + 10
  }
}
function fecharBalao() { balao.value = null }

async function verPlanos() {
  const rec = balao.value?.rec
  fecharBalao()
  await navigateTo(`/planos?bloqueado=${rec}`)
}

function tocarMobile(i: any, ev: MouseEvent) {
  if (!i.bloqueado) { gaveta.value = false; return }
  ev.preventDefault()
  gaveta.value = false
  explicar(i, ev)
}

async function carregarAvisos() {
  try {
    const r = await api.get('/avisos')
    avisos.value = r?.avisos ?? []
    urgentes.value = Number(r?.urgentes ?? 0)
  } catch { /* sininho vazio se falhar */ }
}

onMounted(async () => {
  const { data } = await supa.auth.getUser()
  email.value = data.user?.email ?? ''
  if (semMenu.value) return

  const v = await conferirVersao()
  if (v !== VERSAO_ESPERADA) {
    servidorVelho.value = v === 'antiga'
      ? 'O servidor está numa versão antiga.'
      : `O servidor está na versão ${v} e este site espera a ${VERSAO_ESPERADA}.`
  }

  try {
    const c = await api.get('/conta')
    ehAdmin.value = !!c?.sou_admin
    familia.value = c?.conta?.nome ?? ''
    foto.value = c?.conta?.foto ?? null
    nome.value = c?.eu_nome ?? ''
    recursos.value = c?.plano?.recursos ?? {}
    catalogo.value = c?.recursos_catalogo ?? []
    await useRecursos(true)
  } catch { /* menu completo se a consulta falhar */ }

  await carregarAvisos()
})

watch(() => rota.path, fecharTudo)

async function sair() {
  limparRecursos()
  await supa.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div v-if="semMenu"><slot /></div>

  <div v-else class="moldura">
    <aside class="barra">
      <div class="barra-topo">
        <img :src="arquivo('logo.png')" alt="Sow Well Everyday" class="marca-logo" />
        <NuxtLink to="/conta" class="familia-chip">
          <img v-if="foto" :src="foto" alt="" />
          <span class="marca-familia">{{ familia || 'Everyday' }}</span>
        </NuxtLink>
      </div>

      <nav class="menu">
        <NuxtLink v-for="i in itens" :key="i.para" :to="i.para"
                  :class="{ travado: i.bloqueado }"
                  @click="i.bloqueado && ($event.preventDefault(), explicar(i, $event))">
          <span class="ic"><i class="mi">{{ i.ic }}</i></span>{{ i.txt }}
          <i v-if="i.bloqueado" class="mi cadeado">lock</i>
        </NuxtLink>
      </nav>
    </aside>

    <div class="coluna">
      <!-- barra de cima: sino e perfil -->
      <header class="cabecalho">
        <img :src="arquivo('logo.png')" alt="" class="cabecalho-logo" />

        <span class="espaco"></span>

        <div class="canto">
          <button class="botao-canto" :class="{ ativo: abaSino }"
                  aria-label="Avisos"
                  @click="abaSino = !abaSino; abaPerfil = false">
            <i class="mi">notifications</i>
            <span v-if="avisos.length" class="selo" :class="{ urgente: urgentes > 0 }">
              {{ avisos.length }}
            </span>
          </button>

          <button class="avatar" :class="{ ativo: abaPerfil, comFoto: !!foto }"
                  aria-label="Seu perfil"
                  @click="abaPerfil = !abaPerfil; abaSino = false">
            <img v-if="foto" :src="foto" alt="" />
            <template v-else>{{ iniciais }}</template>
          </button>
        </div>

        <!-- avisos -->
        <div v-if="abaSino" class="cortina" @click="fecharTudo"></div>
        <div v-if="abaSino" class="painel-canto avisos">
          <div class="painel-canto-topo">
            <strong>Avisos</strong>
            <button class="fechar" @click="abaSino = false"><i class="mi">close</i></button>
          </div>

          <div v-if="!avisos.length" class="vazio" style="padding:30px 18px">
            <div class="simbolo"><i class="mi">check</i></div>
            Nada pedindo sua atenção agora.
          </div>

          <NuxtLink v-for="(a, i) in avisos" :key="i" :to="a.rota"
                    class="aviso-linha" :class="{ urgente: a.urgente }"
                    @click="abaSino = false">
            <span class="aviso-ic"><i class="mi">{{ a.icone }}</i></span>
            <span>
              <strong>{{ a.titulo }}</strong>
              <span class="pequeno mudo">{{ a.texto }}</span>
            </span>
          </NuxtLink>
        </div>

        <!-- perfil -->
        <div v-if="abaPerfil" class="cortina" @click="fecharTudo"></div>
        <div v-if="abaPerfil" class="painel-canto perfil">
          <div class="perfil-quem">
            <span class="avatar grande" :class="{ comFoto: !!foto }">
              <img v-if="foto" :src="foto" alt="" />
              <template v-else>{{ iniciais }}</template>
            </span>
            <span>
              <strong>{{ nome || 'Você' }}</strong>
              <span class="pequeno mudo">{{ email }}</span>
              <span class="pequeno" style="color:var(--laranja);font-weight:700">
                {{ familia }}
              </span>
            </span>
          </div>

          <NuxtLink v-for="p in doPerfil" :key="p.para" :to="p.para"
                    class="perfil-item" @click="abaPerfil = false">
            <i class="mi">{{ p.ic }}</i>{{ p.txt }}
          </NuxtLink>

          <button class="perfil-item" @click="alternar">
            <i class="mi">{{ escuroAgora ? 'light_mode' : 'dark_mode' }}</i>
            {{ escuroAgora ? 'Tema claro' : 'Tema escuro' }}
            <span class="pequeno mudo" style="margin-left:auto">
              {{ escuroAgora ? 'escuro' : 'claro' }}
            </span>
          </button>

          <div class="perfil-risco"></div>

          <button class="perfil-item saida" @click="sair">
            <i class="mi">logout</i>Sair da conta
          </button>
        </div>
      </header>

      <main class="palco">
        <div v-if="servidorVelho" class="faixa-aviso grave">
          <strong>{{ servidorVelho }}</strong>
          Publique o arquivo <code>api.index.ts</code> em
          Supabase → Edge Functions → api → Deploy.
        </div>
        <slot />
      </main>
    </div>

    <!-- menu de baixo, no celular -->
    <nav class="menu-mobile">
      <NuxtLink v-for="i in principais" :key="i.para" :to="i.para"
                :class="{ travado: i.bloqueado, destaque: i.para === '/gastos' }"
                @click="tocarMobile(i, $event)">
        <span class="ic"><i class="mi">{{ i.ic }}</i></span>
        <span class="txt">{{ i.curto }}</span>
      </NuxtLink>

      <button class="mais" :class="{ aberto: gaveta }" @click="gaveta = !gaveta">
        <span class="ic"><i class="mi">{{ gaveta ? 'close' : 'more_horiz' }}</i></span>
        <span class="txt">Mais</span>
      </button>
    </nav>

    <div v-if="gaveta" class="gaveta-fundo" @click="gaveta = false">
      <div class="gaveta-menu" @click.stop>
        <div class="gaveta-alca"></div>
        <div class="gaveta-grade">
          <NuxtLink v-for="i in outros" :key="i.para" :to="i.para"
                    :class="{ travado: i.bloqueado }"
                    @click="tocarMobile(i, $event)">
            <span class="ic"><i class="mi">{{ i.ic }}</i></span>
            <span>{{ i.txt }}</span>
            <i v-if="i.bloqueado" class="mi trava">lock</i>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- explicacao do que esta travado -->
    <div v-if="balao" class="balao-fundo" @click="fecharBalao">
      <div class="balao" :style="{ top: balao.topo + 'px', left: balao.esquerda + 'px' }"
           @click.stop>
        <div class="balao-topo">
          <span class="balao-cadeado"><i class="mi">lock</i></span>
          <strong>{{ balao.nome }}</strong>
        </div>

        <p>{{ balao.texto }}</p>

        <ul v-if="balao.exemplos.length" class="balao-lista">
          <li v-for="(e, i) in balao.exemplos" :key="i">{{ e }}</li>
        </ul>

        <p class="balao-nota">Não faz parte do seu plano atual.</p>

        <div class="linha-flex">
          <button class="btn latao mini" @click="verPlanos">Ver planos</button>
          <button class="btn claro mini" @click="fecharBalao">Agora não</button>
        </div>
      </div>
    </div>
  </div>
</template>
