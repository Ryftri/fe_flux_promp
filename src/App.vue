<script setup>
import { ref } from 'vue'
import workflowTemplate from './workflow_api.json'

// --- STATE ---
const promptInput = ref('A beautiful landscape, mountains, river, vector art')
// Tambahkan state baru untuk Negative Prompt (Default: text, watermark)
const negativeInput = ref('text, watermark, low quality, blurry')
const status = ref('Idle')
const generatedImage = ref(null)

const COMFY_URL = 'http://192.168.1.20:8188'

const generateImage = async () => {
  status.value = 'Processing...'
  generatedImage.value = null

  // 1. Clone workflow
  const payload = JSON.parse(JSON.stringify(workflowTemplate))

  // ---------------------------------------------------------
  // MODIFIKASI PARAMETER
  // ---------------------------------------------------------

  // A. POSITIVE PROMPT (Node ID 6)
  if (payload['6']) {
    payload['6']['inputs']['text'] = promptInput.value
  }

  // B. NEGATIVE PROMPT (Node ID 7)
  // Kita tambahkan logika untuk mengubah Node ID 7 juga
  if (payload['7']) {
    payload['7']['inputs']['text'] = negativeInput.value
  }

  // C. RANDOM SEED (Node ID 13)
  if (payload['13']) {
    payload['13']['inputs']['noise_seed'] = Math.floor(Math.random() * 100000000000000)
  }

  try {
    // Kirim Request (Sama seperti sebelumnya)
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

          // Ambil Output Gambar (Node ID 27)
          const nodeOutput = historyData[promptId].outputs['27']
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
    <h1>ComfyUI Generator</h1>

    <div class="input-group">
      <label class="label-pos">Positive Prompt (Ingin Gambar Apa?)</label>
      <textarea v-model="promptInput" rows="3"></textarea>
    </div>

    <div class="input-group">
      <label class="label-neg">Negative Prompt (Hindari Apa?)</label>
      <textarea v-model="negativeInput" rows="2" class="neg-input"></textarea>
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
} /* Hijau untuk positif */
.label-neg {
  color: #c62828;
} /* Merah untuk negatif */

textarea {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-family: inherit;
}
.neg-input {
  background-color: #fff0f0;
  border-color: #ffcdd2;
} /* Sedikit merah muda backgroundnya */

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
