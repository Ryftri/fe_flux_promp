<script setup>
import { ref } from 'vue'
import workflowTemplate from './workflow_api.json'

// --- STATE ---
const promptInput = ref(
  'A professional interior mockup photography, a large vertical wooden frame leaning against a white wainscoting wall on a light oak wooden floor.',
)
// Negative prompt input tetap ada di UI jika ingin disimpan,
// tapi TIDAK AKAN dikirim ke ComfyUI karena workflow baru tidak mendukung input teks negative standar.
const negativeInput = ref('')
const status = ref('Idle')
const generatedImage = ref(null)

const COMFY_URL = 'http://192.168.1.20:8188'

const generateImage = async () => {
  status.value = 'Processing...'
  generatedImage.value = null

  // 1. Clone workflow dari file JSON yang diimport
  const payload = JSON.parse(JSON.stringify(workflowTemplate))

  // ---------------------------------------------------------
  // MODIFIKASI PARAMETER
  // ---------------------------------------------------------

  // A. POSITIVE PROMPT (Update ID Node ke 53:45)
  if (payload['53:45']) {
    payload['53:45']['inputs']['text'] = promptInput.value
  }

  // B. NEGATIVE PROMPT & C. SEED
  // Sesuai instruksi:
  // 1. Seed TIDAK di-random (menggunakan nilai asli dari JSON yaitu 277251746703202).
  // 2. Tidak ada node teks negative di workflow ini (menggunakan ConditioningZeroOut),
  //    jadi kita tidak mengubah apa pun selain Positive Prompt.

  try {
    // Kirim Request
    const response = await fetch(`${COMFY_URL}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: payload }),
    })

    if (!response.ok) throw new Error('Gagal mengirim prompt')

    const data = await response.json()
    const promptId = data.prompt_id
    console.log('Menunggu Job ID:', promptId)

    // Polling Status
    const checkStatus = setInterval(async () => {
      try {
        const res = await fetch(`${COMFY_URL}/history/${promptId}`)
        const historyData = await res.json()

        if (historyData[promptId]) {
          clearInterval(checkStatus)
          status.value = 'Selesai!'

          // Ambil Output Gambar (Update ID Node ke 9 sesuai workflow baru)
          const nodeOutput = historyData[promptId].outputs['9']
          if (nodeOutput && nodeOutput.images.length > 0) {
            const imgInfo = nodeOutput.images[0]
            generatedImage.value = `${COMFY_URL}/view?filename=${imgInfo.filename}&subfolder=${imgInfo.subfolder}&type=${imgInfo.type}`
          }
        }
      } catch (e) {
        clearInterval(checkStatus)
        status.value = 'Error polling'
      }
    }, 1000)
  } catch (error) {
    status.value = `Error: ${error.message}`
  }
}
</script>

<template>
  <div class="container">
    <h1>ComfyUI Generator (Flux Krea)</h1>

    <div class="input-group">
      <label class="label-pos">Positive Prompt (Ingin Gambar Apa?)</label>
      <textarea v-model="promptInput" rows="5"></textarea>
    </div>

    <div class="input-group">
      <label class="label-neg">Negative Prompt (Tidak Aktif di Workflow ini)</label>
      <textarea
        v-model="negativeInput"
        rows="2"
        class="neg-input"
        disabled
        placeholder="Workflow ini tidak menggunakan negative prompt teks"
      ></textarea>
    </div>

    <button @click="generateImage" :disabled="status === 'Processing...'" class="generate-btn">
      {{ status === 'Processing...' ? 'Sedang Membuat...' : 'Generate Image' }}
    </button>

    <p class="status-text">
      Status: <strong>{{ status }}</strong>
    </p>

    <div v-if="generatedImage" class="result-container">
      <img :src="generatedImage" class="result-image" />
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: sans-serif;
}
.input-group {
  margin-bottom: 15px;
}
label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  font-size: 14px;
}
.label-pos {
  color: #2e7d32;
}
.label-neg {
  color: #999; /* Abu-abu karena disabled */
}

textarea {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-family: inherit;
}
.neg-input {
  background-color: #f0f0f0;
  border-color: #ddd;
  cursor: not-allowed;
}

.generate-btn {
  padding: 12px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  width: 100%;
  cursor: pointer;
  font-weight: bold;
}
.generate-btn:disabled {
  background: #ccc;
}
.result-image {
  max-width: 100%;
  border-radius: 8px;
  margin-top: 20px;
}
</style>
