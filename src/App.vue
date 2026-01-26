<script setup>
import { ref } from 'vue'
import workflowTemplate from './workflow_api.json'

// --- STATE ---
const promptInput = ref(
  'A photograph of a woman holding up a wooden picture frame, obscuring her face, standing in a field of wildflowers at sunset...',
)

// Negative prompt sekarang AKTIF karena JSON baru menggunakan Node 70
const negativeInput = ref(
  'text, watermark, writing, letters, words, logo, signature, brand name, frame mockup, blurry, low quality, rough texture',
)

const status = ref('Idle')
const generatedImage = ref(null) // Hanya satu output sekarang

// Ganti IP ini sesuai dengan IP komputer ComfyUI Anda
const COMFY_URL = 'http://192.168.1.20:8188'

const generateImage = async () => {
  status.value = 'Processing...'
  generatedImage.value = null // Reset gambar

  // 1. Clone workflow dari file JSON
  const payload = JSON.parse(JSON.stringify(workflowTemplate))

  // ---------------------------------------------------------
  // MODIFIKASI PARAMETER (Sesuai JSON Baru)
  // ---------------------------------------------------------

  // A. POSITIVE PROMPT (Node ID: 45)
  if (payload['45']) {
    payload['45']['inputs']['text'] = promptInput.value
  }

  // B. NEGATIVE PROMPT (Node ID: 70) - BARU!
  // Di workflow baru, input negative ada di Node 70
  if (payload['70']) {
    payload['70']['inputs']['text'] = negativeInput.value
  }

  // C. SEED (Node ID: 44)
  // Acak seed agar gambar selalu baru
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

          // Ambil Output Gambar Utama (Node 9)
          if (outputs['9'] && outputs['9'].images.length > 0) {
            const imgInfo = outputs['9'].images[0]
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
    <h1>ComfyUI Generator (Flux/SD3)</h1>

    <div class="input-group">
      <label class="label-pos">Positive Prompt</label>
      <textarea v-model="promptInput" rows="5"></textarea>
    </div>

    <div class="input-group">
      <label class="label-neg">Negative Prompt</label>
      <textarea
        v-model="negativeInput"
        rows="3"
        class="neg-input"
        placeholder="Masukkan hal yang ingin dihindari..."
      ></textarea>
    </div>

    <button @click="generateImage" :disabled="status === 'Processing...'" class="generate-btn">
      {{ status === 'Processing...' ? 'Sedang Membuat...' : 'Generate Image' }}
    </button>

    <p class="status-text">
      Status: <strong>{{ status }}</strong>
    </p>

    <div v-if="generatedImage" class="result-container">
      <h3>Result (1024x1024)</h3>
      <img :src="generatedImage" class="result-image" />
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
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
  color: #c62828; /* Merah untuk negative */
}

textarea {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-family: inherit;
  box-sizing: border-box;
}

/* Style normal untuk negative input */
.neg-input {
  background-color: #fff;
  border-color: #ccc;
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
  margin-top: 10px;
}
.generate-btn:disabled {
  background: #ccc;
}

.status-text {
  margin-top: 15px;
  text-align: center;
}

/* Container hasil gambar single */
.result-container {
  margin-top: 30px;
  text-align: center;
  background: #f9f9f9;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #eee;
}

.result-image {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
