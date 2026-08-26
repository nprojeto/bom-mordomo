<script setup lang="ts">
const supa = useSupa()
const rota = useRoute()

const nome = ref('')
const casa = ref('')
const email = ref(String(rota.query.email ?? ''))
const senha = ref('')
const senha2 = ref('')
const erro = ref('')
const pronto = ref(false)
const carregando = ref(false)

const convidado = computed(() => !!rota.query.email)

const forcaSenha = computed(() => {
  const s = senha.value
  if (!s) return { n: 0, txt: '', cor: '' }
  let n = 0
  if (s.length >= 8) n++
  if (s.length >= 12) n++
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) n++
  if (/\d/.test(s)) n++
  if (/[^A-Za-z0-9]/.test(s)) n++
  const rot = ['muito fraca', 'fraca', 'razoável', 'boa', 'forte', 'forte']
  const cores = ['#A33F32', '#A33F32', '#B5761F', '#2E7A5C', '#2E7A5C', '#2E7A5C']
  return { n, txt: rot[n], cor: cores[n] }
})

async function criar() {
  erro.value = ''
  const mail = email.value.trim().toLowerCase()

  if (!nome.value.trim()) { erro.value = 'Como podemos te chamar?'; return }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { erro.value = 'E-mail inválido.'; return }
  if (senha.value.length < 8) { erro.value = 'A senha precisa ter ao menos 8 caracteres.'; return }
  if (senha.value !== senha2.value) { erro.value = 'As senhas não são iguais.'; return }

  carregando.value = true
  const { data, error } = await supa.auth.signUp({
    email: mail,
    password: senha.value,
    options: {
      data: { nome: nome.value.trim(), casa: casa.value.trim() || null },
      emailRedirectTo: `${window.location.origin}${useRuntimeConfig().app.baseURL}login`
    }
  })
  carregando.value = false

  if (error) {
    erro.value = error.message.includes('already registered')
      ? 'Já existe uma conta com este e-mail. Tente entrar.'
      : error.message
    return
  }

  // se o projeto não exigir confirmação, já entra direto
  if (data.session) { await navigateTo('/'); return }
  pronto.value = true
}
</script>

<template>
  <div class="portao">
    <div class="portao-caixa">
      <template v-if="pronto">
        <div class="portao-marca">Quase lá</div>
        <div class="portao-sub">Falta confirmar seu e-mail</div>
        <div class="aviso bem" style="margin-bottom:18px">
          Enviamos um link para <strong>{{ email }}</strong>.
          Abra a mensagem e clique para ativar a conta. Se não achar,
          verifique o spam.
        </div>
        <NuxtLink to="/login" class="btn claro" style="width:100%">
          Voltar para a entrada
        </NuxtLink>
      </template>

      <template v-else>
        <div class="portao-marca">Criar conta</div>
        <div class="portao-sub">
          {{ convidado
            ? 'Você foi convidado — use este mesmo e-mail'
            : '14 dias para experimentar, sem cartão' }}
        </div>

        <div class="campo">
          <label>Seu nome</label>
          <input v-model="nome" autocomplete="name" placeholder="Como quer ser chamado" />
        </div>

        <div v-if="!convidado" class="campo">
          <label>Nome da família <span class="mudo">(opcional)</span></label>
          <input v-model="casa" placeholder="Família Silva" />
        </div>

        <div class="campo">
          <label>E-mail</label>
          <input v-model="email" type="email" autocomplete="email"
                 :disabled="convidado" placeholder="seu@email.com" />
        </div>

        <div class="campo">
          <label>Senha</label>
          <input v-model="senha" type="password" autocomplete="new-password"
                 placeholder="ao menos 8 caracteres" />
          <div v-if="senha" class="forca">
            <div class="forca-barra">
              <i :style="{ width: (forcaSenha.n / 5 * 100) + '%', background: forcaSenha.cor }"></i>
            </div>
            <span class="pequeno" :style="{ color: forcaSenha.cor }">{{ forcaSenha.txt }}</span>
          </div>
        </div>

        <div class="campo">
          <label>Repita a senha</label>
          <input v-model="senha2" type="password" autocomplete="new-password"
                 placeholder="••••••••" @keyup.enter="criar" />
        </div>

        <div v-if="erro" class="aviso mal" style="margin-bottom:14px">{{ erro }}</div>

        <button class="btn" style="width:100%" :disabled="carregando" @click="criar">
          {{ carregando ? 'Criando…' : 'Criar minha conta' }}
        </button>

        <div class="centro pequeno" style="margin-top:18px">
          Já tem conta? <NuxtLink to="/login"><strong>Entrar</strong></NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.forca { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.forca-barra {
  flex: 1; height: 4px; background: #E7EAE4; border-radius: 999px; overflow: hidden;
}
.forca-barra i { display: block; height: 100%; transition: width .2s; }
</style>
