<script setup lang="ts">
const rota = useRoute()
const supa = useSupa()
const api = useApi()
const email = ref('')
const casa = ref('')
const aviso = ref<{ texto: string; grave: boolean } | null>(null)

const nuLogin = computed(() => rota.path === '/login')

const itens = [
  { para: '/',            ic: '◈', txt: 'Painel',     curto: 'Painel' },
  { para: '/moderando',   ic: '◐', txt: 'Moderando',  curto: 'Moderar' },
  { para: '/calendario',  ic: '▦', txt: 'Calendário', curto: 'Agenda' },
  { para: '/contas',      ic: '☰', txt: 'Contas',     curto: 'Contas' },
  { para: '/gastos',      ic: '◍', txt: 'Gastos',     curto: 'Gastos' },
  { para: '/cartoes',     ic: '▤', txt: 'Cartões',    curto: 'Cartões' },
  { para: '/reservas',    ic: '◉', txt: 'Reservas',   curto: 'Reservas' },
  { para: '/ajustes',     ic: '⚙', txt: 'Ajustes',    curto: 'Ajustes' },
  { para: '/conta',       ic: '⌂', txt: 'Minha casa', curto: 'Casa' }
]

onMounted(async () => {
  const { data } = await supa.auth.getUser()
  email.value = data.user?.email ?? ''
  if (nuLogin.value) return
  try {
    const a = await api.get('/assinatura')
    casa.value = ''
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
  await supa.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div v-if="nuLogin"><slot /></div>

  <div v-else class="moldura">
    <aside class="barra">
      <div class="marca">Bom Mordomo<span>Livro-razão da casa</span></div>
      <div class="regua-latao"></div>
      <nav class="menu">
        <NuxtLink v-for="i in itens" :key="i.para" :to="i.para">
          <span class="ic">{{ i.ic }}</span>{{ i.txt }}
        </NuxtLink>
      </nav>
      <div class="rodape-barra">
        <div style="margin-bottom:6px">{{ email }}</div>
        <button @click="sair">Sair</button>
      </div>
    </aside>

    <main class="palco">
      <NuxtLink v-if="aviso" to="/conta" class="faixa-aviso"
                :class="{ grave: aviso.grave }">
        {{ aviso.texto }} <strong>Ver assinatura ›</strong>
      </NuxtLink>
      <slot />
    </main>

    <nav class="menu-mobile">
      <NuxtLink v-for="i in itens" :key="i.para" :to="i.para">
        <span class="ic">{{ i.ic }}</span>{{ i.curto }}
      </NuxtLink>
    </nav>
  </div>
</template>
