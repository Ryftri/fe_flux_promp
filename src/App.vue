<script setup>
import { ref } from 'vue'
import workflowTemplate from './workflow_api.json'

// --- STATE ---
const promptInput = ref(
  'A professional architectural interior photography of a sophisticated mid-century modern room. A large vertical minimalist abstract painting in a thin light oak reflective with glass material inside the frame.',
)

// Negative prompt input tetap ada di UI tapi disabled
// karena workflow ini menggunakan ConditioningZeroOut untuk negative
const negativeInput = ref('')
const status = ref('Idle')

// State untuk DUA output gambar
const generatedImageNormal = ref(null) // Output Node 9
const generatedImageUpscaled = ref(null) // Output Node 62

// Ganti IP ini sesuai dengan IP komputer ComfyUI Anda
const COMFY_URL = 'http://192.168.1.20:8188'

const generateImage = async () => {
  status.value = 'Processing...'

  // Reset gambar sebelumnya
  generatedImageNormal.value = null
  generatedImageUpscaled.value = null

  // 1. Clone workflow dari file JSON
  const payload = JSON.parse(JSON.stringify(workflowTemplate))

  // ---------------------------------------------------------
  // MODIFIKASI PARAMETER (Berdasarkan ID Workflow Baru)
  // ---------------------------------------------------------

  // A. POSITIVE PROMPT (Node ID: 45)
  if (payload['45']) {
    payload['45']['inputs']['text'] = promptInput.value
  }

  // B. SEED (Node ID: 44)
  // Kita acak seed-nya agar gambar selalu baru setiap di-klik
  const randomSeed = Math.floor(Math.random() * 100000000000000)
  if (payload['44']) {
    payload['44']['inputs']['seed'] = randomSeed
  }

  try {
    // Kirim Request ke ComfyUI
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

          const outputs = historyData[promptId].outputs

          // 1. Ambil Output Gambar Normal (Node 9)
          if (outputs['9'] && outputs['9'].images.length > 0) {
            const imgInfo = outputs['9'].images[0]
            generatedImageNormal.value = `${COMFY_URL}/view?filename=${imgInfo.filename}&subfolder=${imgInfo.subfolder}&type=${imgInfo.type}`
          }

          // 2. Ambil Output Gambar Upscaled (Node 62)
          if (outputs['62'] && outputs['62'].images.length > 0) {
            const imgInfo = outputs['62'].images[0]
            generatedImageUpscaled.value = `${COMFY_URL}/view?filename=${imgInfo.filename}&subfolder=${imgInfo.subfolder}&type=${imgInfo.type}`
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
    <h1>ComfyUI Generator (Z-Image Turbo)</h1>

    <div class="input-group">
      <label class="label-pos">Positive Prompt (Ingin Gambar Apa?)</label>
      <textarea v-model="promptInput" rows="5"></textarea>
    </div>

    <div class="input-group">
      <label class="label-neg">Negative Prompt (Tidak Aktif)</label>
      <textarea
        v-model="negativeInput"
        rows="2"
        class="neg-input"
        disabled
        placeholder="Workflow ini menggunakan ZeroOut (Negative prompt text diabaikan)"
      ></textarea>
    </div>

    <button @click="generateImage" :disabled="status === 'Processing...'" class="generate-btn">
      {{ status === 'Processing...' ? 'Sedang Membuat...' : 'Generate Image' }}
    </button>

    <p class="status-text">
      Status: <strong>{{ status }}</strong>
    </p>

    <div class="results-grid">
      <div v-if="generatedImageNormal" class="result-card">
        <h3>Original (1x)</h3>
        <img :src="generatedImageNormal" class="result-image" />
      </div>

      <div v-if="generatedImageUpscaled" class="result-card">
        <h3>Upscaled (4x)</h3>
        <img :src="generatedImageUpscaled" class="result-image" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 900px; /* Diperlebar sedikit agar muat 2 gambar */
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
  color: #999;
}

textarea {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-family: inherit;
  box-sizing: border-box; /* Agar padding tidak melebar keluar */
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

/* Styles Baru untuk Grid Hasil */
.results-grid {
  display: grid;
  grid-template-columns: 1fr 1fr; /* 2 kolom sama besar */
  gap: 20px;
  margin-top: 30px;
}

@media (max-width: 600px) {
  .results-grid {
    grid-template-columns: 1fr; /* Jadi 1 kolom di HP */
  }
}

.result-card {
  text-align: center;
  background: #f9f9f9;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #eee;
}

.result-card h3 {
  margin-top: 0;
  font-size: 16px;
  color: #333;
}

.result-image {
  max-width: 100%;
  border-radius: 4px;
  display: block;
  margin: 0 auto;
}
</style>
