<script setup lang="ts">
const { escuroAgora, alternar } = useTema()
const supa = useSupa()
const senha = ref('')
const senha2 = ref('')
const erro = ref('')
const pronto = ref(false)
const carregando = ref(false)
const valido = ref(false)
const verificando = ref(true)

onMounted(async () => {
  // o Supabase entrega a sessao de recuperacao pela url
  const { data } = await supa.auth.getSession()
  valido.value = !!data.session
  verificando.value = false
})

async function salvar() {
  erro.value = ''
  if (senha.value.length < 8) { erro.value = 'A senha precisa ter ao menos 8 caracteres.'; return }
  if (senha.value !== senha2.value) { erro.value = 'As senhas não são iguais.'; return }

  carregando.value = true
  const { error } = await supa.auth.updateUser({ password: senha.value })
  carregando.value = false
  if (error) { erro.value = error.message; return }
  pronto.value = true
}
</script>

<template>
  <div class="portao">
    <button class="tema-flutuante" :title="escuroAgora ? 'Tema claro' : 'Tema escuro'"
            @click="alternar">
      <i class="mi">{{ escuroAgora ? 'light_mode' : 'dark_mode' }}</i>
    </button>

    <div class="portao-caixa">
      <div v-if="verificando" class="centro mudo">Conferindo o link…</div>

      <template v-else-if="pronto">
        <div class="portao-marca">Senha trocada</div>
        <div class="portao-sub">Pode entrar com a nova</div>
        <NuxtLink to="/" class="btn" style="width:100%">Ir para o sistema</NuxtLink>
      </template>

      <template v-else-if="!valido">
        <div class="portao-marca">Link expirado</div>
        <div class="portao-sub">Peça outro para continuar</div>
        <div class="aviso mal" style="margin-bottom:18px">
          Este link já foi usado ou passou da validade.
        </div>
        <NuxtLink to="/recuperar" class="btn" style="width:100%">Pedir outro link</NuxtLink>
      </template>

      <template v-else>
        <div class="portao-marca">Nova senha</div>
        <div class="portao-sub">Escolha uma que você lembre</div>

        <div class="campo">
          <label>Nova senha</label>
          <input v-model="senha" type="password" autocomplete="new-password"
                 placeholder="ao menos 8 caracteres" />
        </div>

        <div class="campo">
          <label>Repita a senha</label>
          <input v-model="senha2" type="password" autocomplete="new-password"
                 placeholder="••••••••" @keyup.enter="salvar" />
        </div>

        <div v-if="erro" class="aviso mal" style="margin-bottom:14px">{{ erro }}</div>

        <button class="btn" style="width:100%" :disabled="carregando" @click="salvar">
          {{ carregando ? 'Salvando…' : 'Salvar nova senha' }}
        </button>
      </template>
    </div>
  </div>
</template>
