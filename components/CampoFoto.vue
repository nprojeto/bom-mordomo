<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string | null
  nome?: string
  tamanho?: number
}>(), { tamanho: 96 })

const emit = defineEmits<{ 'update:modelValue': [string | null] }>()

const campo = ref<HTMLInputElement | null>(null)
const erro = ref('')
const trabalhando = ref(false)

const iniciais = computed(() => {
  const base = String(props.nome ?? '').trim()
  if (!base) return ''
  return base.split(/[\s._-]+/).filter(Boolean).slice(0, 2)
    .map((p) => p[0]).join('').toUpperCase()
})

// Reduz a imagem aqui no navegador. Uma foto de celular tem vários
// megabytes; guardar isso inteiro seria desperdício e deixaria o
// sistema lento para todo mundo.
async function escolher(ev: Event) {
  const arq = (ev.target as HTMLInputElement).files?.[0]
  if (!arq) return
  erro.value = ''

  if (!arq.type.startsWith('image/')) {
    erro.value = 'Escolha uma imagem.'
    return
  }

  trabalhando.value = true
  try {
    const url = URL.createObjectURL(arq)
    const img = new Image()
    await new Promise((ok, falhou) => {
      img.onload = ok; img.onerror = falhou; img.src = url
    })

    const lado = 256
    const tela = document.createElement('canvas')
    tela.width = lado; tela.height = lado
    const ctx = tela.getContext('2d')!

    // recorta o centro, para a foto não sair esticada
    const menor = Math.min(img.width, img.height)
    ctx.drawImage(img,
      (img.width - menor) / 2, (img.height - menor) / 2, menor, menor,
      0, 0, lado, lado)

    URL.revokeObjectURL(url)

    let saida = tela.toDataURL('image/jpeg', 0.82)
    if (saida.length > 400_000) saida = tela.toDataURL('image/jpeg', 0.6)

    emit('update:modelValue', saida)
  } catch {
    erro.value = 'Não consegui abrir essa imagem.'
  }
  trabalhando.value = false
  if (campo.value) campo.value.value = ''
}

function remover() {
  emit('update:modelValue', null)
  erro.value = ''
}
</script>

<template>
  <div class="foto-campo">
    <button class="foto-alvo" :style="{ width: tamanho + 'px', height: tamanho + 'px' }"
            :disabled="trabalhando" @click="campo?.click()">
      <img v-if="modelValue" :src="modelValue" alt="" />
      <span v-else-if="iniciais" class="foto-iniciais">{{ iniciais }}</span>
      <i v-else class="mi">photo_camera</i>
      <span class="foto-lapis"><i class="mi">photo_camera</i></span>
    </button>

    <div class="foto-lado">
      <button class="btn claro mini" :disabled="trabalhando" @click="campo?.click()">
        {{ trabalhando ? 'Abrindo…' : (modelValue ? 'Trocar foto' : 'Escolher foto') }}
      </button>
      <button v-if="modelValue" class="btn risco mini" @click="remover">Remover</button>
      <div v-if="erro" class="pequeno saida">{{ erro }}</div>
      <div v-else class="pequeno mudo">Fica quadrada, cortada no centro.</div>
    </div>

    <input ref="campo" type="file" accept="image/*" hidden @change="escolher" />
  </div>
</template>

<style scoped>
.foto-campo { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }

.foto-alvo {
  position: relative; border-radius: 50%; overflow: hidden;
  border: 2px dashed var(--linha); background: var(--papel);
  color: var(--tinta-45); cursor: pointer; padding: 0;
  display: grid; place-items: center; flex: 0 0 auto;
}
.foto-alvo:hover { border-color: var(--laranja); color: var(--laranja); }
.foto-alvo img { width: 100%; height: 100%; object-fit: cover; }
.foto-alvo .mi { font-size: 26px; vertical-align: 0; }

.foto-iniciais {
  font-family: var(--titulo); font-weight: 800; font-size: 1.5rem;
  color: var(--laranja);
}

.foto-lapis {
  position: absolute; right: 0; bottom: 0;
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--laranja); color: #fff;
  display: grid; place-items: center; border: 2px solid var(--carta);
}
.foto-lapis .mi { font-size: 14px; }

.foto-lado { display: grid; gap: 7px; justify-items: start; }
</style>
