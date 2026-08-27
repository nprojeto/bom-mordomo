<script setup lang="ts">
const rota = useRoute()
const supa = useSupa()
const api = useApi()
const email = ref('')
const aviso = ref<{ texto: string; grave: boolean } | null>(null)
const ehAdmin = ref(false)
const familia = ref('')
const recursos = ref<Record<string, boolean>>({})
const catalogo = ref<any[]>([])
const balao = ref<any>(null)

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

// telas de acesso ocupam a pagina inteira, sem menu
const SEM_MENU = ['/login', '/criar-conta', '/recuperar', '/nova-senha']
const semMenu = computed(() => SEM_MENU.includes(rota.path))

function temRecurso(chave?: string) {
  if (!chave) return true
  if (!Object.keys(recursos.value).length) return true
  return recursos.value[chave] !== false
}

const itens = computed(() => [
  { para: '/',            ic: '◈', txt: 'Painel',     curto: 'Painel' },
  { para: '/moderando',   ic: '◐', txt: 'Moderando',  curto: 'Moderar', rec: 'moderando' },
  { para: '/calendario',  ic: '▦', txt: 'Calendário', curto: 'Agenda',  rec: 'calendario' },
  { para: '/contas',      ic: '☰', txt: 'Contas',     curto: 'Contas',  rec: 'contas' },
  { para: '/gastos',      ic: '◍', txt: 'Gastos',     curto: 'Gastos',  rec: 'gastos' },
  { para: '/cartoes',     ic: '▤', txt: 'Cartões',    curto: 'Cartões', rec: 'cartoes' },
  { para: '/reservas',    ic: '◉', txt: 'Reservas',   curto: 'Reservas',rec: 'reservas' },
  { para: '/ajustes',     ic: '⚙', txt: 'Ajustes',    curto: 'Ajustes' },
  { para: '/planos',      ic: '◇', txt: 'Planos',     curto: 'Planos' },
  { para: '/conta',       ic: '⌂', txt: 'Minha casa', curto: 'Casa' },
  ...(ehAdmin.value
    ? [{ para: '/admin', ic: '✦', txt: 'Administração', curto: 'Admin' }]
    : [])
].map((i: any) => ({ ...i, bloqueado: !temRecurso(i.rec) })))

onMounted(async () => {
  const { data } = await supa.auth.getUser()
  email.value = data.user?.email ?? ''
  if (semMenu.value) return
  try {
    const c = await api.get('/conta')
    ehAdmin.value = !!c?.sou_admin
    familia.value = c?.conta?.nome ?? ''
    recursos.value = c?.plano?.recursos ?? {}
    catalogo.value = c?.recursos_catalogo ?? []
    await useRecursos(true)
  } catch { /* menu completo se a consulta falhar */ }

  try {
    const a = await api.get('/assinatura')
    if (!a?.em_dia) {
      aviso.value = { texto: 'Seu acesso expirou — não dá para lançar nada novo.', grave: true }
    } else if (a?.plano === 'teste' && Number(a.dias_restantes) <= 5) {
      aviso.value = {
        texto: `Seu teste termina em ${a.dias_restantes} dia(s).`, grave: false
      }
    }
  } catch { /* sem aviso se a consulta falhar */ }
})

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
      <div class="marca">Bom Mordomo<span>{{ familia || 'Livro-razão' }}</span></div>
      <div class="regua-latao"></div>
      <nav class="menu">
        <NuxtLink v-for="i in itens" :key="i.para" :to="i.para"
                  :class="{ travado: i.bloqueado }"
                  @click="i.bloqueado && ($event.preventDefault(), explicar(i, $event))">
          <span class="ic">{{ i.ic }}</span>{{ i.txt }}
          <span v-if="i.bloqueado" class="cadeado">🔒</span>
        </NuxtLink>
      </nav>
      <div class="rodape-barra">
        <div style="margin-bottom:6px">{{ email }}</div>
        <button @click="sair">Sair</button>
      </div>
    </aside>

    <main class="palco">
      <NuxtLink v-if="aviso" to="/planos" class="faixa-aviso"
                :class="{ grave: aviso.grave }">
        {{ aviso.texto }} <strong>Ver planos ›</strong>
      </NuxtLink>
      <slot />
    </main>

    <nav class="menu-mobile">
      <NuxtLink v-for="i in itens" :key="i.para" :to="i.para"
                :class="{ travado: i.bloqueado }"
                @click="i.bloqueado && ($event.preventDefault(), explicar(i, $event))">
        <span class="ic">{{ i.ic }}</span>{{ i.curto }}
      </NuxtLink>
    </nav>
    <!-- explicacao do que esta travado -->
    <div v-if="balao" class="balao-fundo" @click="fecharBalao">
      <div class="balao" :style="{ top: balao.topo + 'px', left: balao.esquerda + 'px' }"
           @click.stop>
        <div class="balao-topo">
          <span class="balao-cadeado">🔒</span>
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
